"use client"

import { useEffect, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import posthog from "posthog-js"

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST

let initialized = false

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
  useEffect(() => {
    if (initialized || !KEY || !HOST) return
    posthog.init(KEY, {
      api_host: HOST,
      defaults: "2026-05-30",
      capture_pageview: false, // handled manually below, App Router doesn't fire full loads on client nav
      person_profiles: "identified_only",
    })
    initialized = true
  }, [])

  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  )
}
