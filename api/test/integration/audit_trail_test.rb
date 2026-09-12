# frozen_string_literal: true

require "test_helper"

class AuditTrailTest < ActionDispatch::IntegrationTest
  setup do
    @kid = create_user
    @reviewer = create_user(role: :reviewer, name: "Rev Iewer")
    @project = create_project(@kid)
    @ship = Ship.submit!(@project)
  end

  test "a decision made in the staff UI is attributed to the reviewer" do
    sign_in_as @reviewer

    patch staff_ship_path(@ship), params: { status: "approved", approved_hours: "1" }

    version = @ship.versions.last
    assert_equal @reviewer.id.to_s, version.whodunnit
    assert_equal %w[pending approved], version.object_changes["status"]
  end

  test "the trail records where the change came from, not the proxy" do
    sign_in_as @reviewer

    patch staff_ship_path(@ship),
          params: { status: "returned", feedback: "Add a README" },
          headers: { "X-Forwarded-Client-Ip" => "203.0.113.45", "User-Agent" => "Chrome/131" }

    version = @ship.versions.last
    assert_equal "203.0.113.45", version.ip
    assert_equal "Chrome/131", version.user_agent
  end

  test "a session records the visitor's address rather than the proxy's" do
    user = create_user

    session = nil
    assert_difference -> { Session.count }, 1 do
      session = user.sessions.create!(ip_address: "198.51.100.7")
    end
    assert_equal "198.51.100.7", session.ip_address
  end

  test "the review page shows who decided and when" do
    sign_in_as @reviewer
    patch staff_ship_path(@ship), params: { status: "approved", approved_hours: "2" }

    get staff_ship_path(@ship)

    assert_response :success
    assert_select "section.history li", minimum: 2
    assert_select "section.history", text: /Rev Iewer/
  end

  test "an api change is attributed too" do
    sign_in_as @kid

    patch api_v1_project_path(create_project(@kid, name: "Editable")),
          params: { project: { name: "Renamed by owner" } }

    assert_response :success
    version = Project.find_by(name: "Renamed by owner").versions.last
    assert_equal @kid.id.to_s, version.whodunnit
  end
end
