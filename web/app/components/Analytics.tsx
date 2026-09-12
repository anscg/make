"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import type { Ahoy } from "ahoy.js"

// ahoy.js reaches for `window` as it loads, so importing it at module scope
// breaks prerendering. Load it on first use in the browser instead, and hand
// every caller the same promise so configure runs exactly once.
let loading: Promise<Ahoy> | null = null

function ahoy(): Promise<Ahoy> {
  loading ??= import("ahoy.js").then(({ default: instance }) => {
    // Public pages are rendered here and cached at the CDN, so Rails never sees
    // a page view. The browser reports them to /ahoy/*, which proxies to Ahoy
    // the same way everything else reaches Rails — same-origin, no CORS,
    // host-only cookie. Rails recovers the real visitor IP from a header the
    // proxy sets.
    instance.configure({
      visitsUrl: "/ahoy/visits",
      eventsUrl: "/ahoy/events",
      cookies: true,
      withCredentials: true,
    })
    return instance
  })
  return loading
}

export function Analytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastTracked = useRef<string | null>(null)

  // App Router navigates without a document load, so trackView has to run on
  // every path change. The ref keeps React's double-invoked development effects
  // from turning one view into two.
  useEffect(() => {
    const url = searchParams.size ? `${pathname}?${searchParams}` : pathname
    if (lastTracked.current === url) return

    lastTracked.current = url
    void ahoy().then((instance) => instance.trackView({ url, title: document.title }))
  }, [pathname, searchParams])

  return null
}

// Named events for the moments worth counting, kept in one place so event names
// don't get spelled out — and misspelled — at each call site.
function track(name: string, properties?: Record<string, unknown>) {
  void ahoy().then((instance) => instance.track(name, properties))
}

export const analytics = {
  signInStarted: () => track("sign_in_started"),
  projectCreated: (projectId: string) => track("project_created", { project_id: projectId }),
  projectShipped: (projectId: string) => track("project_shipped", { project_id: projectId }),
}
