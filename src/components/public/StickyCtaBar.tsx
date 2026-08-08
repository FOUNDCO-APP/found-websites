"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function StickyCtaBar({
  label,
  href,
  matchPath,
  color,
  delayUntilScroll = false,
}: {
  label: string
  href: string
  matchPath: string | null
  color: string
  // True when this bar would otherwise say the exact same thing as the
  // hero's own button (a business with only one real action, so there's
  // no genuinely different secondary option for the bar to offer instead).
  // Rather than show the same CTA twice on screen at once, it waits until
  // the visitor has scrolled past the hero before appearing.
  delayUntilScroll?: boolean
}) {
  const pathname = usePathname()
  const [pastHero, setPastHero] = useState(!delayUntilScroll)

  useEffect(() => {
    if (!delayUntilScroll) return
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.6)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [delayUntilScroll])

  // Hide when already on the destination page
  if (matchPath && (pathname === matchPath || pathname.endsWith(matchPath))) return null
  if (!pastHero) return null

  const isPhone = href.startsWith("tel:")

  return (
    <div
      className="md:hidden"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        padding: "8px 14px",
        paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
        backgroundColor: "rgba(0,0,0,0.68)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {isPhone ? (
        <a
          href={href}
          className="btn w-full text-white"
          style={{ backgroundColor: color, borderColor: color, display: "block", textAlign: "center", padding: "12px 20px", borderWidth: 0, borderRadius: "var(--button-radius, 6px)" }}
        >
          {label}
        </a>
      ) : (
        <Link
          href={href}
          className="btn w-full text-white"
          style={{ backgroundColor: color, borderColor: color, display: "block", textAlign: "center", padding: "12px 20px", borderWidth: 0, borderRadius: "var(--button-radius, 6px)" }}
        >
          {label}
        </Link>
      )}
    </div>
  )
}
