"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

const DEDUPE_MS = 5 * 60 * 1000

export default function CustomerActivityTracker({ disabled }: { disabled: boolean }) {
  const pathname = usePathname()

  useEffect(() => {
    if (disabled || !pathname?.startsWith("/dashboard")) return

    const key = `found:customer-activity:${pathname}`
    const lastRecorded = Number(sessionStorage.getItem(key) ?? "0")
    if (Number.isFinite(lastRecorded) && Date.now() - lastRecorded < DEDUPE_MS) return

    sessionStorage.setItem(key, String(Date.now()))
    fetch("/dashboard/api/customer-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "dashboard_page_viewed", pathname }),
      keepalive: true,
    }).catch(() => {
      sessionStorage.removeItem(key)
    })
  }, [disabled, pathname])

  return null
}
