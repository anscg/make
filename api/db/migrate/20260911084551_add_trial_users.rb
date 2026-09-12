class AddTrialUsers < ActiveRecord::Migration[8.1]
  def change
    # A trial user has no HCA identity yet, so the column can no longer be
    # mandatory. `User#trial?` reads exactly this: hca_id present or not.
    change_column_null :users, :hca_id, true

    # Binds a trial account to the browser that created it. Nullable, because a
    # full user is identified by HCA instead; Postgres allows many NULLs under a
    # unique index, so each trial user still gets a distinct token.
    add_column :users, :device_token, :string
    add_index :users, :device_token, unique: true
  end
end
