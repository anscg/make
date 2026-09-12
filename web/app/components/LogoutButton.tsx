"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function signOut() {
    setPending(true)
    try {
      // DELETE is an unsafe method, so the proxy checks the Origin header the
      // browser attaches — nothing else is needed to make this safe.
      await fetch("/api/v1/session", { method: "DELETE", credentials: "include" })
      // The page is server-rendered from the session cookie, so re-render it
      // rather than trusting the client to know what signed out looks like.
      router.refresh()
      router.push("/")
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={signOut}
      disabled={pending}
      className="text-xs text-black/50 underline-offset-4 hover:underline disabled:opacity-50 dark:text-white/50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  )
}
