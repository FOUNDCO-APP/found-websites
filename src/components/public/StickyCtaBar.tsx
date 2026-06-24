"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function StickyCtaBar({
  label,
  href,
  matchPath,
  color,
}: {
  label: string
  href: string
  matchPath: string | null
  color: string
}) {
  const pathname = usePathname()

  // Hide when already on the destination page
  if (matchPath && (pathname === matchPath || pathname.endsWith(matchPath))) return null

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
        padding: "10px 16px",
        paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
        backgroundColor: "rgba(0,0,0,0.80)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {isPhone ? (
        <a
          href={href}
          className="btn w-full text-white"
          style={{ backgroundColor: color, borderColor: color, display: "block", textAlign: "center" }}
        >
          {label}
        </a>
      ) : (
        <Link
          href={href}
          className="btn w-full text-white"
          style={{ backgroundColor: color, borderColor: color, display: "block", textAlign: "center" }}
        >
          {label}
        </Link>
      )}
    </div>
  )
}
