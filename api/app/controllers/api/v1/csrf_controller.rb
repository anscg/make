# frozen_string_literal: true

module Api
  module V1
    # The Next.js login form needs a session-bound authenticity token before it
    # can POST to the OmniAuth request phase.
    class CsrfController < Api::BaseController
      allow_unauthenticated only: %i[show]

      def show
        render json: { authenticity_token: form_authenticity_token }
      end
    end
  end
end
