# frozen_string_literal: true

# One submission of a project for review.
#
# The `frozen_*` columns are the point of this model. A reviewer approves *a
# specific state* of a project; if the kid edits the repo link afterwards, the
# approval must still refer to what was reviewed. Everything a reviewer reads is
# copied here at submit time and never written again.
class Ship < ApplicationRecord
  include PublicIdentifiable
  set_public_id_prefix :shp

  FROZEN_FROM_PROJECT = {
    frozen_name: :name,
    frozen_description: :description,
    frozen_repo_link: :repo_link,
    frozen_demo_link: :demo_link,
    frozen_screenshot_url: :screenshot_url
  }.freeze

  # Who decided what, when, and what it was before. A grant dispute months from
  # now is answered from here, so the trail must outlive the ship itself.
  has_paper_trail on: %i[create update], ignore: %i[updated_at]

  belongs_to :project
  belongs_to :reviewer, class_name: "User", optional: true

  has_one :user, through: :project

  enum :status, { pending: 0, approved: 1, returned: 2, rejected: 3 }

  serialize :frozen_hca_data, coder: JSON
  encrypts :frozen_hca_data

  validates :status, presence: true
  validates :submitted_at, presence: true
  validates :approved_seconds, numericality: { greater_than: 0, allow_nil: true }
  validate :decision_is_accounted_for
  validate :reviewer_is_not_the_submitter

  scope :queue, -> { pending.order(submitted_at: :asc) }
  scope :decided, -> { where.not(status: :pending) }
  scope :for_user, ->(user) { joins(:project).where(projects: { user_id: user.id }) }

  before_validation { self.submitted_at ||= Time.current }

  # Snapshot the project and the submitter's HCA identity, then queue it.
  #
  # Under a lock on the project, because `shippable?` asks whether a ship is
  # already queued and the answer stops being true the moment it is read: two
  # submits arriving together both saw an empty queue and both created a ship,
  # leaving a reviewer two entries for the same work. Taking the row first makes
  # the second submit wait and then see the first one. The partial unique index
  # on pending ships is the backstop if anything ever creates one another way.
  def self.submit!(project, hca_data: nil)
    project.with_lock do
      raise ArgumentError, "project is not shippable" unless project.shippable?

      attributes = FROZEN_FROM_PROJECT.transform_values { |source| project.public_send(source) }
      create!(**attributes, project:, status: :pending, submitted_at: Time.current,
              frozen_hca_data: hca_data)
    end
  end

  def decide!(status:, reviewer:, feedback: nil, approved_seconds: nil)
    update!(status:, reviewer:, feedback:, approved_seconds:, reviewed_at: Time.current)
  end

  def decided? = !pending?

  private

  # An approval needs hours attached; anything short of approval needs a reason
  # the kid can act on. Both are what make the decision auditable later.
  def decision_is_accounted_for
    return if pending?

    errors.add(:reviewer, "must be recorded for a decided ship") if reviewer.blank?
    errors.add(:approved_seconds, "is required to approve a ship") if approved? && approved_seconds.blank?
    errors.add(:feedback, "is required when returning or rejecting") if (returned? || rejected?) && feedback.blank?
  end

  # Nobody reviews their own submission, whatever roles they hold. A reviewer is
  # also a kid with projects of their own, and what this decides is hours in
  # their own name — an approval that cannot be told apart from self-dealing is
  # worth nothing to the audit it exists for. Enforced on the model rather than
  # only in the policy so the console and any later job are bound by it too.
  def reviewer_is_not_the_submitter
    return if reviewer_id.blank? || project.blank?

    errors.add(:reviewer, "cannot review their own submission") if reviewer_id == project.user_id
  end
end
