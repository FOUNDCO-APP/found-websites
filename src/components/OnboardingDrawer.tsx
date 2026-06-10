"use client"

import { useCallback, useEffect } from "react"
import OnboardingFlow from "@/app/onboarding/OnboardingFlow"

export default function OnboardingDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  // Lock body scroll, manage URL, and sync theme-color with drawer state
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (open) {
      document.body.style.overflow = "hidden"
      if (window.location.pathname !== "/onboarding") {
        window.history.pushState({ drawer: true }, "", "/onboarding")
      }
      if (meta) meta.content = "#32D074"
    } else {
      document.body.style.overflow = ""
      if (window.location.pathname === "/onboarding") {
        window.history.pushState({}, "", "/")
      }
      if (meta) meta.content = "#080A09"
    }
    return () => {
      document.body.style.overflow = ""
      if (meta) meta.content = "#080A09"
    }
  }, [open])

  // Browser back button closes the drawer
  const handlePop = useCallback(() => {
    if (open) onClose()
  }, [open, onClose])

  useEffect(() => {
    window.addEventListener("popstate", handlePop)
    return () => window.removeEventListener("popstate", handlePop)
  }, [handlePop])

  return (
    <>
      {/* Scrim — dims the homepage behind the sheet */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "linear-gradient(to bottom, rgba(50,208,116,0.82) 0px, rgba(50,208,116,0.3) 48px, rgba(8,10,9,0.38) 88px)" }}
      />

      {/* Drawer — peek gap reveals scrim + rounded corners */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 will-change-transform transition-transform duration-500 rounded-t-[28px] overflow-hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          top: "max(10px, env(safe-area-inset-top))",
          transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 -16px 40px rgba(0,0,0,0.5), inset 0 3px 0 rgba(50,208,116,0.9)",
        }}
        aria-modal="true"
        aria-hidden={!open}
      >
        {/* Signal Green halo at top edge — frames the sheet, creates separation from page */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 z-10"
          style={{ background: "radial-gradient(ellipse 80% 80px at 50% 0%, rgba(50,208,116,0.45) 0%, transparent 100%)" }}
        />
        {/* Handle pill — visible on dark background */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 h-1.5 w-12 rounded-full pointer-events-none"
          style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
        />
        <OnboardingFlow onClose={onClose} drawerMode />
      </div>
    </>
  )
}
