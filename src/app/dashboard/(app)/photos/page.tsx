"use client"

import React, { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { TYPE, TEXT_OPACITY, GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK, albumLabelFor } from "@/lib/dashboard/typography"
import CameraSheet, { type UploadedPhoto } from "@/components/dashboard/CameraSheet"

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
type SocialFormat = "square" | "portrait" | "story"
type SocialStatus = "draft" | "shared" | "downloaded" | "archived"

type SocialDraft = {
  id: string
  photo_id: string
  format: SocialFormat
  caption: string
  status: SocialStatus
  created_at: string
  updated_at: string
  photo_url: string | null
  photo_created_at: string | null
}

type CompanyMeta = {
  name: string
  slug: string
  primaryColor: string
  phone: string | null
  city: string | null
  state: string | null
}

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
  return <Suspense><PhotosPageInner /></Suspense>
}

function PhotosPageInner() {
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
  const [selectedSocialDraft, setSelectedSocialDraft] = useState<SocialDraft | null>(null)
  const [socialDrafts, setSocialDrafts] = useState<SocialDraft[]>([])
  const [socialGenerating, setSocialGenerating] = useState(false)
  const [socialError, setSocialError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [siteSlug, setSiteSlug] = useState("")
  const [companyMeta, setCompanyMeta] = useState<CompanyMeta>({ name: "Your Business", slug: "", primaryColor: SIGNAL_GREEN, phone: null, city: null, state: null })
  const [industry, setIndustry] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [lightroomIndex, setLightroomIndex] = useState<number | null>(null)
  const [lightroomSource, setLightroomSource] = useState<"current" | "album">("current")
  const [showCamera, setShowCamera] = useState(false)
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
    function onNavUpload(e: Event) {
      const photo = (e as CustomEvent).detail?.photo
      if (photo) setPhotos(prev => [photo, ...prev])
    }
    window.addEventListener("found:photo-uploaded", onNavUpload)
    return () => window.removeEventListener("found:photo-uploaded", onNavUpload)
  }, [])

  useEffect(() => {
    Promise.all([
      fetch("/api/photos").then(r => r.json()),
      fetch("/api/albums").then(r => r.json()),
      fetch("/api/company-slug").then(r => r.json()).catch(() => ({ slug: "", industry: null, isPro: false })),
      fetch("/api/social-posts").then(r => r.json()).catch(() => ({ drafts: [], tableReady: true })),
    ]).then(([pd, ad, sd, sp]) => {
      setPhotos(pd.photos ?? [])
      setAlbums(ad.albums ?? [])
      setSiteSlug(sd.slug ?? "")
      setCompanyMeta({
        name: sd.name ?? "Your Business",
        slug: sd.slug ?? "",
        primaryColor: sd.primaryColor ?? SIGNAL_GREEN,
        phone: sd.phone ?? null,
        city: sd.city ?? null,
        state: sd.state ?? null,
      })
      setIndustry(sd.industry ?? null)
      setIsPro(sd.isPro ?? false)
      setSocialDrafts(sp.drafts ?? [])
      if (sp.tableReady === false) setSocialError("Social post drafts need the new database update before they can be saved.")
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

  async function renameAlbum(album: Album, name: string) {
    const trimmed = name.trim()
    if (!trimmed || trimmed === album.name) return
    const res = await fetch("/api/albums", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: album.id, name: trimmed }),
    })
    const data = await res.json()
    if (data.album) {
      setAlbums(prev => prev.map(a => a.id === album.id ? { ...a, name: data.album.name } : a))
      if (activeAlbum?.id === album.id) setActiveAlbum(prev => prev ? { ...prev, name: data.album.name } : prev)
    }
  }

  async function generateSocialPosts(photoIds?: string[]) {
    setSocialGenerating(true)
    setSocialError(null)
    try {
      const res = await fetch("/api/social-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: photoIds ?? social.map(p => p.id) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Could not make posts yet.")
      setSocialDrafts(data.drafts ?? [])
      if ((data.drafts ?? []).length > 0) setView("social")
    } catch (err) {
      setSocialError(err instanceof Error ? err.message : "Could not make posts yet.")
    } finally {
      setSocialGenerating(false)
    }
  }

  async function updateSocialDraft(id: string, patch: Partial<Pick<SocialDraft, "caption" | "status">>) {
    setSocialDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch, updated_at: new Date().toISOString() } : d))
    setSelectedSocialDraft(prev => prev?.id === id ? { ...prev, ...patch, updated_at: new Date().toISOString() } : prev)
    try {
      const res = await fetch("/api/social-posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Could not save social draft.")
    } catch (err) {
      setSocialError(err instanceof Error ? err.message : "Could not save social draft.")
    }
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
    if (typeof navigator !== "undefined" && "mediaDevices" in navigator) {
      setShowCamera(true)
    } else {
      fileRef.current?.click()
    }
  }

  function handleCameraUploaded(photo: UploadedPhoto) {
    const albumId = pendingAlbumIdRef.current
    const newPhoto = { ...photo, album_id: albumId ?? null }
    setPhotos(prev => [newPhoto, ...prev])
    if (albumId) {
      fetch("/api/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: photo.id, album_id: albumId }),
      }).catch(console.error)
    }
  }

  function handleCameraClose() {
    pendingAlbumIdRef.current = null
    setShowCamera(false)
  }

  const unsorted  = photos.filter(p => !p.for_website && !p.for_social)
  const website = photos.filter(p => p.for_website)
  const social  = photos.filter(p => p.for_social)

  const albumPhotos = activeAlbum
    ? photos.filter(p => p.album_id === activeAlbum.id)
    : []

  const currentPhotos =
    view === "queue"   ? unsorted :
    view === "website" ? website :
    view === "social"  ? social : []

  const lightroomPhotos = lightroomSource === "album" ? albumPhotos : currentPhotos

  const TAB_COUNTS = { queue: unsorted.length, website: website.length, social: social.length, projects: albums.length }
  const TAB_LABELS = { queue: "Unsorted", website: "Website", social: "Social", projects: albumLabel.plural }

  function openLightroom(photo: Photo, source: Photo[]) {
    const index = source.findIndex(p => p.id === photo.id)
    if (index === -1) return
    setLightroomSource(source === albumPhotos ? "album" : "current")
    setLightroomIndex(index)
  }

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
              <AlbumTitleEditor album={activeAlbum} onRename={renameAlbum} />
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes lrFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Content */}
      <div style={{ flex: 1, padding: "0 24px 32px" }}>
        {loading ? (
          <div style={{ paddingTop: 80, textAlign: "center", color: "rgba(255,255,255,0.2)", ...TYPE.footnote }}>Loading…</div>
        ) : activeAlbum ? (
          <DateGroupedGrid
            photos={albumPhotos}
            onView={p => openLightroom(p, albumPhotos)}
            emptyTitle={`No photos in this ${albumLabel.singular.toLowerCase()} yet.`}
            emptySub="Tap the camera button to add photos."
            onAdd={openCamera}
            showAddCta
          />
        ) : view === "social" ? (
          <SocialWorkspace
            drafts={socialDrafts}
            photos={social}
            generating={socialGenerating}
            error={socialError}
            onGenerate={() => generateSocialPosts()}
            onOpenDraft={setSelectedSocialDraft}
            onViewPhoto={p => openLightroom(p, social)}
          />
        ) : view === "projects" ? (
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
          <DateGroupedGrid
            photos={currentPhotos}
            onView={p => openLightroom(p, currentPhotos)}
            emptyTitle={
              view === "queue"   ? "Take a photo or video." :
              view === "website" ? "No website photos yet." :
              "No social photos yet."
            }
            emptySub={
              view === "queue"   ? "Tap the camera icon at the top to take photos and video." :
              view === "website" ? "Heart any photo and it'll appear here, ready for your site." :
              "Star any photo and Found will format it with your branding."
            }
            emptyIcon={
              view === "queue" ? <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> :
              view === "website" ? <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> :
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            }
            onAdd={undefined}
            showAddCta={false}
          />
        )}
      </div>

      {/* Lightroom viewer */}
      {lightroomIndex !== null && lightroomPhotos.length > 0 && (
        <PhotoLightroom
          photos={lightroomPhotos}
          initialIndex={lightroomIndex}
          onClose={() => setLightroomIndex(null)}
          onFlag={flag}
          onRemove={remove}
        />
      )}

      {/* Social post sheet */}
      {selectedSocialDraft && (
        <SocialPostSheet
          draft={selectedSocialDraft}
          company={companyMeta}
          onClose={() => setSelectedSocialDraft(null)}
          onCaptionChange={(caption) => updateSocialDraft(selectedSocialDraft.id, { caption })}
          onStatus={(status) => updateSocialDraft(selectedSocialDraft.id, { status })}
        />
      )}

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

      {/* In-app camera */}
      {showCamera && (
        <CameraSheet
          onClose={handleCameraClose}
          onUploaded={handleCameraUploaded}
          pendingAlbumId={pendingAlbumIdRef.current}
        />
      )}
    </main>
  )
}

