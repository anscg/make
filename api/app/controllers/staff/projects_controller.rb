# frozen_string_literal: true

module Staff
  class ProjectsController < BaseController
    before_action :require_admin!, only: %i[destroy]
    before_action :set_project, only: %i[show destroy]

    def index
      scope = policy_scope(Project).includes(:user, :ships)
      scope = scope.where("name ILIKE ?", "%#{params[:query]}%") if params[:query].present?

      @projects = scope.recent.limit(200)
    end

    def show
      authorize @project
    end

    def destroy
      authorize @project
      @project.discard!
      redirect_to staff_projects_path, notice: "#{@project.name} removed."
    end

    private

    def set_project = @project = Project.find_by_public_id!(params[:id])
  end
end
