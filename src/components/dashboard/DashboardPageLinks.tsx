"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { TYPE, TEXT_OPACITY, ICON } from "@/lib/dashboard/typography"

function ChevronRight() {
  return (
    <svg width={ICON.action} height={ICON.action} viewBox="0 0 24 24" fill="none"
      stroke={`rgba(255,255,255,${TEXT_OPACITY.disabled})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

export default function DashboardPageLinks({ pages }: { pages: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const prefix = pathname.startsWith("/dashboard") ? "/dashboard" : ""
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {pages.map(page => (
        <Link key={page.path} href={`${prefix}${page.path}`} style={{ textDecoration: "none" }}>
          <div style={{ borderRadius: 14, padding: "15px 18px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ ...TYPE.subhead, color: "white" }}>{page.label}</span>
            <ChevronRight />
          </div>
        </Link>
      ))}
    </div>
  )
}
