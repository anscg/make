# frozen_string_literal: true

class AddUniquePendingShipPerProject < ActiveRecord::Migration[8.1]
  # One project, at most one ship waiting in the queue. `Ship.submit!` locks the
  # project and re-checks before creating, so this should never fire; it is here
  # because a check-then-create in application code is a race however carefully
  # it is written, and a duplicate queue entry means a reviewer can approve the
  # same work twice.
  #
  # Partial, on pending only: once a ship is approved, returned or rejected it
  # leaves the index, which is what lets a kid resubmit after a return.
  def change
    add_index :ships, :project_id,
              unique: true,
              where: "status = 0",
              name: "index_ships_on_project_id_pending"
  end
end