// ── Lightroom viewer ──
function PhotoLightroom({ photos, initialIndex, onClose, onFlag, onRemove }: {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
  onFlag: (id: string, field: "for_website" | "for_social", current: boolean) => void
  onRemove: (photo: Photo) => void
}) {
  const [index, setIndex] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const photo = photos[Math.min(index, photos.length - 1)]

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft")  setIndex(i => Math.max(0, i - 1))
      else if (e.key === "ArrowRight") setIndex(i => Math.min(photos.length - 1, i + 1))
      else if (e.key === "Escape") onCloseRef.current()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [photos.length])

  function onTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX)
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 48) {
      if (diff > 0) setIndex(i => Math.min(photos.length - 1, i + 1))
      else setIndex(i => Math.max(0, i - 1))
    }
    setTouchStart(null)
  }

  function handleDelete() {
    const remaining = photos.length
    onRemove(photo)
    if (remaining === 1) {
      onClose()
    } else {
      setIndex(i => Math.min(i, remaining - 2))
    }
  }

  if (!photo) return null

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "#000", display: "flex", flexDirection: "column", animation: "lrFadeIn 0.18s ease" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 101,
        padding: "max(env(safe-area-inset-top, 0px), 20px) 20px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          backgroundColor: "rgba(0,0,0,0.38)", borderRadius: 100,
          padding: "5px 13px",
        }}>
          <span style={{ ...TYPE.footnote, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
            {index + 1} of {photos.length}
          </span>
        </div>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: "50%",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          backgroundColor: "rgba(0,0,0,0.38)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Image */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", userSelect: "none", pointerEvents: "none" }} />

        {/* Invisible tap zones */}
        {index > 0 && (
          <button onClick={() => setIndex(i => i - 1)} aria-label="Previous"
            style={{ position: "absolute", left: 0, top: "10%", bottom: "25%", width: "28%", background: "none", border: "none", cursor: "pointer" }} />
        )}
        {index < photos.length - 1 && (
          <button onClick={() => setIndex(i => i + 1)} aria-label="Next"
            style={{ position: "absolute", right: 0, top: "10%", bottom: "25%", width: "28%", background: "none", border: "none", cursor: "pointer" }} />
        )}
      </div>

      {/* Bottom action bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 55%, transparent 100%)",
        paddingTop: 72,
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 32px)",
        display: "flex", alignItems: "flex-end", justifyContent: "space-around",
        padding: `72px 32px max(env(safe-area-inset-bottom, 0px), 36px)`,
      }}>
        {/* Heart — Website */}
        <button onClick={() => onFlag(photo.id, "for_website", photo.for_website)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            backgroundColor: photo.for_website ? "rgba(255,75,139,0.28)" : "rgba(255,255,255,0.1)",
            border: `2px solid ${photo.for_website ? "rgba(255,75,139,0.55)" : "rgba(255,255,255,0.14)"}`,
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.18s ease",
          }}>
            <svg width="25" height="25" viewBox="0 0 24 24"
              fill={photo.for_website ? "#FF4B8B" : "none"}
              stroke={photo.for_website ? "#FF4B8B" : "rgba(255,255,255,0.75)"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </div>
          <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: photo.for_website ? "#FF4B8B" : "rgba(255,255,255,0.5)", letterSpacing: "0.02em" }}>Website</span>
        </button>

        {/* Star — Social */}
        <button onClick={() => onFlag(photo.id, "for_social", photo.for_social)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            backgroundColor: photo.for_social ? "rgba(255,184,0,0.22)" : "rgba(255,255,255,0.1)",
            border: `2px solid ${photo.for_social ? "rgba(255,184,0,0.5)" : "rgba(255,255,255,0.14)"}`,
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.18s ease",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24"
              fill={photo.for_social ? "#FFB800" : "none"}
              stroke={photo.for_social ? "#FFB800" : "rgba(255,255,255,0.75)"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: photo.for_social ? "#FFB800" : "rgba(255,255,255,0.5)", letterSpacing: "0.02em" }}>Social</span>
        </button>

        {/* Trash — Delete */}
        <button onClick={handleDelete} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            backgroundColor: "rgba(255,70,70,0.1)",
            border: "2px solid rgba(255,70,70,0.22)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,100,100,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </div>
          <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "rgba(255,100,100,0.75)", letterSpacing: "0.02em" }}>Delete</span>
        </button>
      </div>
    </div>
  )
}

