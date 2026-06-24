"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK, TEXT_OPACITY, TYPE, albumLabelFor, avatarColorFor } from "@/lib/dashboard/typography"

type Tab = { path: string; label: string; id: string }
type Album = { id: string; name: string; cover_url: string | null }

const BASE_TABS: Tab[] = [
  { id: "home", path: "/", label: "Home" },
  { id: "inbox", path: "/leads", label: "Inbox" },
  { id: "photos", path: "/photos", label: "Photos" },
  { id: "contacts", path: "/contacts", label: "Contacts" },
  { id: "more", path: "/more", label: "More" },
]

// All possible tabs for an industry — used for byId mapping when loading from localStorage
function allTabsFor(industry: string | null | undefined, activeAddons: string[]): Tab[] {
  if (industry === "food") {
    const hasCalendar = activeAddons.includes("reservation_calendar")
    return [
      { id: "home", path: "/", label: "Home" },
      ...(activeAddons.includes("online_ordering") ? [{ id: "orders", path: "/leads?view=orders", label: "Orders" }] : []),
      hasCalendar
        ? { id: "reservations", path: "/leads?view=reservations", label: "Reserve" }
        : { id: "inbox", path: "/leads", label: "Reservations" },
      { id: "photos", path: "/photos", label: "Photos" },
      { id: "contacts", path: "/contacts", label: "Contacts" },
      { id: "more", path: "/more", label: "More" },
    ]
  }
  return BASE_TABS
}

// Default 5-tab layout — Home locked first, More locked last
function defaultTabsFor(industry: string | null | undefined, activeAddons: string[]) {
  if (industry !== "food") return BASE_TABS
  const hasOrders = activeAddons.includes("online_ordering")
  const hasCalendar = activeAddons.includes("reservation_calendar")

  const reservationsTab = hasCalendar
    ? { id: "reservations", path: "/leads?view=reservations", label: "Reserve" }
    : { id: "inbox", path: "/leads", label: "Reservations" }

  // 3 middle slots — Home and More are always pinned
  const middle = [
    ...(hasOrders ? [{ id: "orders", path: "/leads?view=orders", label: "Orders" }] : []),
    reservationsTab,
    { id: "photos", path: "/photos", label: "Photos" },
    { id: "contacts", path: "/contacts", label: "Contacts" },
  ].slice(0, 3)

  return [
    { id: "home", path: "/", label: "Home" },
    ...middle,
    { id: "more", path: "/more", label: "More" },
  ]
}
function HomeIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.72)"
  const w = active ? 2.5 : 1.5
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function LeadsIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.72)"
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
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.72)"
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
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.72)"
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

function OrdersIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.72)"
  const w = active ? 2.5 : 1.5
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2l1.5 3L10 2l2 3 2-3 2.5 3L18 2v20l-2-1-2 1-2-1-2 1-2-1-2 1V2z"/>
      <path d="M8 10h8"/>
      <path d="M8 14h6"/>
    </svg>
  )
}

function ReservationsIcon({ active }: { active: boolean }) {
  const s = active ? SIGNAL_GREEN : "rgba(255,255,255,0.72)"
  const w = active ? 2.5 : 1.5
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4"/>
      <path d="M8 2v4"/>
      <path d="M3 10h18"/>
      <path d="M8 15h4"/>
    </svg>
  )
}
function MoreIcon({ active }: { active: boolean }) {
  const c = active ? SIGNAL_GREEN : "rgba(255,255,255,0.72)"
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
  "orders":    (a) => <OrdersIcon   active={a} />,
  "reservations": (a) => <ReservationsIcon active={a} />,
  "/photos":   (a) => <PhotosIcon   active={a} />,
  "/contacts": (a) => <ContactsIcon active={a} />,
  "/more":     (a) => <MoreIcon     active={a} />,
}

