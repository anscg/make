Rails.application.config.middleware.use OmniAuth::Builder do
  provider :hack_club,
    Rails.application.config.hack_club_auth.client_id,
    Rails.application.config.hack_club_auth.client_secret,
    scope: "openid email name slack_id verification_status",
    staging: !Rails.env.production?
end

OmniAuth.config.allowed_request_methods = [ :post ]

# omniauth-rails_csrf_protection installs a Rails-aware request validation
# phase, so the request phase verifies a real `authenticity_token` against the
# session. Do not set OmniAuth.config.request_validation_phase here; the gem's
# verifier is what makes tokens from `form_authenticity_token` valid.
