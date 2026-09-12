# frozen_string_literal: true

# A ship is one submission of a project for review. The `frozen_*` columns hold
# a copy of what the reviewer actually saw, so later edits to the project cannot
# retroactively change what was approved.
class CreateShips < ActiveRecord::Migration[8.1]
  def change
    create_table :ships do |t|
      t.references :project, null: false, foreign_key: true, type: :bigint
      t.references :reviewer, foreign_key: { to_table: :users }, type: :bigint

      t.integer :status, default: 0, null: false
      t.text :justification
      t.text :feedback
      t.integer :approved_seconds

      t.string :frozen_name
      t.text :frozen_description
      t.string :frozen_repo_link
      t.string :frozen_demo_link
      t.string :frozen_screenshot_url
      t.text :frozen_hca_data

      t.datetime :submitted_at, null: false
      t.datetime :reviewed_at

      t.timestamps
    end

    add_index :ships, :status
    add_index :ships, :submitted_at
  end
end
