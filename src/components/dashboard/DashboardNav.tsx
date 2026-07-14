"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK, TEXT_OPACITY, TYPE, albumLabelFor, avatarColorFor } from "@/lib/dashboard/typography"
import { getAvailableDashboardTools, getDashboardToolStorageKey, getDefaultDashboardTools, type DashboardTool } from "@/lib/dashboard/toolPolicy"
import CameraSheet, { type UploadedPhoto } from "@/components/dashboard/CameraSheet"
import FoundWordmark from "@/components/FoundWordmark"
import { DashboardToolIcon } from "@/components/dashboard/DashboardToolIcon"

type Tab = DashboardTool
type Album = { id: string; name: string; cover_url: string | null }


export default function DashboardNav({
  companyName,
  newLeadCount = 0,
  newOrderCount = 0,
  newReservationCount = 0,
  industry = null,
  subIndustry = null,
  activeAddons = [],
}: {
  companyName?: string | null
  newLeadCount?: number
  newOrderCount?: number
  newReservationCount?: number
  industry?: string | null
  subIndustry?: string | null
  activeAddons?: string[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isDev   = pathname.startsWith("/dashboard")
  const segment = isDev ? pathname.slice("/dashboard".length) || "/" : pathname
  const prefix  = isDev ? "/dashboard" : ""

  const albumLabel = albumLabelFor(industry)
  const addonKey = activeAddons.join("|")
  const defaultTabs = getDefaultDashboardTools({ industry, subIndustry, activeAddons })
  const allAvailable = getAvailableDashboardTools({ industry, subIndustry, activeAddons })
  const storageKey = getDashboardToolStorageKey(companyName, industry, activeAddons, subIndustry)
  const [tabs, setTabs] = useState<Tab[]>(defaultTabs)

  const [albums, setAlbums]                 = useState<Album[]>([])
  const [showPicker, setShowPicker]         = useState(false)
  const [showCamera, setShowCamera]         = useState(false)
  const [showNewAlbum, setShowNewAlbum]     = useState(false)
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [newAlbumName, setNewAlbumName]     = useState("")
  const [creating, setCreating]             = useState(false)
  const [uploading, setUploading]           = useState(false)
  const [toast, setToast]                   = useState<string | null>(null)
  const [pendingSegment, setPendingSegment] = useState<string | null>(null)

  const newAlbumInputRef = useRef<HTMLInputElement>(null)
  const fileRef          = useRef<HTMLInputElement>(null)
  const uploadRef        = useRef<HTMLInputElement>(null)
  const pendingAlbumRef  = useRef<string | null>(null)
  const toastTimer       = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`${prefix}/api/albums`)
      .then(r => r.json())
      .then(d => setAlbums(d.albums ?? []))
      .catch(() => {})
  }, [prefix])

  function mobileLabelFor(tab: Tab) {
    return tab.label === "Estimate Requests" ? "Requests" : tab.label
  }

  function buildTabs(ids: string[]): Tab[] {
    const byId = new Map(allAvailable.map(tab => [tab.id, tab]))
    const ordered = ids.map(id => byId.get(id)).filter(Boolean) as Tab[]
    // HOME always first, MORE always last — fall back to defaults if missing from saved set
    const homeTab = ordered.find(t => t.id === "home") ?? defaultTabs.find(t => t.id === "home")
    const moreTab = ordered.find(t => t.id === "more") ?? defaultTabs.find(t => t.id === "more")
    const middle  = ordered.filter(t => t.id !== "home" && t.id !== "more").slice(0, 3)
    return [
      ...(homeTab ? [homeTab] : []),
      ...middle,
      ...(moreTab ? [moreTab] : []),
    ]
  }

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (!saved) { setTabs(defaultTabs); return }
      const savedIds = JSON.parse(saved) as string[]
      setTabs(buildTabs(savedIds))
    } catch { setTabs(defaultTabs) }
  }, [storageKey, industry, subIndustry, addonKey])

  useEffect(() => {
    function onNavChanged() {
      try {
        const saved = window.localStorage.getItem(storageKey)
        if (!saved) { setTabs(defaultTabs); return }
        const savedIds = JSON.parse(saved) as string[]
        setTabs(buildTabs(savedIds))
      } catch {}
    }
    window.addEventListener("found:dashboard-tabs-updated", onNavChanged)
    return () => window.removeEventListener("found:dashboard-tabs-updated", onNavChanged)
  }, [storageKey, industry, subIndustry, addonKey])

  // Home page quick-action "Camera" button opens this sheet
  useEffect(() => {
    function onOpenCamera() { setShowPicker(true) }
    window.addEventListener("found:open-camera", onOpenCamera)
    return () => window.removeEventListener("found:open-camera", onOpenCamera)
  }, [])

  // Instant visual feedback — clear when route actually settles
  useEffect(() => { setPendingSegment(null) }, [pathname])

  function pathOnly(tabPath: string) { return tabPath.split("?")[0] }
  function isGeneralLeadTab(tab: Tab) {
    return pathOnly(tab.path) === "/leads" && !tab.path.includes("view=orders") && !tab.path.includes("view=reservations")
  }
  function badgeCountFor(tab: Tab) {
    if (tab.path.includes("view=orders")) return newOrderCount
    if (tab.path.includes("view=reservations")) return newReservationCount
    if (isGeneralLeadTab(tab)) return newLeadCount

    const hasVisibleGeneralLeadTab = tabs.some(isGeneralLeadTab)
    const hasVisibleOrderTab = tabs.some(t => t.path.includes("view=orders"))
    const hasVisibleReservationTab = tabs.some(t => t.path.includes("view=reservations"))

    if (tab.id === "people") {
      return (hasVisibleGeneralLeadTab ? 0 : newLeadCount) +
        (hasVisibleOrderTab ? 0 : newOrderCount) +
        (hasVisibleReservationTab ? 0 : newReservationCount)
    }

    return 0
  }

  function isActive(tabPath: string) {
    const cleanPath = pathOnly(tabPath)
    const effective = pendingSegment ?? segment
    const view = searchParams.get("view")
    if (tabPath.includes("view=orders")) return effective.startsWith("/leads") && view === "orders"
    if (tabPath.includes("view=reservations")) return effective.startsWith("/leads") && view === "reservations"
    if (cleanPath === "/") return effective === "/"
    if (cleanPath === "/leads") return effective.startsWith("/leads") && !view
    if (cleanPath === "/estimates") return effective.startsWith("/estimates")
    if (cleanPath === "/people") return effective.startsWith("/people")
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
    setSelectedAlbumId(null)
  }

  function shoot(albumId?: string) {
    closePicker()
    pendingAlbumRef.current = albumId ?? null
    if (typeof navigator !== "undefined" && "mediaDevices" in navigator) {
      setShowCamera(true)
    } else {
      fileRef.current?.click()
    }
  }

  function uploadFromLibrary(albumId?: string) {
    closePicker()
    pendingAlbumRef.current = albumId ?? null
    uploadRef.current?.click()
  }

  function handleCameraUploaded(photo: UploadedPhoto) {
    const albumId = pendingAlbumRef.current
    if (albumId) {
      fetch(`${prefix}/api/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: photo.id, album_id: albumId }),
      }).catch(console.error)
      setAlbums(prev => prev.map(a =>
        a.id === albumId && !a.cover_url ? { ...a, cover_url: photo.url } : a
      ))
    }
    window.dispatchEvent(new CustomEvent("found:photo-uploaded", {
      detail: { photo: { ...photo, album_id: albumId ?? null } },
    }))
    showToastMsg(albumId ? `Saved to ${albums.find(a => a.id === albumId)?.name ?? "album"}` : "Photo saved")
  }

  function handleCameraClose() {
    pendingAlbumRef.current = null
    setShowCamera(false)
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
          const showBadge = badgeCountFor(tab) > 0 && !active
          return (
            <Link
              key={tab.path}
              href={`${prefix}${tab.path}`}
              onClick={() => { if (!isActive(tab.path)) setPendingSegment(pathOnly(tab.path)) }}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, textDecoration: "none", padding: "12px 0 14px" }}
            >
              <div style={{ position: "relative" }}>
                <DashboardToolIcon tool={tab} active={active} />
                {showBadge && <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#FF3B30", border: "1.5px solid #080A09" }}/>}
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: active ? SIGNAL_GREEN : "rgba(255,255,255,0.72)", textTransform: "uppercase" }}>{mobileLabelFor(tab)}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Desktop sidebar ── */}
      <aside className="found-sidebar" style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 220, backgroundColor: "#080A09", borderRight: "1px solid rgba(255,255,255,0.07)", flexDirection: "column", zIndex: 50, display: "none" }}>
        <div style={{ padding: "24px 20px 20px" }}>
          <FoundWordmark height={16} color="white" />
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
                  <DashboardToolIcon tool={tab} active={active} />
                  {badgeCountFor(tab) > 0 && !active && <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", backgroundColor: "#FF3B30", border: "1.5px solid #080A09" }}/>}
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

      {/* ── Hidden file inputs ── */}
      {/* Library / files picker — no capture, opens photo library */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: "none" }}
        onChange={handleNavUpload}
      />
      {/* Fallback OS camera (only used when getUserMedia unavailable) */}
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
            minHeight: "50vh",
            padding: `20px 0 calc(env(safe-area-inset-bottom, 0px) + 32px)`,
            animation: "sheetUp 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
            display: "flex", flexDirection: "column",
          }}>

            {/* Drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", margin: "0 auto 28px" }} />

            {/* Title */}
            <div style={{ padding: "0 24px 24px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "1.375rem", fontWeight: 300, letterSpacing: "-0.02em", color: "white" }}>
                Add photos or video
              </p>
              <p style={{ margin: 0, fontSize: "0.8125rem", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                {selectedAlbumId
                  ? `Saving to "${albums.find(a => a.id === selectedAlbumId)?.name ?? "project"}"`
                  : "Pick a project below, or just shoot and organize later."}
              </p>
            </div>

            {/* Project selector */}
            {albums.length > 0 && (
              <div
                className="picker-scroll"
                style={{ display: "flex", gap: 12, overflowX: "auto", padding: "2px 24px 4px", scrollbarWidth: "none", flexShrink: 0 }}
              >
                {albums.map(album => {
                  const color    = avatarColorFor(album.name)
                  const selected = selectedAlbumId === album.id
                  return (
                    <button
                      key={album.id}
                      onClick={() => setSelectedAlbumId(selected ? null : album.id)}
                      style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <div style={{
                        width: 76, height: 76, borderRadius: 20, overflow: "hidden", position: "relative",
                        border: selected ? `2px solid ${SIGNAL_GREEN}` : `1.5px solid ${album.cover_url ? "rgba(255,255,255,0.12)" : `${color}28`}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        backgroundColor: album.cover_url ? "#111" : `${color}15`,
                        flexShrink: 0,
                        boxShadow: selected ? `0 0 0 3px ${SIGNAL_GREEN}25` : "none",
                        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      }}>
                        {album.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={album.cover_url} alt={album.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        ) : (
                          <span style={{ fontSize: "1.75rem", fontWeight: 300, color, lineHeight: 1 }}>
                            {album.name[0].toUpperCase()}
                          </span>
                        )}
                        {selected && (
                          <div style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: "50%", backgroundColor: SIGNAL_GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: "0.6875rem", fontWeight: selected ? 700 : 600, color: selected ? SIGNAL_GREEN : `rgba(255,255,255,0.65)`, maxWidth: 76, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center", transition: "color 0.15s ease" }}>
                        {album.name}
                      </span>
                    </button>
                  )
                })}

                {!showNewAlbum && (
                  <button
                    onClick={() => { setShowNewAlbum(true); setTimeout(() => newAlbumInputRef.current?.focus(), 60) }}
                    style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <div style={{ width: 76, height: 76, borderRadius: 20, border: "1.5px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, textAlign: "center" }}>New</span>
                  </button>
                )}
              </div>
            )}

            {/* Empty state — no projects yet */}
            {albums.length === 0 && !showNewAlbum && (
              <div style={{ padding: "0 24px 8px" }}>
                <button
                  onClick={() => { setShowNewAlbum(true); setTimeout(() => newAlbumInputRef.current?.focus(), 60) }}
                  style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "1.5px dashed rgba(255,255,255,0.12)", borderRadius: 16, padding: "16px 18px", cursor: "pointer", width: "100%", boxSizing: "border-box" }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ margin: "0 0 2px", fontSize: "0.875rem", fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Create a project</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>Group photos by job, event, or location</p>
                  </div>
                </button>
              </div>
            )}

            {/* New project input */}
            {showNewAlbum && (
              <div style={{ padding: "4px 24px 8px", animation: "pickerFade 0.15s ease" }}>
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

            {/* Spacer pushes buttons to bottom */}
            <div style={{ flex: 1, minHeight: 24 }} />

            {/* Shoot | Upload — two large primary buttons */}
            <div style={{ padding: "0 24px", display: "flex", gap: 12 }}>
              <button
                onClick={() => shoot(selectedAlbumId ?? undefined)}
                style={{
                  flex: 1, padding: "18px 0", borderRadius: 18,
                  backgroundColor: SIGNAL_GREEN,
                  border: "none", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: `0 0 28px ${SIGNAL_GREEN}33`,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: FOUND_BLACK, letterSpacing: "-0.01em" }}>Shoot</span>
              </button>

              <button
                onClick={() => uploadFromLibrary(selectedAlbumId ?? undefined)}
                style={{
                  flex: 1, padding: "18px 0", borderRadius: 18,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16"/>
                  <line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
                </svg>
                <span style={{ fontSize: "1rem", fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>Upload</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* In-app camera */}
      {showCamera && (
        <CameraSheet
          onClose={handleCameraClose}
          onUploaded={handleCameraUploaded}
          pendingAlbumId={pendingAlbumRef.current}
        />
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

