"use client"

import { useEffect, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST

let initialized = false

// Runs synchronously in the render body (not a useEffect) so init is
// guaranteed to finish before PageviewTracker's effect ever checks
// `initialized` - React fires child effects before parent effects on
// mount, so gating this in a parent useEffect silently dropped the very
// first pageview of every visit (initialized was still false when
// PageviewTracker's effect ran). Guarded to run once; no-ops on the
// server since posthog touches window/localStorage.
function initPostHog() {
  if (initialized || !KEY || !HOST || typeof window === "undefined") return
  posthog.init(KEY, {
    api_host: HOST,
    defaults: "2026-05-30",
    capture_pageview: false, // handled manually below, App Router doesn't fire full loads on client nav
    person_profiles: "identified_only",
  })
  initialized = true
}

function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!initialized) return
    const url = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname
    posthog.capture("$pageview", { $current_url: window.location.origin + url })
  }, [pathname, searchParams])

  return null
}

// Only mounted on the root marketing site (foundco.app) - see the
// isRootSite gate in layout.tsx. Never loads on the dashboard, admin, or any
// tenant/client site, matching the same scope Vercel Analytics already uses.
export default function FoundPostHogProvider() {
  initPostHog()

  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  )
}
