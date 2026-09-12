# frozen_string_literal: true

class User < ApplicationRecord
  include PublicIdentifiable
  set_public_id_prefix :usr

  ROLES = %w[user reviewer admin].freeze

  # Role grants are the change worth being able to reconstruct. The access token
  # must never land in a version row.
  has_paper_trail on: %i[create update], only: %i[roles email name slack_id]

  has_many :sessions, dependent: :destroy
  has_many :ahoy_visits, class_name: "Ahoy::Visit", dependent: :nullify
  has_many :ahoy_events, class_name: "Ahoy::Event", dependent: :nullify
  has_many :projects, dependent: :destroy
  has_many :ships, through: :projects
  has_many :reviewed_ships, class_name: "Ship", foreign_key: :reviewer_id,
                            dependent: :nullify, inverse_of: :reviewer

  scope :admins, -> { with_role(:admin) }
  scope :reviewers, -> { with_role(:reviewer) }
  scope :with_role, ->(role) { where("roles @> ARRAY[?]::varchar[]", role.to_s) }
  scope :trial, -> { where(hca_id: nil) }
  scope :full, -> { where.not(hca_id: nil) }

  # hca_id is what tells a full user from a trial one, so it cannot be required
  # — `trial?` is precisely its absence. Uniqueness still holds across everyone
  # who has one, which is what stops two accounts sharing an HCA identity.
  validates :hca_id, uniqueness: true, allow_nil: true
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validate :roles_are_known

  encrypts :hca_access_token

  # Signing up with an email alone. There is no verification step, so this
  # proves nothing about who is typing — `device_token` is what the account is
  # actually bound to, and the caller must refuse an email already in use rather
  # than let a second person claim someone else's address.
  def self.start_trial!(email:, device_token:)
    create!(email:, device_token:, hca_id: nil, roles: [ "user" ])
  end

  # `claiming` is the trial user whose session is making this request. Upgrading
  # that row rather than creating a new one is what carries their projects over
  # — and a trial row holding the same email would collide on the unique index
  # anyway, so this is also what keeps a returning kid from hitting a 500.
  def self.find_or_create_from_omniauth(auth, claiming: nil)
    hca_id = auth.uid
    raise "Missing HCA user ID from authentication" if hca_id.blank?

    user = find_by(hca_id:)
    user ||= claiming if claiming&.trial?
    user ||= trial.find_by(email: auth.info.email) if auth.info.email.present?
    user ||= new

    user.hca_id = hca_id
    user.email = auth.info.email if auth.info.email.present?
    user.name = auth.info.name if auth.info.name.present?
    user.slack_id = auth.extra&.dig(:raw_info, :slack_id).presence || user.slack_id
    user.hca_access_token = auth.credentials.token
    # The device binding is meaningless once HCA vouches for them, and holding
    # on to it would keep a full account pinned to one browser.
    user.device_token = nil
    user.save!
    user
  end

  def trial? = hca_id.blank?
  def full? = !trial?

  def has_role?(role) = roles.include?(role.to_s)
  def admin? = has_role?(:admin)
  def reviewer? = has_role?(:reviewer)
  def staff? = admin? || reviewer?

  def add_role!(role)
    return if has_role?(role)

    update!(roles: roles + [ role.to_s ])
  end

  def remove_role!(role)
    return unless has_role?(role)

    update!(roles: roles - [ role.to_s ])
  end

  def hca_profile(access_token = hca_access_token) = HCAService.new(access_token).me

  private

  def roles_are_known
    unknown = roles - ROLES
    errors.add(:roles, "contains unknown roles: #{unknown.join(', ')}") if unknown.any?
  end
end
