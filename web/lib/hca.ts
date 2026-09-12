// Detecting an existing Hack Club Auth session from the browser.
//
// STATUS: behind a flag, and off by default, because the endpoint cannot
// currently be called from here. `GET /api/external/whoami` sends no
// `Access-Control-Allow-Origin`, so a credentialed cross-origin fetch is
// blocked before we ever see the body, and the response also carries
// `X-Frame-Options: SAMEORIGIN`, which rules out the usual hidden-iframe
// workaround. Calling it from our server instead does not help: the visitor's
// HCA cookie is never sent to our origin, so it would always answer
// `signed_in: false`.
//
// The code below is therefore written to fail quietly and fall back to the
// email form. Once HCA serves CORS for this origin, set
// NEXT_PUBLIC_HCA_DETECT_SESSION=true and it starts working with no other
// change.
//
// Note the shape when it does: there is no avatar in this payload.
//
//     {"signed_in":false,"email":null,"first_name":null}
//
// So the signed-in button can greet them by first name, but a profile picture
// would need a different endpoint.

export type HcaWhoami = {
  signed_in: boolean
  email: string | null
  first_name: string | null
}

// Production HCA. Local dev signs in against the staging instance
// (https://hca.dinosaurbbq.org) — see api/config/initializers/hack_club_auth.rb,
// which flips on Rails.env — so point this there to match.
const HCA_URL = process.env.NEXT_PUBLIC_HCA_URL ?? "https://auth.hackclub.com"

export const SESSION_DETECTION_ENABLED =
  process.env.NEXT_PUBLIC_HCA_DETECT_SESSION === "true"

export async function fetchWhoami(signal?: AbortSignal): Promise<HcaWhoami | null> {
  if (!SESSION_DETECTION_ENABLED) return null

  try {
    const res = await fetch(`${HCA_URL}/api/external/whoami`, {
      credentials: "include",
      signal,
    })
    if (!res.ok) return null

    const data: HcaWhoami = await res.json()
    return data.signed_in ? data : null
  } catch {
    // A CORS rejection lands here as a TypeError, indistinguishable from the
    // endpoint being down. Either way there is nothing to show, and the email
    // form is a complete path on its own.
    return null
  }
}
