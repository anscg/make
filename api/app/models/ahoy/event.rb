# frozen_string_literal: true

class Ahoy::Event < ApplicationRecord
  include Ahoy::QueryMethods

  self.table_name = "ahoy_events"

  belongs_to :visit
  belongs_to :user, optional: true

  scope :named, ->(name) { where(name:) }
  scope :since, ->(time) { where(time: time..) }
end
