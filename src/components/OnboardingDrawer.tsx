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
  // Lock body scroll and manage URL
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      if (window.location.pathname !== "/onboarding") {
        window.history.pushState({ drawer: true }, "", "/onboarding")
      }
    } else {
      document.body.style.overflow = ""
      if (window.location.pathname === "/onboarding") {
        window.history.pushState({}, "", "/")
      }
    }
    return () => {
      document.body.style.overflow = ""
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
      {/* Scrim — dims the homepage, creates depth during slide-up */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-0 z-50 will-change-transform transition-transform duration-500 rounded-t-3xl overflow-hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 -24px 60px rgba(0,0,0,0.5)",
        }}
        aria-modal="true"
        aria-hidden={!open}
      >
        {/* Handle pill */}
        <div
          className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10 h-1 w-10 rounded-full pointer-events-none"
          style={{ backgroundColor: "rgba(120,120,120,0.35)" }}
        />
        <OnboardingFlow onClose={onClose} />
      </div>
    </>
  )
}
