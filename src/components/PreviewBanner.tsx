"use client"

import { useEffect, useState } from "react"
import { getPreviewCheckout } from "@/app/[slug]/previewActions"

const SIGNAL_GREEN = "#32D074"

export default function PreviewBanner({ slug, subscriptionStatus }: { slug: string; subscriptionStatus: string | null }) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("preview") === "true") {
      const active = subscriptionStatus === "active" || subscriptionStatus === "trialing"
      if (!active) setVisible(true)
    }
  }, [subscriptionStatus])

  if (!visible) return null

  async function handleActivate() {
    setLoading(true)
    try {
      const result = await getPreviewCheckout(slug)
      if (result?.url) window.location.href = result.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-5 py-4 shadow-lg"
      style={{ backgroundColor: SIGNAL_GREEN }}>
      <p className="text-sm font-black text-white leading-tight">
        Your site is ready to share — activate your free trial to go live.
      </p>
      <button
        onClick={handleActivate}
        disabled={loading}
        className="shrink-0 rounded-lg bg-white px-4 py-2 text-xs font-black transition hover:opacity-90 active:opacity-75"
        style={{ color: SIGNAL_GREEN }}>
        {loading ? "Loading…" : "Start my free trial →"}
      </button>
    </div>
  )
}
