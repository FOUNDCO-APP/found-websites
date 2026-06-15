"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

type Tab = { path: string; label: string }

const TABS: Tab[] = [
  { path: "/leads", label: "Leads" },
  { path: "/site",  label: "Site" },
  { path: "/plan",  label: "Plan" },
  { path: "/more",  label: "More" },
]

function LeadsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? SIGNAL_GREEN : "rgba(255,255,255,0.4)"}
      strokeWidth={active ? 2.5 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}

function SiteIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? SIGNAL_GREEN : "rgba(255,255,255,0.4)"}
      strokeWidth={active ? 2.5 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  )
}

function PlanIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? SIGNAL_GREEN : "rgba(255,255,255,0.4)"}
      strokeWidth={active ? 2.5 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )
}

function MoreIcon({ active }: { active: boolean }) {
  const c = active ? SIGNAL_GREEN : "rgba(255,255,255,0.4)"
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5"  r="1.5" fill={c}/>
      <circle cx="12" cy="12" r="1.5" fill={c}/>
      <circle cx="12" cy="19" r="1.5" fill={c}/>
    </svg>
  )
}

const ICONS: Record<string, (active: boolean) => React.ReactElement> = {
  "/leads": (a) => <LeadsIcon active={a} />,
  "/site":  (a) => <SiteIcon  active={a} />,
  "/plan":  (a) => <PlanIcon  active={a} />,
  "/more":  (a) => <MoreIcon  active={a} />,
}

export default function DashboardNav() {
  const pathname = usePathname()

  // Works in both local dev (/dashboard/leads) and production (/leads via rewrite)
  const isDev = pathname.startsWith("/dashboard")
  const segment = isDev ? pathname.slice("/dashboard".length) || "/" : pathname
  const prefix  = isDev ? "/dashboard" : ""

  function isActive(tabPath: string) {
    if (tabPath === "/leads") return segment === "/" || segment === "/leads"
    return segment === tabPath || segment.startsWith(tabPath + "/")
  }

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: FOUND_BLACK,
      borderTop: "1px solid rgba(255,255,255,0.07)",
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      zIndex: 50,
    }}>
      {TABS.map((tab) => {
        const active = isActive(tab.path)
        return (
          <Link
            key={tab.path}
            href={`${prefix}${tab.path}`}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              textDecoration: "none",
              padding: "12px 0 14px",
            }}>
            {ICONS[tab.path](active)}
            <span style={{
              fontSize: 9,
              fontWeight: active ? 900 : 500,
              letterSpacing: "0.1em",
              color: active ? SIGNAL_GREEN : "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
            }}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
