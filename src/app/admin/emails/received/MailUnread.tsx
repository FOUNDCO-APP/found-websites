"use client"

import { useEffect, useState } from "react"

export default function MailUnread() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    let stopped = false
    let request: AbortController | null = null
    async function update() {
      if (document.visibilityState === "hidden" || request) return
      request = new AbortController()
      const timer = window.setTimeout(() => request?.abort(), 10000)
      try {
        const response = await fetch("/api/admin/mail-unread", { credentials: "same-origin", cache: "no-store", redirect: "error", signal: request.signal })
        if (!response.ok) throw new Error("Unavailable")
        const result = await response.json()
        if (!stopped) setCount(!result.error && Number.isSafeInteger(result.count) && result.count >= 0 ? result.count : null)
      } catch { if (!stopped) setCount(null) }
      finally { window.clearTimeout(timer); request = null }
    }
    void update()
    const interval = window.setInterval(() => { void update() }, 60000)
    const visible = () => { void update() }
    document.addEventListener("visibilitychange", visible)
    window.addEventListener("found:mail-updated", visible)
    return () => { stopped = true; window.clearInterval(interval); request?.abort(); document.removeEventListener("visibilitychange", visible); window.removeEventListener("found:mail-updated", visible) }
  }, [])
  return count !== null && count > 0 ? <span className="hq-count" aria-label={`${count} unread received messages`}>{count > 99 ? "99+" : count}</span> : null
}
