# frozen_string_literal: true

module Api
  module V1
    class ProjectsController < Api::BaseController
      include Serialization

      allow_unauthenticated only: %i[index show]
      before_action :set_project, only: %i[show update destroy]

      def index
        projects = policy_scope(Project).includes(:user, :ships).recent
        projects = projects.where(user: current_user) if params[:mine].present? && signed_in?

        render json: { projects: projects.map { |project| project_json(project) } }
      end

      def show
        authorize @project
        render json: { project: project_json(@project, detail: true) }
      end

      def create
        project = current_user.projects.build(project_params)
        authorize project

        if project.save
          render json: { project: project_json(project, detail: true) }, status: :created
        else
          render_invalid(project)
        end
      end

      def update
        authorize @project

        if @project.update(project_params)
          render json: { project: project_json(@project, detail: true) }
        else
          render_invalid(@project)
        end
      end

      def destroy
        authorize @project
        @project.discard!
        head :no_content
      end

      private

      def set_project = @project = Project.find_by_public_id!(params[:id])

      def project_params
        params.expect(project: [ :name, :description, :repo_link, :demo_link,
                                 :screenshot_url, :is_unlisted, tags: [] ])
      end

      def render_invalid(record)
        render json: { error: "invalid", details: record.errors.messages }, status: :unprocessable_entity
      end
    end
  end
end
