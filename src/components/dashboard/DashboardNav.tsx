"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK, TEXT_OPACITY, TYPE } from "@/lib/dashboard/typography"

type Tab = { path: string; label: string }

const TABS: Tab[] = [
  { path: "/",        label: "Home" },
  { path: "/leads",   label: "Leads" },
  { path: "/photos",  label: "Photos" },
  { path: "/contacts",label: "Contacts" },
  { path: "/more",    label: "More" },
]

function HomeIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.5)"
  const w = active ? 2.5 : 1.5
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function LeadsIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.5)"
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
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.5)"
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
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.5)"
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
  const c = active ? SIGNAL_GREEN : "rgba(255,255,255,0.5)"
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
    router.push(`${prefix}/photos`)
  }

  const leftTabs  = TABS.slice(0, 2)
  const rightTabs = TABS.slice(3, 5)

  return (
    <>
      {/* ── Mobile: bottom tab bar ── */}
      <nav className="found-mobile-nav" style={{
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
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: active ? SIGNAL_GREEN : "rgba(255,255,255,0.5)",
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
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.5)",
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
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: active ? SIGNAL_GREEN : "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
              }}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* ── Desktop: left sidebar ── */}
      <aside className="found-sidebar" style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 220,
        backgroundColor: "#080A09",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        flexDirection: "column",
        zIndex: 50,
        display: "none", // shown via media query
      }}>
        {/* Wordmark */}
        <div style={{ padding: "24px 20px 20px" }}>
          <svg viewBox="0 0 420 72" style={{ height: 16, width: 88, color: "white", display: "block" }} aria-label="Found">
            <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
          </svg>
        </div>

        {/* Signal Green accent line */}
        <div style={{ height: 1, backgroundColor: `${SIGNAL_GREEN}30`, margin: "0 0 16px" }} />

        {/* Nav items */}
        <div style={{ flex: 1, padding: "4px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {TABS.map((tab) => {
            const active = isActive(tab.path)
            return (
              <Link key={tab.path} href={`${prefix}${tab.path}`} style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px 10px 13px",
                borderRadius: 10,
                backgroundColor: active ? `${SIGNAL_GREEN}12` : "transparent",
                borderLeft: `3px solid ${active ? SIGNAL_GREEN : "transparent"}`,
              }}>
                {ICONS[tab.path](active)}
                <span style={{
                  ...TYPE.subhead,
                  color: active ? SIGNAL_GREEN : `rgba(255,255,255,${TEXT_OPACITY.secondary})`,
                  fontWeight: active ? 600 : 400,
                }}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Camera button at bottom — quick add shortcut */}
        <div style={{ padding: "16px 12px 28px" }}>
          <button
            onClick={handleCamera}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 16px",
              borderRadius: 10,
              backgroundColor: `${SIGNAL_GREEN}18`,
              border: `1px solid ${SIGNAL_GREEN}33`,
              cursor: "pointer",
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span style={{ ...TYPE.subhead, fontWeight: 600, color: SIGNAL_GREEN }}>
              Add Photo
            </span>
          </button>
        </div>
      </aside>

      <style>{`
        @media (min-width: 768px) {
          .found-mobile-nav { display: none !important; }
          .found-sidebar    { display: flex !important; }
        }
      `}</style>
    </>
  )
}
