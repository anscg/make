# frozen_string_literal: true

require "test_helper"

class ProjectTest < ActiveSupport::TestCase
  setup { @kid = create_user }

  test "links must be http urls" do
    project = @kid.projects.build(name: "x", repo_link: "github.com/no/scheme")

    assert_not project.valid?
    assert_match(/must start with/, project.errors[:repo_link].first)
  end

  test "blank tags are dropped" do
    project = create_project(@kid, tags: [ "hardware", "", "  " ])

    assert_equal [ "hardware" ], project.tags.reject(&:blank?)
  end

  test "discarding keeps the row so decided ships still resolve" do
    project = create_project(@kid)
    ship = Ship.submit!(project)

    project.discard!

    assert project.discarded?
    assert_equal project, ship.reload.project
  end

  test "public ids carry a prefix that rejects other models" do
    project = create_project(@kid)

    assert_match(/\Aprj_/, project.public_id)
    assert_equal project, Project.find_by_public_id(project.public_id)
    assert_nil Project.find_by_public_id(@kid.public_id)
  end
end
