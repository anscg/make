# frozen_string_literal: true

require "test_helper"

class ShipTest < ActiveSupport::TestCase
  setup do
    @kid = create_user
    @reviewer = create_user(role: :reviewer)
    @project = create_project(@kid, name: "Ferrofluid display", demo_link: "https://demo.example")
  end

  test "submitting freezes the project as the reviewer will see it" do
    ship = Ship.submit!(@project)

    assert ship.pending?
    assert_equal "Ferrofluid display", ship.frozen_name
    assert_equal "https://github.com/test/repo", ship.frozen_repo_link
    assert_equal "https://demo.example", ship.frozen_demo_link
    assert ship.submitted_at.present?
  end

  # The whole point of the frozen columns.
  test "editing the project after submission does not alter the snapshot" do
    ship = Ship.submit!(@project)

    @project.update_columns(name: "Something else", repo_link: "https://github.com/other/repo")

    assert_equal "Ferrofluid display", ship.reload.frozen_name
    assert_equal "https://github.com/test/repo", ship.frozen_repo_link
  end

  test "a project cannot be queued twice at once" do
    Ship.submit!(@project)

    assert_raises(ArgumentError) { Ship.submit!(@project) }
  end

  test "the database refuses a second pending ship even behind the model's back" do
    Ship.submit!(@project)

    assert_raises(ActiveRecord::RecordNotUnique) do
      Ship.create!(project: @project, status: :pending, submitted_at: Time.current)
    end
  end

  test "the pending index leaves decided ships alone, so returns can pile up" do
    first = Ship.submit!(@project)
    first.decide!(status: :returned, reviewer: @reviewer, feedback: "Add a README")
    second = Ship.submit!(@project.reload)
    second.decide!(status: :returned, reviewer: @reviewer, feedback: "Still needs one")

    assert_equal 2, @project.ships.returned.count
    assert Ship.submit!(@project.reload).pending?
  end

  test "a project can be resubmitted once its ship is decided" do
    ship = Ship.submit!(@project)
    ship.decide!(status: :returned, reviewer: @reviewer, feedback: "Add a README")

    assert @project.reload.shippable?
    assert_nothing_raised { Ship.submit!(@project) }
  end

  test "a project with no repo link is not shippable" do
    bare = create_project(@kid, repo_link: nil)

    assert_not bare.shippable?
    assert_raises(ArgumentError) { Ship.submit!(bare) }
  end

  test "approving requires hours" do
    ship = Ship.submit!(@project)

    error = assert_raises(ActiveRecord::RecordInvalid) do
      ship.decide!(status: :approved, reviewer: @reviewer)
    end
    assert_match(/Approved seconds/, error.message)
  end

  test "returning and rejecting require feedback the kid can act on" do
    %i[returned rejected].each do |status|
      ship = Ship.submit!(create_project(@kid))

      error = assert_raises(ActiveRecord::RecordInvalid) do
        ship.decide!(status:, reviewer: @reviewer)
      end
      assert_match(/Feedback/, error.message)
    end
  end

  test "a decision records who made it and when" do
    ship = Ship.submit!(@project)
    ship.decide!(status: :approved, reviewer: @reviewer, approved_seconds: 5400)

    assert ship.approved?
    assert_equal @reviewer, ship.reviewer
    assert ship.reviewed_at.present?
    assert ship.decided?
  end

  test "a reviewer cannot decide their own submission" do
    @reviewer.projects.create!(name: "Reviewer's own", repo_link: "https://github.com/r/own")
    own = Ship.submit!(@reviewer.projects.last)

    error = assert_raises(ActiveRecord::RecordInvalid) do
      own.decide!(status: :approved, reviewer: @reviewer, approved_seconds: 3600)
    end

    assert_match(/cannot review their own submission/, error.message)
    assert own.reload.pending?
  end

  test "an admin cannot decide their own submission either" do
    admin = create_user(role: :admin)
    own = Ship.submit!(create_project(admin))

    assert_raises(ActiveRecord::RecordInvalid) do
      own.decide!(status: :approved, reviewer: admin, approved_seconds: 3600)
    end
  end

  test "someone else on staff can still decide it" do
    other = create_user(role: :reviewer)
    own = Ship.submit!(create_project(@reviewer))

    own.decide!(status: :approved, reviewer: other, approved_seconds: 3600)

    assert own.reload.approved?
  end

  test "frozen hca data is stored encrypted" do
    ship = Ship.submit!(@project, hca_data: { "verification_status" => "verified" })

    assert_equal({ "verification_status" => "verified" }, ship.reload.frozen_hca_data)
    ciphertext = Ship.connection.select_value("SELECT frozen_hca_data FROM ships WHERE id = #{ship.id}")
    assert_no_match(/verified/, ciphertext)
  end
end
