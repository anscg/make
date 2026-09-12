# frozen_string_literal: true

require "test_helper"

class ShipsApiTest < ActionDispatch::IntegrationTest
  setup do
    @kid = create_user
    @other = create_user
    @reviewer = create_user(role: :reviewer)
    @project = create_project(@kid)
  end

  def json = JSON.parse(response.body)

  test "submitting a project for review" do
    sign_in_as @kid

    assert_difference -> { Ship.count }, 1 do
      post api_v1_ships_path, params: { project_id: @project.public_id, justification: "It works" }
    end

    assert_response :created
    assert_equal "pending", json.dig("ship", "status")
    assert_equal "It works", json.dig("ship", "justification")
    assert_equal @project.name, json.dig("ship", "name")
  end

  test "someone else cannot submit your project" do
    sign_in_as @other

    post api_v1_ships_path, params: { project_id: @project.public_id }

    assert_response :forbidden
    assert_equal 0, Ship.count
  end

  test "resubmitting while pending is refused with a reason" do
    Ship.submit!(@project)
    sign_in_as @kid

    post api_v1_ships_path, params: { project_id: @project.public_id }

    assert_response :unprocessable_entity
    assert_equal "not_shippable", json["error"]
  end

  test "a kid sees only their own ships" do
    mine = Ship.submit!(@project)
    Ship.submit!(create_project(@other))

    sign_in_as @kid
    get api_v1_ships_path

    assert_response :success
    assert_equal [ mine.public_id ], json["ships"].map { _1["id"] }
  end

  test "a ship shows the frozen snapshot, not the live project" do
    ship = Ship.submit!(@project)
    @project.update_columns(name: "Renamed after review")

    sign_in_as @kid
    get api_v1_ship_path(ship.public_id)

    assert_response :success
    assert_equal "Test Project", json.dig("ship", "name")
  end

  test "another kid cannot read your ship" do
    ship = Ship.submit!(@project)
    sign_in_as @other

    get api_v1_ship_path(ship.public_id)

    assert_response :forbidden
  end

  test "feedback reaches the kid once a reviewer decides" do
    ship = Ship.submit!(@project)
    ship.decide!(status: :returned, reviewer: @reviewer, feedback: "Add a README")

    sign_in_as @kid
    get api_v1_ship_path(ship.public_id)

    assert_equal "returned", json.dig("ship", "status")
    assert_equal "Add a README", json.dig("ship", "feedback")
  end
end
