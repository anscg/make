# frozen_string_literal: true

module Api
  module V1
    # Joining with an email alone, no HCA and no verification step.
    #
    # Nothing here proves the person typing owns the address, so the account is
    # bound to the browser instead (`device_token`) and an address already on
    # file is refused rather than handed over — see `email_taken` below.
    class TrialSignupsController < Api::BaseController
      allow_unauthenticated only: %i[create]

      def create
        email = params[:email].to_s.strip.downcase

        return render_invalid_email unless email.match?(URI::MailTo::EMAIL_REGEXP)

        # Claiming an address that is already in use is the one case worth
        # answering carefully: it is either the same kid coming back or somebody
        # typing a stranger's email, and with no verification we cannot tell.
        # Both are sent to HCA, which can.
        if User.where(email:).where.not(id: existing_trial_user&.id).exists?
          return render json: {
            error: "email_taken",
            message: "That email is already in use. Sign in with Hack Club to continue.",
            hca_sign_in_required: true
          }, status: :conflict
        end

        user = existing_trial_user
        if user
          user.update!(email:)
        else
          user = User.start_trial!(email:, device_token:)
        end

        sign_in(user)

        render json: { user: user_json(user), next_path: "/onboarding" }, status: :created
      end

      private

      # A second join from the same browser updates the account it already has,
      # rather than colliding on the unique device token.
      def existing_trial_user
        return @existing_trial_user if defined?(@existing_trial_user)

        # Guarded, because `find_by(device_token: nil)` on a first visit would
        # match any trial row that happens to have no token and hand over
        # somebody else's account.
        token = cookies.signed[DEVICE_COOKIE].presence
        @existing_trial_user = token && User.trial.find_by(device_token: token)
      end

      def render_invalid_email
        render json: { error: "invalid_email", message: "Enter a valid email address." },
               status: :unprocessable_content
      end

      def user_json(user)
        { id: user.public_id, email: user.email, name: user.name, is_trial: user.trial? }
      end
    end
  end
end