export default function DashboardNav({
  companyName,
  newLeadCount = 0,
  industry = null,
  activeAddons = [],
}: {
  companyName?: string | null
  newLeadCount?: number
  industry?: string | null
  activeAddons?: string[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isDev   = pathname.startsWith("/dashboard")
  const segment = isDev ? pathname.slice("/dashboard".length) || "/" : pathname
  const prefix  = isDev ? "/dashboard" : ""

  const albumLabel = albumLabelFor(industry)
  const addonKey = activeAddons.join("|")
  const defaultTabs = defaultTabsFor(industry, activeAddons)
  const allAvailable = allTabsFor(industry, activeAddons)
  const storageKey = `found_dashboard_tabs_${companyName || "default"}`
  const [tabs, setTabs] = useState<Tab[]>(defaultTabs)

  const [albums, setAlbums]                 = useState<Album[]>([])
  const [showPicker, setShowPicker]         = useState(false)
  const [showNewAlbum, setShowNewAlbum]     = useState(false)
  const [newAlbumName, setNewAlbumName]     = useState("")
  const [creating, setCreating]             = useState(false)
  const [uploading, setUploading]           = useState(false)
  const [toast, setToast]                   = useState<string | null>(null)
  const [pendingSegment, setPendingSegment] = useState<string | null>(null)

  const newAlbumInputRef = useRef<HTMLInputElement>(null)
  const fileRef          = useRef<HTMLInputElement>(null)
  const pendingAlbumRef  = useRef<string | null>(null)
  const toastTimer       = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`${prefix}/api/albums`)
      .then(r => r.json())
      .then(d => setAlbums(d.albums ?? []))
      .catch(() => {})
  }, [prefix])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (!saved) { setTabs(defaultTabs); return }
      const ids = JSON.parse(saved) as string[]
      const byId = new Map(allAvailable.map(tab => [tab.id, tab]))
      const ordered = ids.map(id => byId.get(id)).filter(Boolean) as Tab[]
      const missing = defaultTabs.filter(tab => !ids.includes(tab.id))
      setTabs([...ordered, ...missing].slice(0, 5))
    } catch { setTabs(defaultTabs) }
  }, [storageKey, industry, addonKey])

  useEffect(() => {
    function onNavChanged() {
      try {
        const saved = window.localStorage.getItem(storageKey)
        if (!saved) { setTabs(defaultTabs); return }
        const ids = JSON.parse(saved) as string[]
        const byId = new Map(allAvailable.map(tab => [tab.id, tab]))
        const ordered = ids.map(id => byId.get(id)).filter(Boolean) as Tab[]
        const missing = defaultTabs.filter(tab => !ids.includes(tab.id))
        setTabs([...ordered, ...missing].slice(0, 5))
      } catch {}
    }
    window.addEventListener("found:dashboard-tabs-updated", onNavChanged)
    return () => window.removeEventListener("found:dashboard-tabs-updated", onNavChanged)
  }, [storageKey, industry, addonKey])

  // Home page quick-action "Camera" button opens this sheet
  useEffect(() => {
    function onOpenCamera() { setShowPicker(true) }
    window.addEventListener("found:open-camera", onOpenCamera)
    return () => window.removeEventListener("found:open-camera", onOpenCamera)
  }, [])

  // Instant visual feedback — clear when route actually settles
  useEffect(() => { setPendingSegment(null) }, [pathname])

  function pathOnly(tabPath: string) { return tabPath.split("?")[0] }

  function isActive(tabPath: string) {
    const cleanPath = pathOnly(tabPath)
    const effective = pendingSegment ?? segment
    const view = searchParams.get("view")
    if (tabPath.includes("view=orders")) return effective.startsWith("/leads") && view === "orders"
    if (tabPath.includes("view=reservations")) return effective.startsWith("/leads") && view === "reservations"
    if (cleanPath === "/") return effective === "/"
    if (cleanPath === "/leads") return effective.startsWith("/leads") && !view
    return effective === cleanPath || effective.startsWith(cleanPath + "/")
  }

  function handleCamera(e: React.MouseEvent) {
    e.preventDefault()
    setShowPicker(true)
  }

  function closePicker() {
    setShowPicker(false)
    setShowNewAlbum(false)
    setNewAlbumName("")
  }

  function shoot(albumId?: string) {
    closePicker()
    pendingAlbumRef.current = albumId ?? null
    fileRef.current?.click()
  }

  function showToastMsg(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  async function handleNavUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { e.target.value = ""; return }
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res  = await fetch(`${prefix}/api/photos`, { method: "POST", body: form })
      const data = await res.json()
      if (data.photo) {
        const albumId = pendingAlbumRef.current
        if (albumId) {
          fetch(`${prefix}/api/photos`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.photo.id, album_id: albumId }),
          }).catch(console.error)
          setAlbums(prev => prev.map(a =>
            a.id === albumId && !a.cover_url ? { ...a, cover_url: data.photo.url } : a
          ))
        }
        window.dispatchEvent(new CustomEvent("found:photo-uploaded", {
          detail: { photo: { ...data.photo, album_id: albumId ?? null } },
        }))
        const albumName = albumId ? albums.find(a => a.id === albumId)?.name : null
        showToastMsg(albumName ? `Saved to ${albumName}` : "Photo saved")
      } else {
        showToastMsg("Upload failed — try again")
      }
    } catch {
      showToastMsg("Upload failed — try again")
    } finally {
      pendingAlbumRef.current = null
      e.target.value = ""
      setUploading(false)
    }
  }

  async function handleCreate() {
    if (!newAlbumName.trim() || creating) return
    setCreating(true)
    try {
      const res  = await fetch(`${prefix}/api/albums`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAlbumName.trim() }),
      })
      const data = await res.json()
      if (data.album) {
        setAlbums(prev => [{ ...data.album, cover_url: null }, ...prev])
        shoot(data.album.id)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      {pendingSegment && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            zIndex: 120,
            overflow: "hidden",
            backgroundColor: `${SIGNAL_GREEN}18`,
          }}
        >
          <div style={{ width: "42%", height: "100%", borderRadius: 999, backgroundColor: SIGNAL_GREEN, boxShadow: `0 0 18px ${SIGNAL_GREEN}`, animation: "nav-loading-slide 900ms ease-in-out infinite" }} />
        </div>
      )}

      {/* ── Mobile bottom tab bar — 5 equal tabs ── */}
      <nav className="found-mobile-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        backgroundColor: "#080A09",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        display: "flex", alignItems: "flex-end",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 50,
      }}>
        {tabs.map(tab => {
          const active    = isActive(tab.path)
          const showBadge = pathOnly(tab.path) === "/leads" && newLeadCount > 0 && !active
          return (
            <Link
              key={tab.path}
              href={`${prefix}${tab.path}`}
              onClick={() => { if (!isActive(tab.path)) setPendingSegment(pathOnly(tab.path)) }}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none", padding: "12px 0 14px" }}
            >
              <div style={{ position: "relative" }}>
                {(ICONS[tab.path] || ICONS[tab.id] || ICONS[pathOnly(tab.path)])(active)}
                {showBadge && <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#FF3B30", border: "1.5px solid #080A09" }}/>}
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: active ? SIGNAL_GREEN : "rgba(255,255,255,0.72)", textTransform: "uppercase" }}>{tab.label}</span>
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
          {tabs.map(tab => {
            const active = isActive(tab.path)
            return (
              <Link
                key={tab.path}
                href={`${prefix}${tab.path}`}
                onClick={() => { if (!isActive(tab.path)) setPendingSegment(pathOnly(tab.path)) }}
                style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px 10px 13px", borderRadius: 10, backgroundColor: active ? `${SIGNAL_GREEN}12` : "transparent", borderLeft: `3px solid ${active ? SIGNAL_GREEN : "transparent"}` }}
              >
                <div style={{ position: "relative" }}>
                  {(ICONS[tab.path] || ICONS[tab.id] || ICONS[pathOnly(tab.path)])(active)}
                  {pathOnly(tab.path) === "/leads" && newLeadCount > 0 && !active && <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#FF3B30", border: "1.5px solid #080A09" }}/>}
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

      {/* ── Hidden file input ── */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleNavUpload}
      />

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          zIndex: 200,
          backgroundColor: "rgba(8,10,9,0.92)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 100,
          padding: "10px 20px",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "pickerFade 0.2s ease",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span style={{ ...TYPE.footnote, fontWeight: 600, color: "white" }}>{toast}</span>
        </div>
      )}

      {/* ── Camera picker sheet ── */}
      {showPicker && (
        <>
          <div
            onClick={closePicker}
            style={{ position: "fixed", inset: 0, zIndex: 60, backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", animation: "pickerFade 0.18s ease" }}
          />

          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70,
            backgroundColor: "#0D100E",
            borderRadius: "24px 24px 0 0",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: `20px 0 calc(env(safe-area-inset-bottom, 0px) + 28px)`,
            animation: "sheetUp 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
          }}>

            <div style={{ width: 32, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", margin: "0 auto 24px" }} />

            <div style={{ padding: "0 20px 16px" }}>
              <p style={{ margin: 0, fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                Where does this go?
              </p>
            </div>

            {albums.length > 0 && (
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
                        width: 72, height: 72, borderRadius: 18, overflow: "hidden",
                        border: `1.5px solid ${album.cover_url ? "rgba(255,255,255,0.12)" : `${color}28`}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        backgroundColor: album.cover_url ? "#111" : `${color}15`,
                        flexShrink: 0,
                      }}>
                        {album.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={album.cover_url} alt={album.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        ) : (
                          <span style={{ fontSize: "1.625rem", fontWeight: 300, color, lineHeight: 1 }}>
                            {album.name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: `rgba(255,255,255,0.65)`, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
                        {album.name}
                      </span>
                    </button>
                  )
                })}

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
            )}

            {albums.length === 0 && !showNewAlbum && (
              <div style={{ padding: "0 20px 12px" }}>
                <button
                  onClick={() => { setShowNewAlbum(true); setTimeout(() => newAlbumInputRef.current?.focus(), 60) }}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "1.5px dashed rgba(255,255,255,0.15)", borderRadius: 14, padding: "12px 16px", cursor: "pointer", width: "100%" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
                    Create your first {albumLabel.singular.toLowerCase()}
                  </span>
                </button>
              </div>
            )}

            {showNewAlbum && (
              <div style={{ padding: "4px 20px 12px", animation: "pickerFade 0.15s ease" }}>
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

            <div style={{ padding: "8px 20px 0" }}>
              <button
                onClick={() => shoot()}
                style={{
                  width: "100%", padding: "15px 0", borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "white", fontSize: "0.9375rem", fontWeight: 600,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Just shoot
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (min-width: 768px) {
          .found-mobile-nav  { display: none !important; }
          .found-sidebar     { display: flex !important; }
        }
        @keyframes sheetUp    { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pickerFade { from { opacity: 0; }                 to { opacity: 1; }               }
        @keyframes nav-spin   { to   { transform: rotate(360deg); }                                   }
        @keyframes nav-loading-slide { 0% { transform: translateX(-110%); } 55% { transform: translateX(125%); } 100% { transform: translateX(260%); } }
        .picker-scroll::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  )
}



