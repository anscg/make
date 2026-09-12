# frozen_string_literal: true

# `User#hca_access_token` and `Ship#frozen_hca_data` are encrypted at rest, so
# the app cannot boot a request that touches them without keys.
#
# Config follows the rest of the app (dotenv + ENV) rather than credentials, so
# production and the Next side read from the same place. Generate a set with:
#
#   bin/rails db:encryption:init
Rails.application.configure do
  # SECRET_KEY_BASE_DUMMY is what the Dockerfile sets for `assets:precompile`:
  # Rails invents a throwaway secret_key_base so the app can boot without real
  # secrets. Derive throwaway encryption keys from it too, or the build fails
  # at the fetch below. Nothing is encrypted during precompile, and the real
  # keys are still required the moment the container runs.
  if Rails.env.local? || ENV["SECRET_KEY_BASE_DUMMY"].present?
    # Deterministic in development and test so a fresh clone works from
    # `bin/setup` alone and dumps stay readable across machines.
    derived = ->(label) { Digest::SHA256.hexdigest("#{Rails.application.secret_key_base}:#{label}")[0, 32] }

    config.active_record.encryption.primary_key = ENV.fetch("AR_ENCRYPTION_PRIMARY_KEY") { derived.("primary") }
    config.active_record.encryption.deterministic_key = ENV.fetch("AR_ENCRYPTION_DETERMINISTIC_KEY") { derived.("deterministic") }
    config.active_record.encryption.key_derivation_salt = ENV.fetch("AR_ENCRYPTION_KEY_DERIVATION_SALT") { derived.("salt") }
  else
    config.active_record.encryption.primary_key = ENV.fetch("AR_ENCRYPTION_PRIMARY_KEY")
    config.active_record.encryption.deterministic_key = ENV.fetch("AR_ENCRYPTION_DETERMINISTIC_KEY")
    config.active_record.encryption.key_derivation_salt = ENV.fetch("AR_ENCRYPTION_KEY_DERIVATION_SALT")
  end
end
