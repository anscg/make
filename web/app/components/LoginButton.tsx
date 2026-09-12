"use client"

import { useState } from "react"

// The OmniAuth request phase is POST-only and verifies a session-bound
// authenticity token, so fetch the token first and then submit a real form —
// the browser has to follow Rails' redirect out to HCA itself.
export function LoginButton() {
  const [pending, setPending] = useState(false)

  async function signIn() {
    setPending(true)
    try {
      const res = await fetch("/api/v1/csrf", { credentials: "include" })
      const { authenticity_token } = await res.json()

      const form = document.createElement("form")
      form.method = "POST"
      form.action = "/auth/hack_club"

      const token = document.createElement("input")
      token.type = "hidden"
      token.name = "authenticity_token"
      token.value = authenticity_token
      form.appendChild(token)

      document.body.appendChild(form)
      form.submit()
    } catch {
      setPending(false)
    }
  }

  return (
    <button
      onClick={signIn}
      disabled={pending}
      className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Redirecting…" : "Sign in with Hack Club"}
    </button>
  )
}
