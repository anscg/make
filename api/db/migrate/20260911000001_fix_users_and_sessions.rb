# frozen_string_literal: true

# Two defects from the initial schema:
#
#   * `User encrypts :hca_access_token` had no backing column, so Rails defined
#     a virtual attribute and silently dropped the OAuth token on save.
#   * `sessions.user_id` came out as `integer` while `users.id` is `bigint`.
class FixUsersAndSessions < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :hca_access_token, :text

    change_column :sessions, :user_id, :bigint
  end
end
