# frozen_string_literal: true

module Api
  module V1
    # Signing out from the public site. Rails' own `DELETE /logout` answers with
    # a redirect meant for the staff UI, and nothing proxies that path anyway —
    # the browser only ever reaches Rails through /api/v1.
    class SessionsController < Api::BaseController
      # Signing out while already signed out is the outcome the caller wanted,
      # so it is a no-op rather than a 401.
      allow_unauthenticated only: %i[destroy]

      def destroy
        sign_out
        head :no_content
      end
    end
  end
end
