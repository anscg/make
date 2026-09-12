# frozen_string_literal: true

# PaperTrail's audit trail. `whodunnit` holds a User id as a string; the index
# is what makes "everything this reviewer touched" a cheap question to ask.
class CreateVersions < ActiveRecord::Migration[8.1]
  def change
    create_table :versions do |t|
      t.string :item_type, null: false
      t.bigint :item_id, null: false
      t.string :event, null: false
      t.string :whodunnit
      t.jsonb :object
      t.jsonb :object_changes

      # Where the change came from. A grant approval is worth being able to
      # place, not just attribute.
      t.string :ip
      t.text :user_agent

      t.datetime :created_at, null: false
    end

    add_index :versions, %i[item_type item_id created_at]
    add_index :versions, :whodunnit
    add_index :versions, :created_at
  end
end
