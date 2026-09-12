// Proxies browser requests through to Rails. Rails is not publicly reachable;
// this is the only path to it, which is why the browser stays same-origin and
// no CORS or cross-site cookie is ever involved.

const RAILS_URL = process.env.RAILS_URL ?? "http://localhost:3000"
const PUBLIC_HOST = process.env.PUBLIC_HOST ?? "localhost:3001"
const ORIGIN_SECRET = process.env.ORIGIN_SECRET

// Stripped from the upstream response: fetch has already decoded the body, so
// forwarding the original encoding/length headers would describe it wrongly.
const STRIP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
])

// Requests that change state must come from a page on our own origin.
//
// Rails cannot make this call itself: it is behind this proxy on an internal
// hostname, so its own origin check has nothing true to compare against, and
// `Api::BaseController` skips forgery protection for exactly that reason. That
// makes the check this proxy's job, and it is the only CSRF defence the JSON
// API has — `SameSite=Lax` on the session cookie happens to block the same
// attacks today, but it is a cookie attribute, not a decision, and it would
// stop covering us the moment anything needs `SameSite=None`.
//
// Browsers always send `Origin` on an unsafe method, and a cross-site page
// cannot forge it: overriding it requires a custom header, which turns the
// request into a preflight that nothing here answers. A missing `Origin` on an
// unsafe method therefore did not come from a browser on our site, so it is
// refused too.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

// Compared by host, not by full origin, so one check covers http on localhost
// and https in production. The forwarded host is whatever the browser actually
// addressed — a Vercel preview domain, say — and PUBLIC_HOST is the canonical
// name; either is us.
function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin")
  if (!origin) return false

  const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  const allowed = new Set([hostOf(PUBLIC_HOST), forwardedHost?.toLowerCase()].filter(Boolean))

  try {
    return allowed.has(new URL(origin).host.toLowerCase())
  } catch {
    return false // including `Origin: null`, which never means us
  }
}

// PUBLIC_HOST is documented as a bare host, but tolerate a pasted-in scheme
// rather than silently refusing every write.
function hostOf(value: string): string {
  return value.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase()
}

// The leftmost X-Forwarded-For entry is the client as the edge saw it. Vercel
// sets both of these; locally neither is present and Rails falls back to the
// socket address, which is already the right answer there.
function clientIpFrom(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim() || null
  return req.headers.get("x-real-ip")
}

export async function proxyToRails(req: Request): Promise<Response> {
  if (!SAFE_METHODS.has(req.method) && !isSameOrigin(req)) {
    return Response.json({ error: "cross_origin_request" }, { status: 403 })
  }

  const url = new URL(req.url)
  const headers = new Headers(req.headers)

  // Rails builds redirect URLs from these, so Location comes back pointing at
  // the public host rather than leaking the internal one.
  headers.set("X-Forwarded-Host", PUBLIC_HOST)
  headers.set("X-Forwarded-Proto", url.protocol === "https:" ? "https" : "http")
  headers.delete("host")
  headers.delete("accept-encoding")

  if (ORIGIN_SECRET) headers.set("X-Origin-Secret", ORIGIN_SECRET)

  // Rails only ever sees this proxy, so it cannot work out who the visitor is
  // on its own. Forward the address we were given; Rails believes this header
  // only when X-Origin-Secret checks out. Set it last so a client cannot smuggle
  // its own value through.
  const clientIp = clientIpFrom(req)
  if (clientIp) headers.set("X-Forwarded-Client-Ip", clientIp)
  else headers.delete("X-Forwarded-Client-Ip")

  // Read the body out rather than streaming it upstream. Rails answers plenty of
  // writes without draining the request first — 401 from the authentication
  // filter, 403 from Pundit — and a half-duplex stream that is still being
  // written when that lands fails the whole fetch, turning a considered status
  // into an empty 500. Nothing here uploads files, so the bodies are small.
  const hasBody = req.method !== "GET" && req.method !== "HEAD"
  const body = hasBody ? await req.arrayBuffer() : undefined

  const upstream = await fetch(`${RAILS_URL}${url.pathname}${url.search}`, {
    method: req.method,
    headers,
    body,
    redirect: "manual", // hand 3xx back to the browser so it follows to HCA
  })

  const outHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase()) && key.toLowerCase() !== "set-cookie") {
      outHeaders.set(key, value)
    }
  })

  // Rails sets no Domain attribute, so each cookie becomes host-only on the
  // public host. Multiple Set-Cookie headers must be appended individually.
  for (const cookie of upstream.headers.getSetCookie()) {
    outHeaders.append("set-cookie", cookie)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  })
}
