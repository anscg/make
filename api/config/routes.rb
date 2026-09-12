Rails.application.routes.draw do
  # OmniAuth request + callback phases. Reached by the browser through the
  # Next.js proxy on the public host.
  post "/auth/hack_club", as: :hack_club_auth
  get "/auth/hack_club/callback", to: "sessions#create"
  get "/auth/failure", to: "sessions#failure"

  # JSON API consumed by the Next.js proxy.
  namespace :api do
    namespace :v1 do
      get "/csrf", to: "csrf#show"
      get "/me", to: "me#show"

      # Joining with an email alone, no HCA. See TrialSignupsController.
      post "/trial_signups", to: "trial_signups#create"
      delete "/session", to: "sessions#destroy"

      resources :projects, only: %i[index show create update destroy]
      resources :ships, only: %i[index show create]
    end
  end

  # Staff and reviewer UI, served by Rails on its own hostname. The constraint
  # makes these paths 404 for everyone else rather than 403 — a non-staff user
  # learns nothing about what exists here. Pundit still authorizes inside.
  constraints Constraints::RoleConstraint.staff do
    namespace :staff do
      resources :ships, only: %i[index show update]
      resources :projects, only: %i[index show destroy]
    end
  end

  get "/login", to: "sessions#new", as: :login
  delete "/logout", to: "sessions#destroy", as: :logout

  # Ahoy mounts its own engine at /ahoy when `Ahoy.api` is on. The public site
  # reaches it through the Next proxy at web/app/ahoy/[...path]/route.ts.

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  root "home#index"
end
