# frozen_string_literal: true

# Reviewer and admin UI, served by Rails on STAFF_HOST. The routes are already
# behind a RoleConstraint; this repeats the check so a mounted or directly
# dispatched action cannot skip it.
module Staff
  class BaseController < ApplicationController
    before_action :require_staff!

    layout "application"

    private

    def require_staff!
      return if current_user&.staff?

      redirect_to root_path, alert: "Staff only."
    end

    def require_admin!
      return if current_user&.admin?

      redirect_to staff_ships_path, alert: "Admins only."
    end
  end
end
