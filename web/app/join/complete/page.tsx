"use client"

import { useEffect } from "react"

// Where the HCA popup lands once Rails has signed the session in. Its only job
// is to tell the page that opened it and get out of the way; the session cookie
// is already set by the time this renders.
//
// If it was opened as a normal tab rather than a popup (a stale link, say),
// there is no opener to notify — send them on to onboarding instead of leaving
// them on a blank page.
export default function JoinComplete() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: "hca:signed-in" }, window.location.origin)
      window.close()
      return
    }

    window.location.replace("/onboarding")
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sm text-black/60 dark:text-white/60">Signing you in…</p>
    </main>
  )
}
