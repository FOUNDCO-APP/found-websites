"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

type Tab = { path: string; label: string }

const TABS: Tab[] = [
  { path: "/leads", label: "Leads" },
  { path: "/inbox", label: "Inbox" },
  { path: "/site",  label: "Site" },
  { path: "/more",  label: "More" },
]

function LeadsIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.4)"
  const w = active ? 2.5 : 1.5
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}

function InboxIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.4)"
  const w = active ? 2.5 : 1.5
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}

function SiteIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.4)"
  const w = active ? 2.5 : 1.5
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
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
  "/inbox": (a) => <InboxIcon active={a} />,
  "/site":  (a) => <SiteIcon  active={a} />,
  "/more":  (a) => <MoreIcon  active={a} />,
}

export default function DashboardNav() {
  const pathname = usePathname()

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
