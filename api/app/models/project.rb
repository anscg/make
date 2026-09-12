# frozen_string_literal: true

class Project < ApplicationRecord
  include PublicIdentifiable
  include Discardable
  set_public_id_prefix :prj

  URL_FORMAT = %r{\Ahttps?://\S+\z}i

  has_paper_trail on: %i[create update destroy], ignore: %i[updated_at]

  belongs_to :user
  has_many :ships, dependent: :destroy

  scope :listed, -> { where(is_unlisted: false) }
  scope :recent, -> { order(created_at: :desc) }

  validates :name, presence: true, length: { maximum: 120 }
  validates :repo_link, :demo_link, :screenshot_url,
            format: { with: URL_FORMAT, message: "must start with http:// or https://" },
            allow_blank: true

  before_validation { tags.reject!(&:blank?) if tags }

  # A project is only shippable once there is something for a reviewer to look
  # at, and never while an earlier submission is still in the queue.
  def shippable? = kept? && repo_link.present? && !ships.pending.exists?

  def latest_ship = ships.order(submitted_at: :desc).first
  def approved? = ships.approved.exists?
end
