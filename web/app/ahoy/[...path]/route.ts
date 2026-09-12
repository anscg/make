import { proxyToRails } from "@/lib/rails"

// Ahoy's tracking endpoints (/ahoy/visits, /ahoy/events). Public pages are
// rendered here and cached at the CDN, so Rails never sees a page view — the
// browser has to report them, and this is the only path to Rails.
export const dynamic = "force-dynamic"

export const POST = proxyToRails
