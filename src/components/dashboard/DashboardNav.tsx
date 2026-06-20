"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK, TEXT_OPACITY, TYPE, albumLabelFor, avatarColorFor } from "@/lib/dashboard/typography"

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
  const router   = useRouter()

  const isDev   = pathname.startsWith("/dashboard")
  const segment = isDev ? pathname.slice("/dashboard".length) || "/" : pathname
  const prefix  = isDev ? "/dashboard" : ""

  const albumLabel = albumLabelFor(industry)

  const [albums, setAlbums]             = useState<{ id: string; name: string }[]>([])
  const [showPicker, setShowPicker]     = useState(false)
  const [showNewAlbum, setShowNewAlbum] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState("")
  const [creating, setCreating]         = useState(false)
  const newAlbumInputRef = useRef<HTMLInputElement>(null)

  // Pre-fetch so the sheet opens with zero delay
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
    router.push(`${prefix}/photos${albumId ? `?upload=1&album=${albumId}` : "?upload=1"}`)
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
      {/* ── Mobile bottom tab bar ── */}
      <nav className="found-mobile-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        backgroundColor: "#080A09",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        display: "flex", alignItems: "flex-end",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 50,
      }}>
        {leftTabs.map(tab => {
          const active    = isActive(tab.path)
          const showBadge = tab.path === "/leads" && newLeadCount > 0 && !active
          return (
            <Link key={tab.path} href={`${prefix}${tab.path}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none", padding: "12px 0 14px" }}>
              <div style={{ position: "relative" }}>
                {ICONS[tab.path](active)}
                {showBadge && <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#FF3B30", border: "1.5px solid #080A09" }}/>}
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: active ? SIGNAL_GREEN : "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{tab.label}</span>
            </Link>
          )
        })}

        {/* Camera FAB */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 10 }}>
          <button onClick={handleCamera} style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: SIGNAL_GREEN, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${SIGNAL_GREEN}55`, marginTop: -20 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
        </div>

        {rightTabs.map(tab => {
          const active = isActive(tab.path)
          return (
            <Link key={tab.path} href={`${prefix}${tab.path}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none", padding: "12px 0 14px" }}>
              {ICONS[tab.path](active)}
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: active ? SIGNAL_GREEN : "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Desktop sidebar ── */}
      <aside className="found-sidebar" style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 220, backgroundColor: "#080A09", borderRight: "1px solid rgba(255,255,255,0.07)", flexDirection: "column", zIndex: 50, display: "none" }}>
        <div style={{ padding: "24px 20px 20px" }}>
          <svg viewBox="0 0 420 72" style={{ height: 16, width: 88, color: "white", display: "block" }} aria-label="Found">
            <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
          </svg>
        </div>
        <div style={{ height: 1, backgroundColor: `${SIGNAL_GREEN}30` }} />
        {companyName && (
          <div style={{ padding: "12px 20px" }}>
            <span style={{ ...TYPE.caption, fontWeight: 600, letterSpacing: "0.02em", textTransform: "none", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{companyName}</span>
          </div>
        )}
        <div style={{ flex: 1, padding: "4px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {TABS.map(tab => {
            const active = isActive(tab.path)
            return (
              <Link key={tab.path} href={`${prefix}${tab.path}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px 10px 13px", borderRadius: 10, backgroundColor: active ? `${SIGNAL_GREEN}12` : "transparent", borderLeft: `3px solid ${active ? SIGNAL_GREEN : "transparent"}` }}>
                <div style={{ position: "relative" }}>
                  {ICONS[tab.path](active)}
                  {tab.path === "/leads" && newLeadCount > 0 && !active && <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#FF3B30", border: "1.5px solid #080A09" }}/>}
                </div>
                <span style={{ ...TYPE.subhead, color: active ? SIGNAL_GREEN : `rgba(255,255,255,${TEXT_OPACITY.secondary})`, fontWeight: active ? 600 : 500 }}>{tab.label}</span>
              </Link>
            )
          })}
        </div>
        <div style={{ padding: "16px 12px 28px" }}>
          <button onClick={handleCamera} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 10, backgroundColor: `${SIGNAL_GREEN}18`, border: `1px solid ${SIGNAL_GREEN}33`, cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span style={{ ...TYPE.subhead, fontWeight: 600, color: SIGNAL_GREEN }}>Add Photo</span>
          </button>
        </div>
      </aside>

      {/* ── Camera picker sheet ── */}
      {showPicker && (
        <>
          <div onClick={closePicker} style={{ position: "fixed", inset: 0, zIndex: 60, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", animation: "pickerFade 0.18s ease" }} />

          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70, backgroundColor: "#0D100E", borderRadius: "24px 24px 0 0", borderTop: "1px solid rgba(255,255,255,0.06)", padding: `16px 0 calc(env(safe-area-inset-bottom, 0px) + 28px)`, animation: "sheetUp 0.22s cubic-bezier(0.32, 0.72, 0, 1)" }}>

            {/* Handle */}
            <div style={{ width: 32, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", margin: "0 auto 20px" }} />

            {/* Camera hero */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 24 }}>
              <button
                onClick={() => shoot()}
                style={{
                  width: 84, height: 84, borderRadius: "50%",
                  backgroundColor: SIGNAL_GREEN, border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 0 12px ${SIGNAL_GREEN}14, 0 0 40px ${SIGNAL_GREEN}35`,
                  marginBottom: 12,
                  transition: "transform 0.1s ease",
                }}
              >
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
              <span style={{ ...TYPE.subhead, color: "white", fontWeight: 600 }}>Take a Photo</span>
              <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, marginTop: 3 }}>skip sorting — add to album later</span>
            </div>

            {/* Album tiles */}
            {(albums.length > 0 || true) && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px", marginBottom: 14 }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
                  <span style={{ fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>or file under</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
                </div>

                <div
                  className="picker-scroll"
                  style={{ display: "flex", gap: 10, overflowX: "auto", padding: "2px 20px 8px", scrollbarWidth: "none" }}
                >
                  {albums.map(album => {
                    const color = avatarColorFor(album.name)
                    return (
                      <button
                        key={album.id}
                        onClick={() => shoot(album.id)}
                        style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        <div style={{
                          width: 72, height: 72, borderRadius: 18,
                          backgroundColor: `${color}15`,
                          border: `1.5px solid ${color}28`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ fontSize: "1.625rem", fontWeight: 300, color, lineHeight: 1 }}>
                            {album.name[0].toUpperCase()}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: `rgba(255,255,255,0.65)`, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
                          {album.name}
                        </span>
                      </button>
                    )
                  })}

                  {/* New album tile */}
                  {!showNewAlbum && (
                    <button
                      onClick={() => { setShowNewAlbum(true); setTimeout(() => newAlbumInputRef.current?.focus(), 60) }}
                      style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <div style={{ width: 72, height: 72, borderRadius: 18, border: "1.5px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, textAlign: "center" }}>New</span>
                    </button>
                  )}
                </div>
              </>
            )}

            {/* New album input — expands below tiles */}
            {showNewAlbum && (
              <div style={{ padding: "10px 20px 0", animation: "pickerFade 0.15s ease" }}>
                <div style={{ borderRadius: 16, padding: "14px 16px", backgroundColor: "rgba(255,255,255,0.05)", border: `1px solid ${SIGNAL_GREEN}20` }}>
                  <input
                    ref={newAlbumInputRef}
                    value={newAlbumName}
                    onChange={e => setNewAlbumName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter")  handleCreate()
                      if (e.key === "Escape") { setShowNewAlbum(false); setNewAlbumName("") }
                    }}
                    placeholder={`${albumLabel.singular} name…`}
                    style={{ width: "100%", background: "none", border: "none", outline: "none", color: "white", fontSize: "0.9375rem", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => { setShowNewAlbum(false); setNewAlbumName("") }}
                      style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!newAlbumName.trim() || creating}
                      style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", backgroundColor: newAlbumName.trim() ? SIGNAL_GREEN : "rgba(255,255,255,0.07)", color: newAlbumName.trim() ? FOUND_BLACK : `rgba(255,255,255,${TEXT_OPACITY.disabled})`, fontSize: "0.8125rem", fontWeight: 700, cursor: newAlbumName.trim() ? "pointer" : "default" }}
                    >
                      {creating ? "Creating…" : "Create & Shoot"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @media (min-width: 768px) {
          .found-mobile-nav { display: none !important; }
          .found-sidebar    { display: flex !important; }
        }
        @keyframes sheetUp    { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pickerFade { from { opacity: 0; }                 to { opacity: 1; }               }
        .picker-scroll::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  )
}
