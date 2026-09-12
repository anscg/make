# frozen_string_literal: true

# One shape per record, shared by the JSON API and the staff UI, so the public
# site and a reviewer never disagree about what a ship says.
module Serialization
  extend ActiveSupport::Concern

  private

  def project_json(project, detail: false)
    base = {
      id: project.public_id,
      name: project.name,
      tags: project.tags,
      is_unlisted: project.is_unlisted,
      owner: user_json(project.user),
      created_at: project.created_at
    }
    return base unless detail

    base.merge(
      description: project.description,
      repo_link: project.repo_link,
      demo_link: project.demo_link,
      screenshot_url: project.screenshot_url,
      shippable: project.shippable?,
      ships: project.ships.order(submitted_at: :desc).map { |ship| ship_json(ship) }
    )
  end

  def ship_json(ship, detail: false)
    base = {
      id: ship.public_id,
      status: ship.status,
      submitted_at: ship.submitted_at,
      reviewed_at: ship.reviewed_at,
      approved_seconds: ship.approved_seconds,
      feedback: ship.feedback
    }
    return base unless detail

    # The frozen copy, never the live project — this is what was reviewed.
    base.merge(
      justification: ship.justification,
      reviewer: ship.reviewer && user_json(ship.reviewer),
      project_id: ship.project.public_id,
      name: ship.frozen_name,
      description: ship.frozen_description,
      repo_link: ship.frozen_repo_link,
      demo_link: ship.frozen_demo_link,
      screenshot_url: ship.frozen_screenshot_url
    )
  end

  def user_json(user)
    { id: user.public_id, name: user.name, slack_id: user.slack_id }
  end
end
