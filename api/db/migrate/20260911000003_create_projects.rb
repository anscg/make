# frozen_string_literal: true

class CreateProjects < ActiveRecord::Migration[8.1]
  def change
    create_table :projects do |t|
      t.references :user, null: false, foreign_key: true, type: :bigint
      t.string :name, null: false
      t.text :description
      t.string :repo_link
      t.string :demo_link
      t.string :screenshot_url
      t.string :tags, array: true, default: [], null: false
      t.boolean :is_unlisted, default: false, null: false
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :projects, :tags, using: :gin
    add_index :projects, :is_unlisted
    add_index :projects, :discarded_at
  end
end
