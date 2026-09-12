# frozen_string_literal: true

class Ahoy::Store < Ahoy::DatabaseStore
end

# The public site is rendered by Next and cached at the CDN, so a page view
# never reaches Rails. Tracking has to come from the browser, through the proxy,
# to Ahoy's own endpoints — hence the JavaScript API.
Ahoy.api = true

# `Ahoy::BaseController` inherits ApplicationController and skips its callbacks,
# so `require_authentication!` does not apply but `current_user` still resolves
# from our session cookie. That is what Ahoy's default `user_method` calls, so
# visits and events attribute themselves with no extra wiring.

# `request.remote_ip` is already the real visitor rather than the proxy (see
# ProxyClientIp), which makes the stored value personal data with little
# analytic value. Keep only the network it came from.
Ahoy.mask_ips = true

# Off by default: needs the geocoder gem and an external lookup. Turning it on
# fills in country/region/city on Ahoy::Visit.
Ahoy.geocode = false

# Bot filtering is on by default (`Ahoy.track_bots = false`), which matters at
# this scale — crawlers would otherwise outnumber the kids.
