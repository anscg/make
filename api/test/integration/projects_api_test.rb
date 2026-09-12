# frozen_string_literal: true

require "test_helper"

class ProjectsApiTest < ActionDispatch::IntegrationTest
  setup do
    @kid = create_user
    @other = create_user
  end

  def json = JSON.parse(response.body)

  test "creating a project" do
    sign_in_as @kid

    post api_v1_projects_path, params: {
      project: { name: "Ferrofluid display", repo_link: "https://github.com/x/y", tags: [ "hardware" ] }
    }

    assert_response :created
    assert_equal "Ferrofluid display", json.dig("project", "name")
    assert_match(/\Aprj_/, json.dig("project", "id"))
    assert_equal [ "hardware" ], json.dig("project", "tags")
  end

  test "creating a project requires signing in" do
    post api_v1_projects_path, params: { project: { name: "x" } }

    assert_response :unauthorized
    assert_equal "unauthenticated", json["error"]
  end

  test "invalid input comes back as field errors, not a 500" do
    sign_in_as @kid

    post api_v1_projects_path, params: { project: { name: "", repo_link: "nope" } }

    assert_response :unprocessable_entity
    assert_includes json.dig("details", "name"), "can't be blank"
    assert_includes json["details"].keys, "repo_link"
  end

  test "listing hides other people's unlisted projects" do
    mine = create_project(@kid, name: "Mine", is_unlisted: true)
    theirs = create_project(@other, name: "Theirs")

    sign_in_as @kid
    get api_v1_projects_path

    assert_response :success
    names = json["projects"].map { _1["name"] }
    assert_includes names, mine.name
    assert_includes names, theirs.name

    sign_out!
    sign_in_as @other
    get api_v1_projects_path
    assert_not_includes json["projects"].map { _1["name"] }, "Mine"
  end

  test "a project cannot be updated by someone else" do
    project = create_project(@kid)
    sign_in_as @other

    patch api_v1_project_path(project.public_id), params: { project: { name: "Hijacked" } }

    assert_response :forbidden
    assert_equal "Test Project", project.reload.name
  end

  test "a project is locked while a ship is pending review" do
    project = create_project(@kid)
    Ship.submit!(project)
    sign_in_as @kid

    patch api_v1_project_path(project.public_id), params: { project: { name: "Changed" } }

    assert_response :forbidden
    assert_equal "Test Project", project.reload.name
  end

  test "deleting discards rather than destroys" do
    project = create_project(@kid)
    sign_in_as @kid

    assert_no_difference -> { Project.count } do
      delete api_v1_project_path(project.public_id)
    end
    assert_response :no_content
    assert project.reload.discarded?
  end

  test "an unknown public id is a 404, not a 500" do
    sign_in_as @kid

    get api_v1_project_path("prj_nope")

    assert_response :not_found
  end
end
