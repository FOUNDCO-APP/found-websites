"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import dynamic from "next/dynamic"

const ActivateOverlay = dynamic(() => import("./ActivateOverlay"), { ssr: false })

const SIGNAL_GREEN = "#32D074"
const AMBER = "#F59E0B"
const ROSE = "#F43F5E"
const FOUND_BLACK = "#111111"

type BannerState = {
  accent: string
  label: string
  headline: string
  detail: string
  cta: string
}

function getBannerState(trialEndsAt: string | null): BannerState {
  if (!trialEndsAt) {
    return {
      accent: SIGNAL_GREEN,
      label: "Live preview",
      headline: "Your preview is ready.",
      detail: "Add payment to turn it on for customers.",
      cta: "Activate my site",
    }
  }

  const msPerDay = 1000 * 60 * 60 * 24
  const daysRemaining = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / msPerDay)

  if (daysRemaining <= 0) {
    return {
      accent: ROSE,
      label: "Site paused",
      headline: "Your site is offline.",
      detail: "Add a card to bring it back. Takes 30 seconds.",
      cta: "Reactivate",
    }
  }

  if (daysRemaining <= 9) {
    return {
      accent: AMBER,
      label: `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`,
      headline: "Your trial is ending.",
      detail: "Add a card to keep your site live and remove this banner.",
      cta: "Secure my site",
    }
  }

  return {
    accent: SIGNAL_GREEN,
    label: "Live preview",
    headline: "Your preview is ready.",
    detail: "Add payment to turn it on for customers.",
    cta: "Activate my site",
  }
}

export default function PreviewBanner({
  slug,
  companyName,
  isActivated,
  trialEndsAt,
}: {
  slug: string
  companyName?: string
  isActivated: boolean
  trialEndsAt: string | null
}) {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activating, setActivating] = useState(false)
  const [previewOnly, setPreviewOnly] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isPreview = new URLSearchParams(window.location.search).get("preview") === "true"
    setPreviewOnly(isPreview)
    if (isPreview) return
    if (!isActivated) {
      setVisible(true)
    }
  }, [isActivated])

  if (!mounted || previewOnly) return null

  const { accent, label, headline, detail, cta } = getBannerState(trialEndsAt)

  return createPortal(
    <>
      {/* Banner card */}
      {visible && !activating && (
        <div
          className="fixed bottom-5 left-1/2 z-[9999] w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-3xl shadow-2xl"
          style={{ backgroundColor: FOUND_BLACK, border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="h-px w-full" style={{ backgroundColor: accent }} />
          <div className="px-6 pb-6 pt-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }} />
              <span className="text-[10px] font-black uppercase tracking-[0.22em]"
                style={{ color: accent }}>
                {label}
              </span>
            </div>
            <p className="mb-1 text-[22px] font-light leading-tight tracking-tight text-white">
              {headline}
            </p>
            <p className="mb-5 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
              {detail}
            </p>
            <button
              onClick={() => { setVisible(false); setActivating(true) }}
              className="w-full rounded-xl py-3.5 text-xs font-black uppercase tracking-[0.18em] transition hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: accent, color: FOUND_BLACK }}>
              {cta}
            </button>
          </div>
        </div>
      )}

      {/* Full-screen activate overlay — no navigation, no page load */}
      {activating && (
        <ActivateOverlay
          slug={slug}
          companyName={companyName ?? slug}
          onClose={() => { setActivating(false); setVisible(true) }}
        />
      )}
    </>,
    document.body
  )
}
