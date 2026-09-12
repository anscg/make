# frozen_string_literal: true

class SessionsController < ApplicationController
  allow_unauthenticated only: %i[new create failure]

  def new
    redirect_to root_path if signed_in?
  end

  def create
    auth = request.env["omniauth.auth"]
    # Upgrades the trial account this browser is already signed into rather than
    # starting a second one, so anything they made before signing in follows
    # them over.
    user = User.find_or_create_from_omniauth(auth, claiming: current_user)

    sign_in(user)

    # OmniAuth carries the `origin` param through both phases, which is how the
    # popup sign-in gets back to a page that can talk to its opener. Still run
    # through `safe_redirect_target` — it is a user-supplied value, so an
    # off-site target would be an open redirect.
    destination = request.env["omniauth.origin"].presence || session.delete(:return_to)

    redirect_to safe_redirect_target(destination, fallback: root_path),
                notice: "Signed in successfully!"
  end

  def destroy
    sign_out
    redirect_to login_path, notice: "Signed out successfully!"
  end

  def failure
    redirect_to login_path, alert: "Authentication failed: #{params[:message]}"
  end
end
