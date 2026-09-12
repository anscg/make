"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchWhoami, type HcaWhoami } from "@/lib/hca"

// Where Rails sends the popup once HCA comes back. Passed as OmniAuth's
// `origin` param, which it carries across both phases of the handshake.
const POPUP_RETURN_PATH = "/join/complete"
const POPUP_NAME = "hca_oauth"
const POPUP_WIDTH = 520
const POPUP_HEIGHT = 720

// Without explicit left/top the browser picks a corner, so centre it over the
// window that opened it — screenX/screenY rather than the screen's own origin,
// which is what keeps it on the right monitor in a multi-display setup. Sized
// down to fit when the display is shorter than the popup wants to be.
function centredPopupFeatures(): string {
  const height = Math.min(POPUP_HEIGHT, window.screen.availHeight - 80)
  const width = Math.min(POPUP_WIDTH, window.screen.availWidth - 80)
  const left = window.screenX + (window.outerWidth - width) / 2
  const top = window.screenY + (window.outerHeight - height) / 2

  return `popup=yes,width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)}`
}

// A popup starts on about:blank, which is stark white until Rails answers the
// form POST and bounces it to HCA. Painting a line into it costs nothing and
// means the window is never just an empty white rectangle.
function paintLoading(popup: Window) {
  try {
    popup.document.write(
      `<!doctype html><html><head><title>Signing in…</title><meta name="color-scheme" content="light dark"></head>` +
        `<body style="margin:0;display:grid;place-items:center;height:100vh;` +
        `font:14px system-ui,-apple-system,sans-serif;color:#666">Connecting to Hack Club…</body></html>`
    )
    popup.document.close()
  } catch {
    // Only reachable if the popup is already somewhere we cannot touch, in
    // which case it is not blank and there is nothing to fix.
  }
}

type Props = { detectedInitially?: HcaWhoami | null }

export function JoinForm({ detectedInitially = null }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hca, setHca] = useState<HcaWhoami | null>(detectedInitially)

  // Fetched up front so the click is not waiting on a round trip with an empty
  // popup already on screen. The token is bound to the session, not to a single
  // submission, so holding one is fine.
  const csrfToken = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch("/api/v1/csrf", { credentials: "include" })
      .then((res) => res.json())
      .then(({ authenticity_token }) => {
        if (!cancelled) csrfToken.current = authenticity_token
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  // Flagged off today — see lib/hca.ts. Resolves to null and leaves the email
  // form in place when the endpoint is unreachable.
  useEffect(() => {
    const controller = new AbortController()
    fetchWhoami(controller.signal).then(setHca).catch(() => {})
    return () => controller.abort()
  }, [])

  // The popup is opened before anything is awaited: a window asked for later in
  // the handler reads as unrequested and gets blocked. When that happens anyway
  // this degrades to a redirect, so a blocked popup costs a page load, not the
  // sign-in.
  const signInWithHca = useCallback(async () => {
    setError(null)
    // Null when the browser refused the window — most likely because this ran
    // after an await and the click's transient activation had lapsed. Not worth
    // bothering anyone about: the same handshake works as a full-page redirect,
    // so fall through and submit the form at the tab instead of at a popup.
    const popup = window.open("", POPUP_NAME, centredPopupFeatures())
    if (popup) paintLoading(popup)

    try {
      // The OmniAuth request phase is POST-only and checks a session-bound
      // token, so this posts a real form at the popup rather than navigating it.
      // Prefetched at mount in the ordinary case; only a cold cache waits here.
      const authenticity_token =
        csrfToken.current ??
        (await fetch("/api/v1/csrf", { credentials: "include" }).then((r) => r.json()))
          .authenticity_token
      csrfToken.current = authenticity_token

      const form = document.createElement("form")
      form.method = "POST"
      form.action = "/auth/hack_club"

      // In a popup, come back to a page that can talk to its opener. Redirecting
      // the whole tab, there is no opener to notify — land them where the popup
      // flow would have sent them anyway.
      if (popup) form.target = POPUP_NAME
      const origin = popup ? POPUP_RETURN_PATH : "/onboarding"

      for (const [name, value] of Object.entries({ authenticity_token, origin })) {
        const input = document.createElement("input")
        input.type = "hidden"
        input.name = name
        input.value = value
        form.appendChild(input)
      }

      document.body.appendChild(form)
      form.submit()
      form.remove()
    } catch {
      popup?.close()
      setError("Could not start sign-in. Try again.")
    }
  }, [])

  // The popup tells us when it is done. Checking the origin is what keeps any
  // other page from posting us a fake "signed in".
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== "hca:signed-in") return

      router.push("/onboarding")
      router.refresh()
    }

    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [router])

  async function join(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      const res = await fetch("/api/v1/trial_signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (res.ok) {
        router.push(data.next_path ?? "/onboarding")
        router.refresh()
        return
      }

      // An address already on file isn't an error worth showing — it just means
      // HCA is the one that can settle who this is. Go straight there rather
      // than making them read a message and press a second button.
      if (data.hca_sign_in_required) {
        await signInWithHca()
        return
      }

      setError(data.message ?? "Something went wrong. Try again.")
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setPending(false)
    }
  }

  if (hca) {
    return (
      <div className="space-y-3">
        <button
          onClick={signInWithHca}
          className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Join as {hca.first_name ?? hca.email}
        </button>
        <button
          onClick={() => setHca(null)}
          className="text-xs text-black/50 underline-offset-4 hover:underline dark:text-white/50"
        >
          Use a different email
        </button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <form onSubmit={join} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="min-w-0 flex-1 rounded-full border border-black/15 bg-transparent px-4 py-3 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Joining…" : "Join"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
