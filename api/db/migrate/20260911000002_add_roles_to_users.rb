# frozen_string_literal: true

# `is_admin` cannot express "reviewer", and the review queue needs that role.
class AddRolesToUsers < ActiveRecord::Migration[8.1]
  def up
    add_column :users, :roles, :string, array: true, default: [ "user" ]

    execute <<~SQL
      UPDATE users
      SET roles = CASE
        WHEN is_admin THEN ARRAY['user','admin']::varchar[]
        ELSE ARRAY['user']::varchar[]
      END
    SQL

    change_column_null :users, :roles, false
    add_index :users, :roles, using: :gin
    remove_column :users, :is_admin
  end

  def down
    add_column :users, :is_admin, :boolean, default: false, null: false

    execute <<~SQL
      UPDATE users SET is_admin = ('admin' = ANY(roles))
    SQL

    remove_index :users, :roles
    remove_column :users, :roles
  end
end
