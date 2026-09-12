# frozen_string_literal: true

# Rails only ever sees the Next proxy, so `request.remote_ip` would be the
# proxy's address for every visitor — wrong in `sessions.ip_address` and useless
# in analytics. The proxy forwards what it observed in `X-Forwarded-Client-Ip`.
#
# That header is only believable because `X-Origin-Secret` already proves the
# request came through our proxy; without that check any client could name its
# own IP. When no secret is configured (development) there is no public path to
# Rails to abuse, so the header is taken at face value.
#
# Runs ahead of ActionDispatch::RemoteIp, which then derives `remote_ip` from
# the values written here.
class ProxyClientIp
  HEADER = "HTTP_X_FORWARDED_CLIENT_IP"
  SECRET_HEADER = "HTTP_X_ORIGIN_SECRET"

  def initialize(app) = @app = app

  def call(env)
    client_ip = env[HEADER].to_s.split(",").first&.strip

    if client_ip.present? && from_proxy?(env)
      env["REMOTE_ADDR"] = client_ip
      env.delete("HTTP_X_FORWARDED_FOR")
      env.delete("HTTP_CLIENT_IP")
    end

    @app.call(env)
  end

  private

  def from_proxy?(env)
    expected = ENV["ORIGIN_SECRET"]
    return true if expected.blank?

    ActiveSupport::SecurityUtils.secure_compare(env[SECRET_HEADER].to_s, expected)
  end
end
