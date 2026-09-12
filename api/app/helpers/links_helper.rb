# frozen_string_literal: true

module LinksHelper
  SAFE_SCHEMES = %w[http https].freeze

  # Reviewers click repo and demo links submitted by kids. Validation already
  # requires an http(s) URL, but rows can predate a validation or arrive by
  # `update_columns`, so re-check the scheme at render time and never hand the
  # staff tab a `javascript:` href or a referrer.
  def external_link(url, placeholder: "—")
    return placeholder if url.blank? || !safe_external_url?(url)

    link_to url, url, target: "_blank", rel: "noopener noreferrer nofollow"
  end

  def safe_external_url?(url)
    SAFE_SCHEMES.include?(URI.parse(url.to_s).scheme&.downcase)
  rescue URI::InvalidURIError
    false
  end
end
