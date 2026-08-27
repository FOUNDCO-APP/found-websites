"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const
type UtmKey = (typeof UTM_KEYS)[number]

// A visitor who lands from Instagram and clicks through 5 pages is ONE
// Instagram visit, not 1 Instagram + 4 Direct (internal nav reports
// foundco.app as document.referrer on every page after the first). So the
// entry referrer + UTMs are captured once per tab session and reused.
function sessionValue(key: string, compute: () => string): string {
  try {
    const existing = sessionStorage.getItem(key)
    if (existing !== null) return existing
    const value = compute()
    sessionStorage.setItem(key, value)
    return value
  } catch {
    return compute()
  }
}

function getSessionId(): string {
  return sessionValue("found_session_id", () => crypto.randomUUID())
}

function getEntryReferrer(): string {
  return sessionValue("found_entry_referrer", () => document.referrer || "")
}

function getUtms(): Partial<Record<UtmKey, string>> {
  const params = new URLSearchParams(window.location.search)
  const out: Partial<Record<UtmKey, string>> = {}
  for (const key of UTM_KEYS) {
    const fromUrl = params.get(key)
    if (fromUrl) {
      const clean = fromUrl.slice(0, 120)
      try { sessionStorage.setItem(`found_${key}`, clean) } catch {}
      out[key] = clean
      continue
    }
    try {
      const stored = sessionStorage.getItem(`found_${key}`)
      if (stored) out[key] = stored
    } catch {}
  }
  return out
}

function getLandingPath(pathname: string): string {
  return sessionValue("found_landing_path", () => `${pathname}${window.location.search || ""}`.slice(0, 500))
}

export default function VisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          referrer: getEntryReferrer(),
          session_id: getSessionId(),
          landing_path: getLandingPath(pathname),
          ...getUtms(),
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      // tracking must never break a page
    }
  }, [pathname])

  return null
}
