# frozen_string_literal: true

class Ahoy::Visit < ApplicationRecord
  self.table_name = "ahoy_visits"

  has_many :events, class_name: "Ahoy::Event", dependent: :destroy
  belongs_to :user, optional: true

  scope :since, ->(time) { where(started_at: time..) }
  scope :attributed, -> { where.not(utm_source: nil) }
end
