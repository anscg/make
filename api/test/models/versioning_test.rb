# frozen_string_literal: true

require "test_helper"

class VersioningTest < ActiveSupport::TestCase
  setup do
    @kid = create_user
    @reviewer = create_user(role: :reviewer)
    @project = create_project(@kid)
  end

  test "a review decision leaves a version recording what changed" do
    ship = Ship.submit!(@project)

    PaperTrail.request(whodunnit: @reviewer.id.to_s) do
      ship.decide!(status: :approved, reviewer: @reviewer, approved_seconds: 3600)
    end

    version = ship.versions.last
    assert_equal "update", version.event
    assert_equal @reviewer.id.to_s, version.whodunnit
    # Stored as enum labels, not the raw integers — the trail stays readable.
    assert_equal %w[pending approved], version.object_changes["status"]
    assert_includes version.object_changes.keys, "approved_seconds"
  end

  test "the trail reconstructs the decision that came before" do
    ship = Ship.submit!(@project)
    ship.decide!(status: :returned, reviewer: @reviewer, feedback: "Add a README")
    ship.decide!(status: :approved, reviewer: @reviewer, approved_seconds: 3600, feedback: nil)

    assert_equal "returned", ship.paper_trail.previous_version.status
    assert ship.approved?
  end

  test "project edits are versioned so drift around a review is visible" do
    @project.update!(name: "Renamed")

    assert_equal %w[create update], @project.versions.map(&:event)
    assert_equal [ "Test Project", "Renamed" ], @project.versions.last.object_changes["name"]
  end

  test "discarding a project is recorded" do
    @project.discard!

    assert_includes @project.versions.last.object_changes.keys, "discarded_at"
  end

  test "role grants are versioned" do
    @kid.add_role!(:reviewer)

    assert_equal [ %w[user], %w[user reviewer] ], @kid.versions.last.object_changes["roles"]
  end

  # A version row is readable by anyone with database access; the token is not.
  test "the hca access token never reaches a version row" do
    @kid.update!(hca_access_token: "tok_live_secret", name: "New Name")

    assert_no_match(/tok_live_secret/, @kid.versions.map { _1.attributes.to_s }.join)
    assert_not_includes @kid.versions.last.object_changes.keys, "hca_access_token"
  end
end