// ── Date-grouped photo grid ──
function DateGroupedGrid({
  photos, onView, emptyTitle, emptySub, emptyIcon, onAdd, showAddCta
}: {
  photos: Photo[]
  onView: (photo: Photo) => void
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
              <PhotoCard key={photo.id} photo={photo} onView={onView} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatLabel(format: SocialFormat) {
  if (format === "square") return "Square"
  if (format === "portrait") return "Portrait"
  return "Story"
}

function formatSize(format: SocialFormat) {
  if (format === "square") return { width: 1080, height: 1080, label: "1080 x 1080" }
  if (format === "portrait") return { width: 1080, height: 1350, label: "1080 x 1350" }
  return { width: 1080, height: 1920, label: "1080 x 1920" }
}

function SocialWorkspace({ drafts, photos, generating, error, onGenerate, onOpenDraft, onViewPhoto }: {
  drafts: SocialDraft[]
  photos: Photo[]
  generating: boolean
  error: string | null
  onGenerate: () => void
  onOpenDraft: (draft: SocialDraft) => void
  onViewPhoto: (photo: Photo) => void
}) {
  const ready = drafts.filter(d => d.status !== "archived" && d.photo_url)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ borderRadius: 24, padding: 22, background: "linear-gradient(135deg, rgba(50,208,116,0.15), rgba(255,255,255,0.035))", border: `1px solid ${SIGNAL_GREEN}24` }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: SIGNAL_GREEN }}>SOCIAL ASSISTANT</p>
        <h2 style={{ margin: "0 0 10px", fontSize: "1.65rem", lineHeight: 1.05, fontWeight: 300, color: "white", letterSpacing: "-0.04em" }}>Turn today&apos;s work into posts.</h2>
        <p style={{ margin: "0 0 18px", ...TYPE.subhead, fontWeight: 400, lineHeight: 1.65, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
          Star the photos worth sharing. Found makes branded post drafts you can share, download, or caption-copy from your phone.
        </p>
        <button onClick={onGenerate} disabled={generating || photos.length === 0} style={{
          width: "100%", border: "none", borderRadius: 999, padding: "15px 18px",
          backgroundColor: photos.length === 0 ? "rgba(255,255,255,0.08)" : SIGNAL_GREEN,
          color: photos.length === 0 ? "rgba(255,255,255,0.35)" : FOUND_BLACK,
          ...TYPE.subhead, fontWeight: 800, cursor: photos.length === 0 ? "default" : "pointer",
          boxShadow: photos.length === 0 ? "none" : `0 0 26px ${SIGNAL_GREEN}30`,
        }}>
          {generating ? "Making posts..." : ready.length > 0 ? "Make More Posts" : "Make Posts"}
        </button>
        {error && <p style={{ margin: "12px 0 0", ...TYPE.footnote, color: "rgba(255,160,80,0.85)", lineHeight: 1.5 }}>{error}</p>}
      </div>

      {ready.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ margin: 0, ...TYPE.headline, color: "white" }}>Ready Posts</h3>
            <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{ready.length}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {ready.map(draft => (
              <button key={draft.id} onClick={() => onOpenDraft(draft)} style={{
                border: "1px solid rgba(255,255,255,0.08)", padding: 0, borderRadius: 18, overflow: "hidden",
                backgroundColor: "rgba(255,255,255,0.04)", textAlign: "left", cursor: "pointer",
              }}>
                <div style={{ position: "relative", aspectRatio: draft.format === "story" ? "9/14" : draft.format === "portrait" ? "4/5" : "1", backgroundColor: "rgba(255,255,255,0.05)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={draft.photo_url ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72), transparent 58%)" }} />
                  <div style={{ position: "absolute", left: 10, right: 10, bottom: 10 }}>
                    <span style={{ display: "inline-flex", borderRadius: 999, padding: "5px 8px", backgroundColor: "rgba(0,0,0,0.62)", color: "white", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{formatLabel(draft.format)}</span>
                  </div>
                </div>
                <div style={{ padding: "10px 11px" }}>
                  <p style={{ margin: 0, ...TYPE.caption, color: draft.status === "draft" ? SIGNAL_GREEN : "rgba(255,255,255,0.42)" }}>{draft.status === "draft" ? "Ready to share" : draft.status}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ margin: 0, ...TYPE.headline, color: "white" }}>Starred Photos</h3>
          <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{photos.length}</span>
        </div>
        {photos.length === 0 ? (
          <div style={{ padding: "40px 18px", textAlign: "center", borderRadius: 22, backgroundColor: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ margin: "0 0 8px", fontSize: "1.25rem", fontWeight: 300, color: "white" }}>No social photos yet.</p>
            <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 400, lineHeight: 1.6, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Open a photo and tap the star. Found will turn it into branded social posts.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
            {photos.map(photo => <PhotoCard key={photo.id} photo={photo} onView={onViewPhoto} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function coverRect(imgW: number, imgH: number, boxW: number, boxH: number) {
  const scale = Math.max(boxW / imgW, boxH / imgH)
  const width = imgW * scale
  const height = imgH * scale
  return { x: (boxW - width) / 2, y: (boxH - height) / 2, width, height }
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ")
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

async function drawSocialCanvas(canvas: HTMLCanvasElement, draft: SocialDraft, company: CompanyMeta, caption: string) {
  if (!draft.photo_url) return
  const size = formatSize(draft.format)
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.fillStyle = "#080A09"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const img = await loadImage(draft.photo_url)
  const rect = coverRect(img.naturalWidth || img.width, img.naturalHeight || img.height, canvas.width, canvas.height)
  ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height)

  const grad = ctx.createLinearGradient(0, canvas.height * 0.42, 0, canvas.height)
  grad.addColorStop(0, "rgba(0,0,0,0)")
  grad.addColorStop(0.56, "rgba(0,0,0,0.58)")
  grad.addColorStop(1, "rgba(0,0,0,0.9)")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const pad = Math.round(canvas.width * 0.07)
  const footerHeight = Math.round(canvas.height * 0.145)
  ctx.fillStyle = company.primaryColor || SIGNAL_GREEN
  ctx.fillRect(0, canvas.height - 10, canvas.width, 10)

  ctx.fillStyle = "rgba(8,10,9,0.76)"
  ctx.fillRect(pad, canvas.height - footerHeight - pad, canvas.width - pad * 2, footerHeight)

  ctx.fillStyle = "#ffffff"
  ctx.font = `900 ${Math.round(canvas.width * 0.052)}px Arial, sans-serif`
  ctx.textBaseline = "top"
  ctx.fillText(company.name || "Your Business", pad * 1.35, canvas.height - footerHeight - pad + 28)

  ctx.font = `700 ${Math.round(canvas.width * 0.028)}px Arial, sans-serif`
  ctx.fillStyle = "rgba(255,255,255,0.72)"
  const url = company.slug ? `${company.slug}.foundco.app` : "foundco.app"
  const meta = [url, company.phone].filter(Boolean).join("  |  ")
  ctx.fillText(meta, pad * 1.35, canvas.height - footerHeight - pad + 88)

  const captionLine = caption.split("\n").find(Boolean) ?? "Recent work"
  ctx.font = `800 ${Math.round(canvas.width * 0.038)}px Arial, sans-serif`
  ctx.fillStyle = "rgba(255,255,255,0.92)"
  const lines = wrapCanvasText(ctx, captionLine, canvas.width - pad * 2).slice(0, 2)
  let y = canvas.height - footerHeight - pad - 92
  for (const line of lines) {
    ctx.fillText(line, pad, y)
    y += Math.round(canvas.width * 0.048)
  }
}

function SocialPostSheet({ draft, company, onClose, onCaptionChange, onStatus }: {
  draft: SocialDraft
  company: CompanyMeta
  onClose: () => void
  onCaptionChange: (caption: string) => void
  onStatus: (status: SocialStatus) => void
}) {
  const [caption, setCaption] = useState(draft.caption)
  const [message, setMessage] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    setCaption(draft.caption)
  }, [draft.id, draft.caption])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawSocialCanvas(canvas, draft, company, caption).catch(() => setMessage("This photo could not be rendered yet."))
  }, [draft, company, caption])

  function canvasBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current
      if (!canvas) return reject(new Error("Missing canvas"))
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not export image")), "image/png", 0.95)
    })
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption)
    onCaptionChange(caption)
    setMessage("Caption copied")
  }

  async function downloadImage() {
    setWorking(true)
    try {
      const blob = await canvasBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${company.slug || "found"}-${draft.format}-post.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      await navigator.clipboard.writeText(caption).catch(() => {})
      onCaptionChange(caption)
      onStatus("downloaded")
      setMessage("Image downloaded. Caption copied.")
    } catch {
      setMessage("Download failed. Try saving the image from your browser.")
    } finally {
      setWorking(false)
    }
  }

  async function shareImage() {
    setWorking(true)
    try {
      const blob = await canvasBlob()
      const file = new File([blob], `${company.slug || "found"}-${draft.format}-post.png`, { type: "image/png" })
      const canShareFile = typeof navigator !== "undefined" && "canShare" in navigator && navigator.canShare?.({ files: [file] })
      if (canShareFile) {
        await navigator.share({ files: [file], text: caption, title: company.name })
        onCaptionChange(caption)
        onStatus("shared")
        setMessage("Shared")
      } else {
        await downloadImage()
        setMessage("Sharing files is not available here, so Found downloaded it and copied the caption.")
      }
    } catch {
      setMessage("Share canceled or unavailable.")
    } finally {
      setWorking(false)
    }
  }

  const size = formatSize(draft.format)

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.72)", zIndex: 80, backdropFilter: "blur(6px)" }}/>
      <div style={{ position: "fixed", inset: "auto 0 0", zIndex: 90, maxHeight: "92dvh", overflowY: "auto", backgroundColor: "#101411", borderTop: "1px solid rgba(255,255,255,0.1)", borderRadius: "28px 28px 0 0", padding: "14px 20px max(34px, env(safe-area-inset-bottom))" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.16)", margin: "0 auto 18px" }}/>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          <div>
            <p style={{ margin: "0 0 6px", ...TYPE.caption, color: SIGNAL_GREEN }}>{formatLabel(draft.format)} Post</p>
            <h3 style={{ margin: 0, ...TYPE.title, color: "white" }}>{size.label}</h3>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.75)", cursor: "pointer" }}>x</button>
        </div>

        <div style={{ borderRadius: 22, overflow: "hidden", backgroundColor: "#050705", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", aspectRatio: `${size.width}/${size.height}` }} />
        </div>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", marginBottom: 8, ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Caption</span>
          <textarea value={caption} onChange={e => setCaption(e.target.value)} onBlur={() => onCaptionChange(caption)} rows={6} style={{ width: "100%", boxSizing: "border-box", resize: "vertical", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.055)", color: "white", padding: 14, ...TYPE.subhead, fontWeight: 400, lineHeight: 1.55, outline: "none" }} />
        </label>

        {message && <p style={{ margin: "0 0 12px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{message}</p>}
        <div style={{ display: "grid", gap: 10 }}>
          <button onClick={shareImage} disabled={working} style={{ width: "100%", border: "none", borderRadius: 999, padding: "16px 18px", backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK, ...TYPE.subhead, fontWeight: 850, cursor: "pointer" }}>{working ? "Working..." : "Share Post"}</button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={downloadImage} disabled={working} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "14px 12px", backgroundColor: "rgba(255,255,255,0.055)", color: "white", ...TYPE.footnote, fontWeight: 750, cursor: "pointer" }}>Download</button>
            <button onClick={copyCaption} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "14px 12px", backgroundColor: "rgba(255,255,255,0.055)", color: "white", ...TYPE.footnote, fontWeight: 750, cursor: "pointer" }}>Copy Caption</button>
          </div>
        </div>
      </div>
    </>
  )
}
// ── Projects tab ──
// ── Album title editor (inside album detail header) ──
function AlbumTitleEditor({ album, onRename }: { album: Album; onRename: (a: Album, name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(album.name)

  useEffect(() => { setName(album.name) }, [album.name])

  function save() {
    onRename(album, name)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false) }}
          style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 10, padding: "6px 12px", color: "white",
            fontSize: "1.5rem", fontWeight: 300, letterSpacing: "-0.03em",
            outline: "none", width: "100%",
          }}
        />
        <button onClick={save} style={{ border: "none", background: "none", color: SIGNAL_GREEN, ...TYPE.caption, cursor: "pointer", flexShrink: 0 }}>Save</button>
        <button onClick={() => setEditing(false)} style={{ border: "none", background: "none", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, ...TYPE.caption, cursor: "pointer", flexShrink: 0 }}>Cancel</button>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <h1 style={{ margin: 0, ...TYPE.largeTitle, color: "white" }}>{album.name}</h1>
      <button onClick={() => setEditing(true)} style={{ border: "none", background: "none", padding: "4px", cursor: "pointer", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, display: "flex", alignItems: "center", flexShrink: 0, marginTop: 2 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  )
}

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

// ── Photo card — tap to open lightroom ──
function PhotoCard({ photo, onView }: {
  photo: Photo
  onView: (photo: Photo) => void
}) {
  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "1" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt="Business photo"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: "pointer" }}
        onClick={() => onView(photo)}
      />
      {/* Flag badges */}
      <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4, pointerEvents: "none" }}>
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
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
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
