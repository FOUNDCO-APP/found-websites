"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

type Tab = { path: string; label: string }

const TABS: Tab[] = [
  { path: "/",        label: "Home" },
  { path: "/leads",   label: "Leads" },
  { path: "/photos",  label: "Photos" },
  { path: "/contacts",label: "Contacts" },
  { path: "/more",    label: "More" },
]

function HomeIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.4)"
  const w = active ? 2.5 : 1.5
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function LeadsIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.4)"
  const w = active ? 2.5 : 1.5
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}

function PhotosIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.4)"
  const w = active ? 2.5 : 1.5
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}

function ContactsIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.4)"
  const w = active ? 2.5 : 1.5
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/>
      <line x1="22" y1="11" x2="16" y2="11"/>
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
  "/":         (a) => <HomeIcon     active={a} />,
  "/leads":    (a) => <LeadsIcon    active={a} />,
  "/photos":   (a) => <PhotosIcon   active={a} />,
  "/contacts": (a) => <ContactsIcon active={a} />,
  "/more":     (a) => <MoreIcon     active={a} />,
}

export default function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()

  const isDev = pathname.startsWith("/dashboard")
  const segment = isDev ? pathname.slice("/dashboard".length) || "/" : pathname
  const prefix  = isDev ? "/dashboard" : ""

  function isActive(tabPath: string) {
    if (tabPath === "/") return segment === "/"
    return segment === tabPath || segment.startsWith(tabPath + "/")
  }

  function handleCamera(e: React.MouseEvent) {
    e.preventDefault()
    // Future: open camera modal/sheet. For now route to photos queue.
    router.push(`${prefix}/photos`)
  }

  // Split into left 2, center (camera), right 2
  const leftTabs  = TABS.slice(0, 2)
  const rightTabs = TABS.slice(3, 5)

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "#080A09",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.1)",
      display: "flex",
      alignItems: "flex-end",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      zIndex: 50,
    }}>
      {/* Left tabs */}
      {leftTabs.map((tab) => {
        const active = isActive(tab.path)
        return (
          <Link key={tab.path} href={`${prefix}${tab.path}`} style={{
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

      {/* Center camera FAB */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 10 }}>
        <button
          onClick={handleCamera}
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            backgroundColor: SIGNAL_GREEN,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 20px ${SIGNAL_GREEN}55`,
            marginTop: -20,
          }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={FOUND_BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>
        <span style={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.1em",
          color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase",
          marginTop: 4,
        }}>
          Camera
        </span>
      </div>

      {/* Right tabs */}
      {rightTabs.map((tab) => {
        const active = isActive(tab.path)
        return (
          <Link key={tab.path} href={`${prefix}${tab.path}`} style={{
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
