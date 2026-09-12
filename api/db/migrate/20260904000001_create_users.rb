class CreateUsers < ActiveRecord::Migration[8.1]
  def change
    create_table :users do |t|
      t.string :hca_id, null: false
      t.string :email, null: false
      t.string :name
      t.string :slack_id
      t.boolean :is_admin, default: false, null: false

      t.timestamps
    end

    add_index :users, :hca_id, unique: true
    add_index :users, :email, unique: true
    add_index :users, :slack_id
  end
end
