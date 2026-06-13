"use client"

import { useEffect, useState } from "react"
import { getPreviewCheckout } from "@/app/[slug]/previewActions"

const SIGNAL_GREEN = "#32D074"
const AMBER = "#F59E0B"
const CHARCOAL = "#1a1a1a"

function getBannerState(trialEndsAt: string | null): {
  bg: string
  message: string
  cta: string
} {
  if (!trialEndsAt) {
    return {
      bg: SIGNAL_GREEN,
      message: "Your site is ready to share — activate your free trial to go live.",
      cta: "Start my free trial →",
    }
  }

  const msPerDay = 1000 * 60 * 60 * 24
  const daysRemaining = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / msPerDay)

  if (daysRemaining <= 0) {
    return {
      bg: CHARCOAL,
      message: "Your site is on hold — add a card to reactivate it.",
      cta: "Reactivate →",
    }
  }

  if (daysRemaining <= 9) {
    return {
      bg: AMBER,
      message: `Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} — add a card to keep your site live.`,
      cta: "Add a card →",
    }
  }

  return {
    bg: SIGNAL_GREEN,
    message: "Your site is ready to share — activate your free trial to go live.",
    cta: "Start my free trial →",
  }
}

export default function PreviewBanner({
  slug,
  subscriptionStatus,
  trialEndsAt,
}: {
  slug: string
  subscriptionStatus: string | null
  trialEndsAt: string | null
}) {
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

  const { bg, message, cta } = getBannerState(trialEndsAt)
  const textColor = bg === CHARCOAL ? "rgba(255,255,255,0.9)" : "white"
  const btnColor = bg === CHARCOAL ? "#ffffff" : bg

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
      style={{ backgroundColor: bg }}>
      <p className="text-sm font-black leading-tight" style={{ color: textColor }}>
        {message}
      </p>
      <button
        onClick={handleActivate}
        disabled={loading}
        className="shrink-0 rounded-lg bg-white px-4 py-2 text-xs font-black transition hover:opacity-90 active:opacity-75"
        style={{ color: btnColor }}>
        {loading ? "Loading…" : cta}
      </button>
    </div>
  )
}
