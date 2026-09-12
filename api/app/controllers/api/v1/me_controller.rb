# frozen_string_literal: true

module Api
  module V1
    class MeController < Api::BaseController
      def show
        render json: {
          id: current_user.public_id,
          email: current_user.email,
          name: current_user.name,
          slack_id: current_user.slack_id,
          roles: current_user.roles,
          is_admin: current_user.admin?
        }
      end
    end
  end
end
