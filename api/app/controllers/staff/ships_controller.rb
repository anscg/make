# frozen_string_literal: true

module Staff
  class ShipsController < BaseController
    before_action :set_ship, only: %i[show update]

    STATUS_FILTERS = Ship.statuses.keys.freeze

    def index
      scope = policy_scope(Ship).includes(:reviewer, project: :user)
      scope = scope.where(status: params[:status]) if STATUS_FILTERS.include?(params[:status])

      @ships = scope.order(status: :asc, submitted_at: :asc).limit(200)
      @counts = policy_scope(Ship).group(:status).count
    end

    def show
      authorize @ship
      @versions = @ship.versions.order(created_at: :asc)
    end

    def update
      authorize @ship

      @ship.decide!(
        status: params[:status],
        reviewer: current_user,
        feedback: params[:feedback].presence,
        approved_seconds: approved_seconds
      )
      redirect_to staff_ships_path, notice: "#{@ship.frozen_name} marked #{@ship.status}."
    rescue ActiveRecord::RecordInvalid => e
      redirect_to staff_ship_path(@ship), alert: e.record.errors.full_messages.to_sentence
    rescue ArgumentError
      redirect_to staff_ship_path(@ship), alert: "Unknown review decision."
    end

    private

    def set_ship = @ship = Ship.find_by_public_id!(params[:id])

    # Reviewers work in hours; the column is seconds so partial hours survive.
    def approved_seconds
      hours = params[:approved_hours]
      return nil if hours.blank?

      (hours.to_f * 3600).round
    end
  end
end
