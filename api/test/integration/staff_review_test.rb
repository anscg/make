# frozen_string_literal: true

require "test_helper"

class StaffReviewTest < ActionDispatch::IntegrationTest
  setup do
    @kid = create_user
    @reviewer = create_user(role: :reviewer, name: "Rev Iewer")
    @admin = create_user(role: :admin)
    @project = create_project(@kid, name: "Ferrofluid display")
    @ship = Ship.submit!(@project)
  end

  test "staff routes do not exist for a non-staff user" do
    sign_in_as @kid

    get "/staff/ships"
    assert_response :not_found

    get "/staff/projects"
    assert_response :not_found
  end

  test "staff routes do not exist for a signed-out visitor" do
    get "/staff/ships"

    assert_response :not_found
  end

  test "a reviewer sees the queue" do
    sign_in_as @reviewer

    get staff_ships_path

    assert_response :success
    assert_select "td", text: "Ferrofluid display"
  end

  test "the queue can be filtered by status" do
    decided = Ship.submit!(create_project(@kid, name: "Already done"))
    decided.decide!(status: :approved, reviewer: @reviewer, approved_seconds: 3600)

    sign_in_as @reviewer
    get staff_ships_path(status: "pending")

    assert_response :success
    assert_select "td", text: "Ferrofluid display"
    assert_select "td", text: "Already done", count: 0
  end

  test "a reviewer approves with hours" do
    sign_in_as @reviewer

    patch staff_ship_path(@ship.public_id), params: { status: "approved", approved_hours: "1.5" }

    assert_redirected_to staff_ships_path
    @ship.reload
    assert @ship.approved?
    assert_equal 5400, @ship.approved_seconds
    assert_equal @reviewer, @ship.reviewer
  end

  test "an approval without hours is refused with a message" do
    sign_in_as @reviewer

    patch staff_ship_path(@ship.public_id), params: { status: "approved" }

    assert_redirected_to staff_ship_path(@ship.public_id)
    assert_match(/Approved seconds/, flash[:alert])
    assert @ship.reload.pending?
  end

  test "returning a ship carries feedback back to the kid" do
    sign_in_as @reviewer

    patch staff_ship_path(@ship.public_id), params: { status: "returned", feedback: "Add a README" }

    assert @ship.reload.returned?
    assert_equal "Add a README", @ship.feedback
  end

  test "a reviewer cannot overturn a settled decision, an admin can" do
    @ship.decide!(status: :approved, reviewer: @admin, approved_seconds: 3600)

    sign_in_as @reviewer
    patch staff_ship_path(@ship.public_id), params: { status: "rejected", feedback: "no" }
    assert @ship.reload.approved?

    sign_out!
    sign_in_as @admin
    patch staff_ship_path(@ship.public_id), params: { status: "rejected", feedback: "Rules changed" }
    assert @ship.reload.rejected?
  end

  test "a reviewer cannot approve their own ship through the staff UI" do
    own = Ship.submit!(create_project(@reviewer, name: "Reviewer's own"))

    sign_in_as @reviewer
    patch staff_ship_path(own.public_id), params: { status: "approved", approved_hours: "2" }

    assert own.reload.pending?
    assert_nil own.reviewer

    get staff_ship_path(own.public_id)
    assert_response :success
    assert_select "form[action=?]", staff_ship_path(own.public_id), count: 0
    assert_select "p.muted", text: /your own submission/
  end

  test "the review page shows the snapshot rather than the edited project" do
    @project.update_columns(name: "Renamed later", repo_link: "https://github.com/new/repo")

    sign_in_as @reviewer
    get staff_ship_path(@ship.public_id)

    assert_response :success
    assert_select "h1", text: "Ferrofluid display"
    assert_select "a[href=?]", "https://github.com/test/repo"
  end

  test "a reviewer can browse projects but only an admin can remove one" do
    sign_in_as @reviewer
    get staff_projects_path
    assert_response :success

    delete staff_project_path(@project.public_id)
    assert_redirected_to staff_ships_path
    assert_not @project.reload.discarded?

    sign_out!
    sign_in_as @admin
    delete staff_project_path(@project.public_id)
    assert @project.reload.discarded?
  end
end
