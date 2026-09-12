# frozen_string_literal: true

# Called only by the Next.js proxy, never by a browser directly.
module Api
  class BaseController < ActionController::Base
    include Authentication
    include Pundit::Authorization

    # Rails sees an internal hostname, so `request.base_url` is not the origin
    # the browser used and its own forgery check has nothing true to compare
    # against. The check is made one layer out instead: `proxyToRails` in
    # web/lib/rails.ts refuses any unsafe method whose `Origin` is not this
    # site, and is the only path a browser has to these actions. Moving or
    # removing that check leaves these endpoints open — `verify_proxy!` below
    # proves a request came through the proxy, not that a browser meant to send
    # it.
    skip_forgery_protection

    # Must run ahead of the authentication callback that `Authentication`
    # installs, so an off-origin request is refused before it learns whether it
    # is merely unauthenticated.
    prepend_before_action :verify_proxy!

    rescue_from Pundit::NotAuthorizedError do
      render json: { error: "forbidden" }, status: :forbidden
    end

    rescue_from ActiveRecord::RecordNotFound do
      render json: { error: "not_found" }, status: :not_found
    end

    private

    # Rails is not meant to be publicly reachable. When ORIGIN_SECRET is set,
    # refuse anything that did not come through the proxy.
    def verify_proxy!
      expected = ENV["ORIGIN_SECRET"]
      return if expected.blank?

      provided = request.headers["X-Origin-Secret"].to_s
      return if ActiveSupport::SecurityUtils.secure_compare(provided, expected)

      render json: { error: "unauthorized_origin" }, status: :forbidden
    end

    def deny_unauthenticated
      render json: { error: "unauthenticated" }, status: :unauthorized
    end
  end
end
