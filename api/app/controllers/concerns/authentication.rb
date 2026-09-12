# frozen_string_literal: true

# Identity lives in the sessions table; the cookie only carries an opaque token.
module Authentication
  extend ActiveSupport::Concern

  COOKIE = :session_token
  DEVICE_COOKIE = :device_token
  DEVICE_LIFETIME = 1.year

  included do
    before_action :require_authentication!
    before_action :set_paper_trail_whodunnit
    helper_method :current_user, :current_session, :signed_in? if respond_to?(:helper_method)
  end

  class_methods do
    def allow_unauthenticated(**options)
      skip_before_action :require_authentication!, **options
    end
  end

  private

  def current_session
    return @current_session if defined?(@current_session)

    session = Session.authenticate(cookies.signed[COOKIE])

    # A trial account was never verified — nothing proved the person typing that
    # email owned it — so it is only ever usable from the browser that created
    # it. Without this the session cookie alone would be the whole identity, and
    # a copied cookie would carry the account anywhere. Full users are vouched
    # for by HCA and are deliberately not pinned to a device.
    session = nil if session&.user&.trial? && !device_token_matches?(session.user)

    @current_session = session
  end

  # Set on first sight and kept for a year, so a kid who comes back to the same
  # browser still reaches their trial account.
  def device_token
    cookies.signed[DEVICE_COOKIE] ||= {
      value: SecureRandom.hex(32),
      expires: DEVICE_LIFETIME.from_now,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax
    }

    cookies.signed[DEVICE_COOKIE]
  end

  def device_token_matches?(user)
    return false if user.device_token.blank?

    provided = cookies.signed[DEVICE_COOKIE].to_s
    return false if provided.blank?

    ActiveSupport::SecurityUtils.secure_compare(provided, user.device_token)
  end

  def current_user = current_session&.user

  def signed_in? = current_user.present?

  # PaperTrail stores whodunnit as a string; keep it the numeric id so a version
  # still points at the right person after a name or email change.
  def user_for_paper_trail = current_user&.id

  # `request.remote_ip` is the real visitor, not the proxy — see ProxyClientIp.
  def info_for_paper_trail
    { ip: request.remote_ip, user_agent: request.user_agent }
  end

  def sign_in(user)
    session = user.sessions.create!(
      ip_address: request.remote_ip,
      user_agent: request.user_agent
    )

    cookies.signed[COOKIE] = {
      value: session.token,
      expires: session.expires_at,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax
    }

    @current_session = session
  end

  def sign_out
    current_session&.destroy
    cookies.delete(COOKIE)
    reset_session
    @current_session = nil
  end

  # Redirect targets must be local; a blindly echoed return_to is an open redirect.
  def safe_redirect_target(candidate, fallback:)
    return fallback if candidate.blank?
    return fallback unless candidate.start_with?("/") && !candidate.start_with?("//")

    candidate
  end

  def require_authentication!
    deny_unauthenticated unless signed_in?
  end

  def deny_unauthenticated
    redirect_to login_path, alert: "Please sign in to continue."
  end
end
