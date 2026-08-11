"use client"

import posthog from "posthog-js"

export type FoundFunnelEvent =
  | "onboarding_started"
  | "plan_selected"
  | "onboarding_completed"
  | "checkout_started"

type FunnelProperties = {
  plan_name?: string | null
  company_id?: string | null
  slug?: string | null
  industry?: string | null
  source?: string
  method?: string
  value?: number
  currency?: string
}

function safeSessionOnce(key: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const storageKey = `found_funnel:${key}`
    if (window.sessionStorage.getItem(storageKey)) return false
    window.sessionStorage.setItem(storageKey, "1")
    return true
  } catch {
    return true
  }
}

export function captureFoundFunnelEvent(event: FoundFunnelEvent, properties: FunnelProperties = {}, onceKey?: string) {
  if (typeof window === "undefined") return
  if (onceKey && !safeSessionOnce(onceKey)) return

  posthog.capture(event, {
    ...properties,
    content_group: "found_signup_funnel",
    page_location: window.location.href,
  })
}
