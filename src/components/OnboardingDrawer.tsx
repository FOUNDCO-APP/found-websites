"use client"

import { useCallback, useEffect, useRef } from "react"
import OnboardingFlow from "@/app/onboarding/OnboardingFlow"

export default function OnboardingDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const savedScrollY = useRef(0)

  // Lock body scroll, manage URL, and sync status bar color with drawer state
  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta') as HTMLMetaElement
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }

    if (open) {
      // iOS scroll lock — overflow:hidden alone doesn't stop momentum scrolling
      savedScrollY.current = window.scrollY
      document.body.style.position = "fixed"
      document.body.style.top = `-${savedScrollY.current}px`
      document.body.style.left = "0"
      document.body.style.right = "0"
      document.body.style.width = "100%"
      if (window.location.pathname !== "/onboarding") {
        window.history.pushState({ drawer: true }, "", "/onboarding")
      }
      meta.content = "#32D074"
      // FOUND_BLACK fills the safe-area gap at the bottom of the drawer
      document.documentElement.style.backgroundColor = "#080A09"
    } else {
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.left = ""
      document.body.style.right = ""
      document.body.style.width = ""
      window.scrollTo(0, savedScrollY.current)
      if (window.location.pathname === "/onboarding") {
        window.history.pushState({}, "", "/")
      }
      meta.content = "#080A09"
      document.documentElement.style.backgroundColor = "#080A09"
    }
    return () => {
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.left = ""
      document.body.style.right = ""
      document.body.style.width = ""
      meta!.content = "#080A09"
      document.documentElement.style.backgroundColor = "#080A09"
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
        style={{ background: "rgba(8,10,9,0.55)" }}
      />

      {/* Drawer — peek gap reveals scrim + rounded corners */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 will-change-transform transition-transform duration-500 rounded-t-[28px] overflow-hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          top: 0,
          transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 -16px 40px rgba(0,0,0,0.5), inset 0 3px 0 rgba(50,208,116,0.9)",
        }}
        aria-modal="true"
        aria-hidden={!open}
      >
        {/* Signal Green halo at top edge — frames the sheet, creates separation from page */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 z-10"
          style={{ background: "linear-gradient(to bottom, rgba(50,208,116,0.45) 0px, transparent 72px)" }}
        />
        {/* Handle pill — sits below the safe area / Dynamic Island */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20 h-1.5 w-12 rounded-full pointer-events-none"
          style={{ top: "calc(env(safe-area-inset-top) + 12px)", backgroundColor: "rgba(255,255,255,0.3)" }}
        />
        <OnboardingFlow onClose={onClose} drawerMode />
      </div>
    </>
  )
}
