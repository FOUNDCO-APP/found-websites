"use client"

import { useEffect, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { TYPE, GREEN, BLACK } from "@/lib/dashboard/typography"

const ActivateOverlay = dynamic(() => import("@/components/ActivateOverlay"), { ssr: false })

function preloadOverlay() {
  import("@/components/ActivateOverlay").catch(() => {})
}

export default function MoreActivateButton({
  slug,
  companyName,
  setupIntentSecret,
  targetPlan,
  targetAddonSlug,
  targetAddonLabel,
  targetAddonPrice,
  children,
  variant = "green",
  size = "regular",
}: {
  slug: string
  companyName: string
  setupIntentSecret?: string | null
  targetPlan: string
  targetAddonSlug?: string
  targetAddonLabel?: string
  targetAddonPrice?: number
  children: ReactNode
  variant?: "green" | "black"
  size?: "regular" | "compact"
}) {
  const [open, setOpen] = useState(false)
  const isBlack = variant === "black"
  const isCompact = size === "compact"

  useEffect(() => {
    preloadOverlay()
  }, [])

  return (
    <>
      <button
        type="button"
        onPointerEnter={preloadOverlay}
        onFocus={preloadOverlay}
        onClick={() => { preloadOverlay(); setOpen(true) }}
        style={{
          width: "100%",
          minHeight: isCompact ? 34 : 52,
          borderRadius: 999,
          padding: isCompact ? "0 15px" : "0 18px",
          ...(isCompact ? TYPE.caption : TYPE.subhead),
          fontWeight: 900,
          backgroundColor: isBlack ? BLACK : GREEN,
          color: isBlack ? "white" : BLACK,
          border: "none",
          cursor: "pointer",
          letterSpacing: "0.01em",
          boxShadow: isBlack ? "0 12px 34px rgba(8,10,9,0.22)" : (isCompact ? `0 0 18px ${GREEN}10` : `0 0 34px ${GREEN}26`),
        }}
      >
        {children}
      </button>

      {open && (
        <ActivateOverlay
          slug={slug}
          companyName={companyName}
          setupIntentSecret={setupIntentSecret ?? undefined}
          targetPlan={targetPlan}
          targetAddonSlug={targetAddonSlug}
          targetAddonLabel={targetAddonLabel}
          targetAddonPrice={targetAddonPrice}
          skipIntro
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
