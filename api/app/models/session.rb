# frozen_string_literal: true

# Database-backed sessions: the cookie carries an opaque token, all state lives
# here so it can be inspected and revoked from the console.
class Session < ApplicationRecord
  LIFETIME = 2.weeks

  belongs_to :user

  has_secure_token :token

  before_validation { self.expires_at ||= LIFETIME.from_now }

  scope :active, -> { where(expires_at: Time.current..) }
  scope :expired, -> { where(expires_at: ...Time.current) }

  def self.authenticate(token)
    return nil if token.blank?

    active.find_by(token: token)
  end

  def active? = expires_at.future?

  def touch_seen!(ip: nil, user_agent: nil)
    updates = { last_seen_at: Time.current }
    updates[:ip_address] = ip if ip.present?
    updates[:user_agent] = user_agent if user_agent.present?
    update_columns(**updates, updated_at: Time.current)
  end
end
