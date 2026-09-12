import { cookies } from "next/headers"

const RAILS_URL = process.env.RAILS_URL ?? "http://localhost:3000"
const ORIGIN_SECRET = process.env.ORIGIN_SECRET

export type CurrentUser = {
  id: string
  email: string
  name: string | null
  slack_id: string | null
  is_admin: boolean
}

// Server-side reads talk to Rails directly rather than through the proxy —
// the proxy exists for the browser, not for us.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies()

  const res = await fetch(`${RAILS_URL}/api/v1/me`, {
    headers: {
      cookie: cookieStore.toString(),
      ...(ORIGIN_SECRET ? { "X-Origin-Secret": ORIGIN_SECRET } : {}),
    },
    cache: "no-store",
  })

  if (!res.ok) return null
  return res.json()
}
