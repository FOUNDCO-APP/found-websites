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
    <div
      className={`fixed inset-0 z-50 will-change-transform transition-transform duration-500 ${
        open ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
      aria-modal="true"
      aria-hidden={!open}
    >
      <OnboardingFlow onClose={onClose} />
    </div>
  )
}
