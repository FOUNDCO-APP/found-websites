"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK, TEXT_OPACITY, TYPE, albumLabelFor } from "@/lib/dashboard/typography"

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

export default function DashboardNav({
  companyName,
  newLeadCount = 0,
  industry = null,
}: {
  companyName?: string | null
  newLeadCount?: number
  industry?: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()

  const isDev  = pathname.startsWith("/dashboard")
  const segment = isDev ? pathname.slice("/dashboard".length) || "/" : pathname
  const prefix  = isDev ? "/dashboard" : ""

  const albumLabel = albumLabelFor(industry)

  // Pre-fetched so the sheet opens with zero delay
  const [albums, setAlbums] = useState<{ id: string; name: string }[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [showNewAlbum, setShowNewAlbum] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState("")
  const [creating, setCreating] = useState(false)
  const newAlbumInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${prefix}/api/albums`)
      .then(r => r.json())
      .then(d => setAlbums(d.albums ?? []))
      .catch(() => {})
  }, [prefix])

  function isActive(tabPath: string) {
    if (tabPath === "/") return segment === "/"
    return segment === tabPath || segment.startsWith(tabPath + "/")
  }

  function handleCamera(e: React.MouseEvent) {
    e.preventDefault()
    if (segment === "/photos" || segment.startsWith("/photos/")) {
      router.push(`${prefix}/photos?upload=1`)
      return
    }
    setShowPicker(true)
  }

  function closePicker() {
    setShowPicker(false)
    setShowNewAlbum(false)
    setNewAlbumName("")
  }

  function shoot(albumId?: string) {
    closePicker()
    const q = albumId ? `?upload=1&album=${albumId}` : "?upload=1"
    router.push(`${prefix}/photos${q}`)
  }

  async function handleCreate() {
    if (!newAlbumName.trim() || creating) return
    setCreating(true)
    try {
      const res = await fetch(`${prefix}/api/albums`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAlbumName.trim() }),
      })
      const data = await res.json()
      if (data.album) {
        setAlbums(prev => [data.album, ...prev])
        shoot(data.album.id)
      }
    } finally {
      setCreating(false)
    }
  }

  const leftTabs  = TABS.slice(0, 2)
  const rightTabs = TABS.slice(3, 5)

  return (
    <>
      {/* ── Mobile: bottom tab bar ── */}
      <nav className="found-mobile-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        backgroundColor: "#080A09",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        display: "flex", alignItems: "flex-end",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 50,
      }}>
        {leftTabs.map(tab => {
          const active = isActive(tab.path)
          const showBadge = tab.path === "/leads" && newLeadCount > 0 && !active
          return (
            <Link key={tab.path} href={`${prefix}${tab.path}`} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 4, textDecoration: "none", padding: "12px 0 14px",
            }}>
              <div style={{ position: "relative" }}>
                {ICONS[tab.path](active)}
                {showBadge && (
                  <div style={{
                    position: "absolute", top: -2, right: -2,
                    width: 8, height: 8, borderRadius: "50%",
                    backgroundColor: "#FF3B30", border: "1.5px solid #080A09",
                  }}/>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: active ? SIGNAL_GREEN : "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
                {tab.label}
              </span>
            </Link>
          )
        })}

        {/* Camera FAB */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 10 }}>
          <button onClick={handleCamera} style={{
            width: 52, height: 52, borderRadius: "50%",
            backgroundColor: SIGNAL_GREEN, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 20px ${SIGNAL_GREEN}55`, marginTop: -20,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
        </div>

        {rightTabs.map(tab => {
          const active = isActive(tab.path)
          return (
            <Link key={tab.path} href={`${prefix}${tab.path}`} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 4, textDecoration: "none", padding: "12px 0 14px",
            }}>
              {ICONS[tab.path](active)}
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: active ? SIGNAL_GREEN : "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* ── Desktop: left sidebar ── */}
      <aside className="found-sidebar" style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 220,
        backgroundColor: "#080A09",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        flexDirection: "column", zIndex: 50, display: "none",
      }}>
        <div style={{ padding: "24px 20px 20px" }}>
          <svg viewBox="0 0 420 72" style={{ height: 16, width: 88, color: "white", display: "block" }} aria-label="Found">
            <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
          </svg>
        </div>
        <div style={{ height: 1, backgroundColor: `${SIGNAL_GREEN}30` }} />
        {companyName && (
          <div style={{ padding: "12px 20px" }}>
            <span style={{ ...TYPE.caption, fontWeight: 600, letterSpacing: "0.02em", textTransform: "none", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
              {companyName}
            </span>
          </div>
        )}
        <div style={{ flex: 1, padding: "4px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {TABS.map(tab => {
            const active = isActive(tab.path)
            return (
              <Link key={tab.path} href={`${prefix}${tab.path}`} style={{
                textDecoration: "none", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px 10px 13px", borderRadius: 10,
                backgroundColor: active ? `${SIGNAL_GREEN}12` : "transparent",
                borderLeft: `3px solid ${active ? SIGNAL_GREEN : "transparent"}`,
              }}>
                <div style={{ position: "relative" }}>
                  {ICONS[tab.path](active)}
                  {tab.path === "/leads" && newLeadCount > 0 && !active && (
                    <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#FF3B30", border: "1.5px solid #080A09" }}/>
                  )}
                </div>
                <span style={{ ...TYPE.subhead, color: active ? SIGNAL_GREEN : `rgba(255,255,255,${TEXT_OPACITY.secondary})`, fontWeight: active ? 600 : 500 }}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
        <div style={{ padding: "16px 12px 28px" }}>
          <button onClick={handleCamera} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "11px 16px", borderRadius: 10,
            backgroundColor: `${SIGNAL_GREEN}18`, border: `1px solid ${SIGNAL_GREEN}33`, cursor: "pointer",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span style={{ ...TYPE.subhead, fontWeight: 600, color: SIGNAL_GREEN }}>Add Photo</span>
          </button>
        </div>
      </aside>

      {/* ── Camera picker ── */}
      {showPicker && (
        <>
          {/* Backdrop */}
          <div
            onClick={closePicker}
            style={{
              position: "fixed", inset: 0, zIndex: 60,
              backgroundColor: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
              animation: "pickerFade 0.15s ease",
            }}
          />

          {/* Sheet */}
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70,
            backgroundColor: "#0E1210",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "20px 20px 0 0",
            padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 24px)",
            animation: "sheetUp 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
          }}>
            {/* Handle */}
            <div style={{ width: 32, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", margin: "4px auto 16px" }}/>

            {/* Primary: open camera now */}
            <button
              onClick={() => shoot()}
              style={{
                width: "100%", padding: "15px 20px", borderRadius: 14,
                backgroundColor: SIGNAL_GREEN, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12,
                boxShadow: `0 0 24px ${SIGNAL_GREEN}30`,
                marginBottom: 10,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span style={{ ...TYPE.subhead, fontWeight: 700, color: FOUND_BLACK }}>Take a Photo</span>
            </button>

            {/* Albums list */}
            {albums.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 4px 10px" }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.06)" }}/>
                  <span style={{ fontSize: "0.625rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
                    or file under
                  </span>
                  <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.06)" }}/>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {albums.slice(0, 5).map(album => (
                    <button
                      key={album.id}
                      onClick={() => shoot(album.id)}
                      style={{
                        width: "100%", padding: "13px 16px", borderRadius: 12,
                        border: "none", backgroundColor: "rgba(255,255,255,0.05)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ ...TYPE.subhead, color: "white", fontWeight: 500 }}>{album.name}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,${TEXT_OPACITY.disabled})`} strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* New album */}
            <div style={{ marginTop: albums.length > 0 ? 6 : 0 }}>
              {!showNewAlbum ? (
                <button
                  onClick={() => {
                    setShowNewAlbum(true)
                    setTimeout(() => newAlbumInputRef.current?.focus(), 50)
                  }}
                  style={{
                    width: "100%", padding: "13px 16px", borderRadius: 12,
                    border: "1px dashed rgba(255,255,255,0.1)", backgroundColor: "transparent",
                    display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,${TEXT_OPACITY.tertiary})`} strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span style={{ ...TYPE.subhead, fontWeight: 500, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                    New {albumLabel.singular}
                  </span>
                </button>
              ) : (
                <div style={{ borderRadius: 12, padding: "12px 14px", backgroundColor: "rgba(255,255,255,0.05)", border: `1px solid ${SIGNAL_GREEN}25` }}>
                  <input
                    ref={newAlbumInputRef}
                    value={newAlbumName}
                    onChange={e => setNewAlbumName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setShowNewAlbum(false); setNewAlbumName("") } }}
                    placeholder={`${albumLabel.singular} name…`}
                    style={{
                      width: "100%", background: "none", border: "none", outline: "none",
                      color: "white", fontSize: "0.9375rem", fontFamily: "inherit",
                      marginBottom: 10, boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => { setShowNewAlbum(false); setNewAlbumName("") }}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!newAlbumName.trim() || creating}
                      style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", backgroundColor: newAlbumName.trim() ? SIGNAL_GREEN : "rgba(255,255,255,0.07)", color: newAlbumName.trim() ? FOUND_BLACK : `rgba(255,255,255,${TEXT_OPACITY.disabled})`, fontSize: "0.8125rem", fontWeight: 700, cursor: newAlbumName.trim() ? "pointer" : "default" }}
                    >
                      {creating ? "Creating…" : "Create & Shoot"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (min-width: 768px) {
          .found-mobile-nav { display: none !important; }
          .found-sidebar    { display: flex !important; }
        }
        @keyframes sheetUp   { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pickerFade { from { opacity: 0; }               to { opacity: 1; }               }
      `}</style>
    </>
  )
}
