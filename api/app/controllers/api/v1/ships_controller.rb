# frozen_string_literal: true

module Api
  module V1
    # Kids submit here and read their own results. Reviewers decide in the staff
    # UI, not through this controller.
    class ShipsController < Api::BaseController
      include Serialization

      def index
        ships = policy_scope(Ship).includes(:project, :reviewer).order(submitted_at: :desc)
        render json: { ships: ships.map { |ship| ship_json(ship, detail: true) } }
      end

      def show
        ship = Ship.find_by_public_id!(params[:id])
        authorize ship
        render json: { ship: ship_json(ship, detail: true) }
      end

      def create
        project = Project.find_by_public_id!(params.require(:project_id))
        authorize project, :ship?

        ship = Ship.submit!(project, hca_data: frozen_hca_data_for(project.user))
        ship.update!(justification: params[:justification]) if params[:justification].present?

        render json: { ship: ship_json(ship, detail: true) }, status: :created
      rescue ArgumentError, ActiveRecord::RecordInvalid => e
        render json: { error: "not_shippable", message: e.message }, status: :unprocessable_entity
      end

      private

      # Grant eligibility is judged against the identity as it stood at submit
      # time. A token that has since expired must not block a pending review, so
      # a failed fetch is recorded rather than raised.
      def frozen_hca_data_for(user)
        return nil if user.hca_access_token.blank?

        user.hca_profile
      rescue StandardError => e
        Rails.logger.warn({ event: "hca_snapshot_failed", user_id: user.id, error: e.message }.to_json)
        { "error" => "hca_unavailable", "captured_at" => Time.current.iso8601 }
      end
    end
  end
end
