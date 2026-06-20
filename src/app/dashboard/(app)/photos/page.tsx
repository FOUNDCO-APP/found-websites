"use client"

import React, { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { TYPE, TEXT_OPACITY, GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK, albumLabelFor } from "@/lib/dashboard/typography"

type Photo = {
  id: string
  url: string
  for_website: boolean
  for_social: boolean
  website_section: string | null
  album_id: string | null
  created_at: string
}

type Album = {
  id: string
  name: string
  slug: string
  created_at: string
}

type View = "queue" | "website" | "social" | "projects"

function dateGroupLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 7) return "This week"
  if (days < 14) return "Last week"
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function groupPhotosByDate(photos: Photo[]): Array<{ label: string; photos: Photo[] }> {
  const map = new Map<string, Photo[]>()
  for (const p of photos) {
    const label = dateGroupLabel(p.created_at)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(p)
  }
  return Array.from(map.entries()).map(([label, photos]) => ({ label, photos }))
}

export default function PhotosPage() {
  const [view, setView] = useState<View>("queue")
  const [photos, setPhotos] = useState<Photo[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null)
  const [showNewAlbum, setShowNewAlbum] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState("")
  const [savingAlbum, setSavingAlbum] = useState(false)
  const [shareAlbum, setShareAlbum] = useState<Album | null>(null)
  const [copied, setCopied] = useState(false)
  const [siteSlug, setSiteSlug] = useState("")
  const [industry, setIndustry] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingAlbumIdRef = useRef<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  const albumLabel = albumLabelFor(industry)

  useEffect(() => {
    const albumId = searchParams.get("album")
    const upload = searchParams.get("upload")
    if (upload === "1") {
      if (albumId) pendingAlbumIdRef.current = albumId
      fileRef.current?.click()
      router.replace("/photos")
    }
  }, [searchParams, router])

  useEffect(() => {
    Promise.all([
      fetch("/api/photos").then(r => r.json()),
      fetch("/api/albums").then(r => r.json()),
      fetch("/api/company-slug").then(r => r.json()).catch(() => ({ slug: "", industry: null, isPro: false })),
    ]).then(([pd, ad, sd]) => {
      setPhotos(pd.photos ?? [])
      setAlbums(ad.albums ?? [])
      setSiteSlug(sd.slug ?? "")
      setIndustry(sd.industry ?? null)
      setIsPro(sd.isPro ?? false)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/photos", { method: "POST", body: form })
    const data = await res.json()
    if (data.photo) {
      const albumId = pendingAlbumIdRef.current
      const newPhoto = { ...data.photo, album_id: albumId ?? null }
      setPhotos(prev => [newPhoto, ...prev])
      if (albumId) {
        fetch("/api/photos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: data.photo.id, album_id: albumId }),
        }).catch(console.error)
        // Navigate into the album
        const target = albums.find(a => a.id === albumId)
        if (target) {
          setView("projects")
          setActiveAlbum(target)
        }
      }
      pendingAlbumIdRef.current = null
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function flag(id: string, field: "for_website" | "for_social", current: boolean) {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, [field]: !current } : p))
    fetch("/api/photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: !current }),
    }).catch(console.error)
  }

  async function remove(photo: Photo) {
    await fetch("/api/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photo.id, storage_path: photo.url }),
    })
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  async function createAlbum() {
    if (!newAlbumName.trim()) return
    setSavingAlbum(true)
    const res = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newAlbumName.trim() }),
    })
    const data = await res.json()
    if (data.album) {
      setAlbums(prev => [data.album, ...prev])
      setNewAlbumName("")
      setShowNewAlbum(false)
      setActiveAlbum(data.album)
    }
    setSavingAlbum(false)
  }

  async function deleteAlbum(album: Album) {
    await fetch(`/api/albums?id=${album.id}`, { method: "DELETE" })
    setAlbums(prev => prev.filter(a => a.id !== album.id))
    if (activeAlbum?.id === album.id) setActiveAlbum(null)
  }

  async function handleShare(album: Album) {
    const url = `https://${siteSlug}.foundco.app/gallery/${album.slug}`
    if (navigator.share) {
      await navigator.share({ title: album.name, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    setShareAlbum(null)
  }

  function openCamera() {
    if (activeAlbum) pendingAlbumIdRef.current = activeAlbum.id
    fileRef.current?.click()
  }

  const unsorted  = photos.filter(p => !p.for_website && !p.for_social && !p.album_id)
  const website = photos.filter(p => p.for_website)
  const social  = photos.filter(p => p.for_social)

  const albumPhotos = activeAlbum
    ? photos.filter(p => p.album_id === activeAlbum.id)
    : []

  const currentPhotos =
    view === "queue"   ? unsorted :
    view === "website" ? website :
    view === "social"  ? social : []

  const TAB_COUNTS = { queue: unsorted.length, website: website.length, social: social.length, projects: albums.length }
  const TAB_LABELS = { queue: "Unsorted", website: "Website", social: "Social", projects: albumLabel.plural }

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "32px 24px 20px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          {activeAlbum ? (
            <>
              <button onClick={() => setActiveAlbum(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,${TEXT_OPACITY.tertiary})`} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{albumLabel.plural}</span>
              </button>
              <h1 style={{ margin: 0, ...TYPE.largeTitle, color: "white" }}>{activeAlbum.name}</h1>
              <p style={{ margin: "4px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                {albumPhotos.length} photo{albumPhotos.length !== 1 ? "s" : ""}
              </p>
            </>
          ) : (
            <>
              <h1 style={{ margin: 0, ...TYPE.largeTitle, color: "white" }}>Photos</h1>
              <p style={{ margin: "4px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                {photos.length === 0 ? "Your work, beautifully organized" : `${photos.length} photo${photos.length !== 1 ? "s" : ""}`}
              </p>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {activeAlbum && (
            <button onClick={() => isPro ? setShareAlbum(activeAlbum) : setShowUpgrade(true)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 16px", borderRadius: 100,
              backgroundColor: isPro ? `${SIGNAL_GREEN}18` : "rgba(255,255,255,0.06)",
              border: `1px solid ${isPro ? `${SIGNAL_GREEN}33` : "rgba(255,255,255,0.1)"}`,
              color: isPro ? SIGNAL_GREEN : "rgba(255,255,255,0.5)",
              cursor: "pointer", ...TYPE.footnote, fontWeight: 700,
            }}>
              {!isPro && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              )}
              Share
              {isPro && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              )}
            </button>
          )}
          <button onClick={openCamera} disabled={uploading} style={{
            width: 44, height: 44, borderRadius: "50%",
            backgroundColor: SIGNAL_GREEN, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 16px ${SIGNAL_GREEN}44`, opacity: uploading ? 0.6 : 1,
          }}>
            {uploading ? (
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${FOUND_BLACK}44`, borderTopColor: FOUND_BLACK, animation: "spin 0.8s linear infinite" }}/>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleUpload} style={{ display: "none" }} />
      </div>

      {/* Tabs — hidden when inside an album */}
      {!activeAlbum && (
        <div style={{ padding: "0 24px 20px", display: "flex", gap: 0 }}>
          {(["queue", "website", "social", "projects"] as View[]).map(v => {
            const active = view === v
            return (
              <button key={v} onClick={() => setView(v)} style={{
                flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
                backgroundColor: "transparent",
                borderBottom: `2px solid ${active ? SIGNAL_GREEN : "rgba(255,255,255,0.08)"}`,
                color: active ? "white" : "rgba(255,255,255,0.3)",
                ...TYPE.footnote, fontWeight: active ? 700 : 400,
                transition: "all 0.15s ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}>
                {TAB_LABELS[v]}
                {TAB_COUNTS[v] > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    backgroundColor: active ? SIGNAL_GREEN : "rgba(255,255,255,0.1)",
                    color: active ? FOUND_BLACK : "rgba(255,255,255,0.4)",
                    borderRadius: 100, padding: "2px 6px",
                  }}>{TAB_COUNTS[v]}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Content */}
      <div style={{ flex: 1, padding: "0 24px 32px" }}>
        {loading ? (
          <div style={{ paddingTop: 80, textAlign: "center", color: "rgba(255,255,255,0.2)", ...TYPE.footnote }}>Loading…</div>
        ) : activeAlbum ? (
          /* ── ALBUM DETAIL VIEW ── */
          <DateGroupedGrid
            photos={albumPhotos}
            onFlag={flag}
            onRemove={remove}
            emptyTitle={`No photos in this ${albumLabel.singular.toLowerCase()} yet.`}
            emptySub="Tap the camera button to add photos."
            onAdd={openCamera}
            showAddCta
          />
        ) : view === "projects" ? (
          /* ── PROJECTS TAB ── */
          <ProjectsTab
            albums={albums}
            photos={photos}
            albumLabel={albumLabel}
            isPro={isPro}
            showNew={showNewAlbum}
            newName={newAlbumName}
            saving={savingAlbum}
            onShowNew={() => setShowNewAlbum(true)}
            onHideNew={() => { setShowNewAlbum(false); setNewAlbumName("") }}
            onNameChange={setNewAlbumName}
            onCreate={createAlbum}
            onOpen={setActiveAlbum}
            onShare={setShareAlbum}
            onUpgrade={() => setShowUpgrade(true)}
            onDelete={deleteAlbum}
          />
        ) : (
          /* ── UNSORTED / WEBSITE / SOCIAL TABS — date-grouped ── */
          <DateGroupedGrid
            photos={currentPhotos}
            onFlag={flag}
            onRemove={remove}
            emptyTitle={
              view === "queue"   ? "Take your first photo." :
              view === "website" ? "No website photos yet." :
              "No social photos yet."
            }
            emptySub={
              view === "queue"   ? "Tap the camera button. Photos stay here — not in your camera roll." :
              view === "website" ? "Heart any photo and it'll appear here, ready for your site." :
              "Star any photo and Found will format it with your branding."
            }
            emptyIcon={
              view === "queue" ? <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> :
              view === "website" ? <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> :
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            }
            onAdd={view === "queue" ? openCamera : undefined}
            showAddCta={view === "queue"}
          />
        )}
      </div>

      {/* Share album sheet */}
      {shareAlbum && (
        <ShareSheet
          album={shareAlbum}
          siteSlug={siteSlug}
          copied={copied}
          onShare={handleShare}
          onClose={() => setShareAlbum(null)}
        />
      )}

      {/* Upgrade sheet */}
      {showUpgrade && (
        <UpgradeSheet onClose={() => setShowUpgrade(false)} />
      )}
    </main>
  )
}

// ── Date-grouped photo grid ──
function DateGroupedGrid({
  photos, onFlag, onRemove, emptyTitle, emptySub, emptyIcon, onAdd, showAddCta
}: {
  photos: Photo[]
  onFlag: (id: string, field: "for_website" | "for_social", current: boolean) => void
  onRemove: (photo: Photo) => void
  emptyTitle: string
  emptySub: string
  emptyIcon?: React.ReactNode
  onAdd?: () => void
  showAddCta?: boolean
}) {
  if (photos.length === 0) {
    return (
      <div style={{ paddingTop: 60, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          {emptyIcon ?? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
          )}
        </div>
        <p style={{ margin: "0 0 10px", fontSize: "1.375rem", fontWeight: 300, color: "white", letterSpacing: "-0.03em" }}>{emptyTitle}</p>
        <p style={{ margin: "0 0 32px", ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, lineHeight: 1.7 }}>{emptySub}</p>
        {showAddCta && onAdd && (
          <button onClick={onAdd} style={{
            padding: "14px 32px", borderRadius: 100,
            backgroundColor: SIGNAL_GREEN, border: "none",
            color: FOUND_BLACK, fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: `0 4px 20px ${SIGNAL_GREEN}44`,
          }}>Add a Photo</button>
        )}
      </div>
    )
  }

  const groups = groupPhotosByDate(photos)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {groups.map(group => (
        <div key={group.label}>
          <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, marginBottom: 10 }}>
            {group.label}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
            {group.photos.map(photo => (
              <PhotoCard key={photo.id} photo={photo} onFlag={onFlag} onRemove={onRemove} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Projects tab ──
function ProjectsTab({
  albums, photos, albumLabel, isPro, showNew, newName, saving,
  onShowNew, onHideNew, onNameChange, onCreate, onOpen, onShare, onUpgrade, onDelete,
}: {
  albums: Album[]
  photos: Photo[]
  albumLabel: { singular: string; plural: string; create: string }
  isPro: boolean
  showNew: boolean
  newName: string
  saving: boolean
  onShowNew: () => void
  onHideNew: () => void
  onNameChange: (s: string) => void
  onCreate: () => void
  onOpen: (a: Album) => void
  onShare: (a: Album) => void
  onUpgrade: () => void
  onDelete: (a: Album) => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* New album form */}
      {showNew ? (
        <div style={{ borderRadius: 20, padding: 20, backgroundColor: "rgba(255,255,255,0.05)", border: `1px solid ${SIGNAL_GREEN}22`, marginBottom: 6 }}>
          <div style={{ ...TYPE.caption, color: SIGNAL_GREEN, marginBottom: 14 }}>{albumLabel.create}</div>
          <input
            autoFocus
            value={newName}
            onChange={e => onNameChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onCreate()}
            placeholder={`${albumLabel.singular} name…`}
            style={{ width: "100%", padding: "13px 16px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 12 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onHideNew} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button onClick={onCreate} disabled={!newName.trim() || saving} style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", backgroundColor: newName.trim() ? SIGNAL_GREEN : "rgba(255,255,255,0.08)", color: newName.trim() ? FOUND_BLACK : "rgba(255,255,255,0.3)", fontSize: "0.8125rem", fontWeight: 700, cursor: newName.trim() ? "pointer" : "default" }}>
              {saving ? "Creating…" : `Create ${albumLabel.singular}`}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={onShowNew} style={{
          width: "100%", padding: "16px 0", borderRadius: 16,
          border: `2px dashed ${SIGNAL_GREEN}33`, backgroundColor: "transparent",
          color: `${SIGNAL_GREEN}88`, ...TYPE.subhead, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          marginBottom: 6,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {albumLabel.create}
        </button>
      )}

      {albums.length === 0 && !showNew ? (
        <div style={{ paddingTop: 40, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
            </svg>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: "1.375rem", fontWeight: 300, color: "white", letterSpacing: "-0.03em" }}>Create your first {albumLabel.singular.toLowerCase()}.</p>
          <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.7 }}>
            Group photos by job, client, or event.<br/>Share a branded link with any client.
          </p>
        </div>
      ) : (
        albums.map(album => {
          const count = photos.filter(p => p.album_id === album.id).length
          const thumb = photos.find(p => p.album_id === album.id)
          return (
            <div key={album.id} style={{ borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div onClick={() => onOpen(album)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer" }}>
                {/* Thumbnail */}
                <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)", flexShrink: 0 }}>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...TYPE.headline, color: "white", marginBottom: 3 }}>{album.name}</div>
                  <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
                    {count} photo{count !== 1 ? "s" : ""}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
              {/* Album actions */}
              <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <button onClick={() => isPro ? onShare(album) : onUpgrade()} style={{
                  flex: 1, padding: "11px 0", border: "none", backgroundColor: "transparent",
                  color: isPro ? SIGNAL_GREEN : `rgba(255,255,255,${TEXT_OPACITY.tertiary})`,
                  ...TYPE.caption, cursor: "pointer",
                  borderRight: "1px solid rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}>
                  {isPro ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  )}
                  Share with Client
                </button>
                <button onClick={() => onDelete(album)} style={{
                  flex: 0, padding: "11px 16px", border: "none", backgroundColor: "transparent",
                  color: "rgba(255,80,80,0.5)", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                }}>Delete</button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Photo card ──
function PhotoCard({ photo, onFlag, onRemove }: {
  photo: Photo
  onFlag: (id: string, field: "for_website" | "for_social", current: boolean) => void
  onRemove: (photo: Photo) => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "1" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt="Business photo" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onClick={() => setShowActions(v => !v)} />

      {/* Flag badges */}
      <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
        {photo.for_website && (
          <div style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#FF4B8B" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </div>
        )}
        {photo.for_social && (
          <div style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFB800" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
        )}
      </div>

      {/* Action overlay */}
      {showActions && (
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 16 }} onClick={() => setShowActions(false)}>
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <button onClick={e => { e.stopPropagation(); onFlag(photo.id, "for_website", photo.for_website) }} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer", backgroundColor: photo.for_website ? "rgba(255,75,139,0.25)" : "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={photo.for_website ? "#FF4B8B" : "none"} stroke={photo.for_website ? "#FF4B8B" : "rgba(255,255,255,0.7)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </button>
            <button onClick={e => { e.stopPropagation(); onFlag(photo.id, "for_social", photo.for_social) }} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer", backgroundColor: photo.for_social ? "rgba(255,184,0,0.2)" : "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={photo.for_social ? "#FFB800" : "none"} stroke={photo.for_social ? "#FFB800" : "rgba(255,255,255,0.7)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>
          <button onClick={e => { e.stopPropagation(); onRemove(photo) }} style={{ width: "100%", padding: "8px 0", borderRadius: 12, border: "none", cursor: "pointer", backgroundColor: "rgba(255,70,70,0.2)", color: "#FF4646", ...TYPE.caption }}>Remove</button>
        </div>
      )}
    </div>
  )
}

// ── Upgrade sheet ──
function UpgradeSheet({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 60, backdropFilter: "blur(4px)" }}/>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70, backgroundColor: "#101411", borderTop: "1px solid rgba(255,255,255,0.1)", borderRadius: "28px 28px 0 0", padding: "14px 24px 40px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 22px" }}/>

        {/* Lock icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: `${SIGNAL_GREEN}12`, border: `1px solid ${SIGNAL_GREEN}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
        </div>

        <h3 style={{ margin: "0 0 8px", ...TYPE.title, color: "white", textAlign: "center" }}>Found Pro</h3>
        <p style={{ margin: "0 0 24px", ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, lineHeight: 1.6, textAlign: "center" }}>
          Share organized project galleries with clients. Upgrade to unlock client sharing.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {["Share project galleries with clients", "Branded gallery link — your colors", "Client sees only the photos you choose"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: `${SIGNAL_GREEN}18`, border: `1px solid ${SIGNAL_GREEN}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span style={{ ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{f}</span>
            </div>
          ))}
        </div>

        <a href="/more" onClick={onClose} style={{
          display: "block", width: "100%", padding: "16px 0", borderRadius: 14, border: "none",
          backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK, textDecoration: "none",
          ...TYPE.subhead, fontWeight: 700, cursor: "pointer", textAlign: "center",
          boxShadow: `0 0 28px ${SIGNAL_GREEN}33`,
        }}>
          Upgrade to Pro →
        </a>

        <button onClick={onClose} style={{ display: "block", width: "100%", marginTop: 12, padding: "13px 0", background: "none", border: "none", cursor: "pointer", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
          Maybe later
        </button>
      </div>
    </>
  )
}

// ── Share sheet ──
function ShareSheet({ album, siteSlug, copied, onShare, onClose }: {
  album: Album
  siteSlug: string
  copied: boolean
  onShare: (album: Album) => void
  onClose: () => void
}) {
  const url = siteSlug ? `https://${siteSlug}.foundco.app/gallery/${album.slug}` : null

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 60, backdropFilter: "blur(4px)" }}/>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70, backgroundColor: "#101411", borderTop: "1px solid rgba(255,255,255,0.1)", borderRadius: "28px 28px 0 0", padding: "14px 24px 40px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 22px" }}/>
        <h3 style={{ margin: "0 0 6px", ...TYPE.title, color: "white" }}>Share with Client</h3>
        <p style={{ margin: "0 0 22px", ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
          Send this link to your client. They&apos;ll see only photos from <strong style={{ color: "white", fontWeight: 700 }}>{album.name}</strong>.
        </p>
        {url && (
          <div style={{ borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "14px 16px", marginBottom: 16, overflow: "hidden" }}>
            <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, wordBreak: "break-all" }}>
              {url}
            </p>
          </div>
        )}
        <button onClick={() => onShare(album)} style={{
          width: "100%", padding: "16px 0", borderRadius: 14, border: "none",
          backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK,
          ...TYPE.subhead, fontWeight: 700, cursor: "pointer",
          boxShadow: `0 0 24px ${SIGNAL_GREEN}33`,
        }}>
          {copied ? "Link Copied ✓" : "Copy & Share Link"}
        </button>
      </div>
    </>
  )
}
