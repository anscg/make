# frozen_string_literal: true

# Soft delete. Records a kid removes stay in the table so a ship that was
# already reviewed still resolves to its project.
module Discardable
  extend ActiveSupport::Concern

  included do
    scope :kept, -> { where(discarded_at: nil) }
    scope :discarded, -> { where.not(discarded_at: nil) }
  end

  def discard! = update!(discarded_at: Time.current)
  def undiscard! = update!(discarded_at: nil)
  def discarded? = discarded_at.present?
  def kept? = !discarded?
end
