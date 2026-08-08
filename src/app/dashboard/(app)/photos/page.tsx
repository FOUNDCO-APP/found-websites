"use client"

import React, { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { TYPE, TEXT_OPACITY, GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK } from "@/lib/dashboard/typography"
import CameraSheet, { type UploadedPhoto } from "@/components/dashboard/CameraSheet"
import { isVideoMedia } from "@/lib/mediaKind"
import { uploadDashboardMedia } from "@/lib/uploadDashboardMedia"
import { getPublicSiteOrigin } from "@/lib/siteUrl"
import { getPhotoDestinationOptions, placePhoto, removeFromGallery, type PhotoDestination } from "./placementActions"
import Spinner from "@/components/Spinner"

type Photo = {
  id: string
  url: string
  for_website: boolean
  for_social: boolean
  website_section: string | null
  in_gallery: boolean
  album_id: string | null
  created_at: string
  media_type?: "photo" | "video"
  mime_type?: string | null
}

type Album = {
  id: string
  name: string
  slug: string
  created_at: string
}

type View = "all" | "website" | "albums"
type PhotoFilter = "all" | "favorites" | "unused"
type PhotoNotice = { text: string; tone: "gallery" | "favorite" | "page" }
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

function destinationLabelForSlot(slot: string | null, destinations?: PhotoDestination[] | null) {
  if (!slot) return null
  const found = destinations?.find(d => d.slot === slot)?.label
  const label = found ?? ({
    hero: "Home top",
    cta: "Home bottom",
    about: "About",
    services: "Services",
    contact: "Contact",
    shop: "Shop",
    order: "Menu",
    announcement: "Update",
    gallery: "Gallery",
  } as Record<string, string>)[slot] ?? "Site"
  return label.split(" — ")[0]
}

function photoSitePlacementLabel(photo: Photo, destinations?: PhotoDestination[] | null) {
  if (photo.website_section === "announcement") return null
  return destinationLabelForSlot(photo.website_section, destinations)
    ?? (photo.in_gallery ? destinationLabelForSlot("gallery", destinations) : null)
}

export default function PhotosPage() {
  return <Suspense><PhotosPageInner /></Suspense>
}

function PhotosPageInner() {
  const [view, setView] = useState<View>("all")
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>("all")
  const [photos, setPhotos] = useState<Photo[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null)
  const [showNewAlbum, setShowNewAlbum] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState("")
  const [savingAlbum, setSavingAlbum] = useState(false)
  const [shareAlbum, setShareAlbum] = useState<Album | null>(null)
  const [deleteConfirmPhoto, setDeleteConfirmPhoto] = useState<Photo | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [copied, setCopied] = useState(false)
  const [siteSlug, setSiteSlug] = useState("")
  const [customDomain, setCustomDomain] = useState<string | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [lightroomIndex, setLightroomIndex] = useState<number | null>(null)
  const [lightroomSource, setLightroomSource] = useState<"current" | "album">("current")
  const [showCamera, setShowCamera] = useState(false)
  const [showAddOptions, setShowAddOptions] = useState(false)
  const [showExistingPicker, setShowExistingPicker] = useState(false)
  const [placingPhoto, setPlacingPhoto] = useState<Photo | null>(null)
  const [destinations, setDestinations] = useState<PhotoDestination[] | null>(null)
  const [destinationsLoading, setDestinationsLoading] = useState(false)
  const [placingSlot, setPlacingSlot] = useState<string | null>(null)
  const [placeReassignConfirm, setPlaceReassignConfirm] = useState<{ slot: string; label: string } | null>(null)
  const [photoNotice, setPhotoNotice] = useState<PhotoNotice | null>(null)
  const [showPhotoFilters, setShowPhotoFilters] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingAlbumIdRef = useRef<string | null>(null)
  const photoNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  const albumLabel = { singular: "Album", plural: "Albums", create: "New Album" }

  useEffect(() => {
    const albumId = searchParams.get("album")
    const upload = searchParams.get("upload")
    const camera = searchParams.get("camera")
    if (camera === "1") {
      if (albumId) pendingAlbumIdRef.current = albumId
      setShowCamera(true)
      router.replace("/photos")
      return
    }
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
    ]).then(([pd, ad, sd]) => {
      setPhotos(pd.photos ?? [])
      setAlbums(ad.albums ?? [])
      setSiteSlug(sd.slug ?? "")
      setCustomDomain(sd.customDomain ?? null)
      setIsPro(sd.isPro ?? false)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    return () => {
      if (photoNoticeTimerRef.current) clearTimeout(photoNoticeTimerRef.current)
    }
  }, [])

  function showPhotoNotice(notice: PhotoNotice) {
    if (photoNoticeTimerRef.current) clearTimeout(photoNoticeTimerRef.current)
    setPhotoNotice(notice)
    photoNoticeTimerRef.current = setTimeout(() => setPhotoNotice(null), 1800)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const albumId = pendingAlbumIdRef.current
    setUploading(true)
    setPhotoError(null)
    try {
      const newPhoto = await uploadDashboardMedia(file, { albumId })
      setPhotos(prev => [{ ...newPhoto, album_id: albumId ?? null }, ...prev])
      if (albumId) {
        const target = albums.find(a => a.id === albumId)
        if (target) {
          setView("albums")
          setActiveAlbum(target)
        }
      }
      pendingAlbumIdRef.current = null
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function flag(id: string, field: "for_website" | "for_social", current: boolean) {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, [field]: !current } : p))
    if (field === "for_social") {
      showPhotoNotice({ text: current ? "Removed from Favorites" : "Added to Favorites", tone: "favorite" })
    }
    fetch("/api/photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: !current }),
    }).catch(console.error)
  }

  async function toggleGallery(photo: Photo) {
    const inGallery = photo.in_gallery || (photo.for_website && !photo.website_section)
    const include = !inGallery
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, in_gallery: include, for_website: include || Boolean(p.website_section) } : p))
    showPhotoNotice({ text: include ? "Added to Gallery" : "Removed from Gallery", tone: "gallery" })
    const result = include ? await placePhoto(photo.id, "gallery") : await removeFromGallery(photo.id)
    if (result && "error" in result) {
      setPhotos(prev => prev.map(p => p.id === photo.id ? photo : p))
      showPhotoNotice({ text: "Gallery update did not save", tone: "page" })
    }
  }

  async function remove(photo: Photo) {
    await fetch("/api/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photo.id }),
    })
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  async function openPlacement(photo: Photo) {
    setPlacingPhoto(photo)
    setPlaceReassignConfirm(null)
    if (destinations === null && !destinationsLoading) {
      setDestinationsLoading(true)
      const result = await getPhotoDestinationOptions()
      setDestinationsLoading(false)
      if (!("error" in result)) setDestinations(result)
    }
  }

  async function handlePlace(destination: PhotoDestination, force = false) {
    if (!placingPhoto) return
    const isGalleryToggle = Boolean(destination.toggle)
    const removingFromGallery = isGalleryToggle && placingPhoto.in_gallery

    if (!isGalleryToggle && !force) {
      const occupant = photos.find(p => p.id !== placingPhoto.id && p.website_section === destination.slot)
      if (occupant) {
        setPlaceReassignConfirm({ slot: destination.slot, label: destination.label })
        return
      }
    }

    setPlacingSlot(destination.slot)
    const photoId = placingPhoto.id
    const result = removingFromGallery ? await removeFromGallery(photoId) : await placePhoto(photoId, destination.slot)
    setPlacingSlot(null)
    setPlaceReassignConfirm(null)
    if (result && "error" in result) return

    setPhotos(prev => prev.map(p => {
      if (isGalleryToggle) {
        return p.id === photoId ? { ...p, in_gallery: !removingFromGallery } : p
      }
      if (p.id === photoId) return { ...p, website_section: destination.slot }
      if (p.website_section === destination.slot) return { ...p, website_section: null }
      return p
    }))
    if (!isGalleryToggle) setPlacingPhoto(null)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  async function downloadSelected() {
    if (selectedIds.size === 0 || downloadingZip) return
    setDownloadingZip(true)
    try {
      const res = await fetch("/api/photos/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (!res.ok) throw new Error("Download failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "photos.zip"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      exitSelectMode()
    } catch {
      setPhotoError("Couldn't download those photos. Try again.")
    } finally {
      setDownloadingZip(false)
    }
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
      setShowAddOptions(true)
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

  async function handleShare(album: Album) {
    const url = `${getPublicSiteOrigin(siteSlug, customDomain)}/gallery/${album.slug}`
    if (navigator.share) {
      await navigator.share({ title: album.name, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    setShareAlbum(null)
  }

  async function handleSharePhoto(photo: Photo) {
    async function shareLink() {
      if (navigator.share) {
        await navigator.share({ url: photo.url }).catch(() => {})
      } else {
        await navigator.clipboard.writeText(photo.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
    try {
      const res = await fetch(photo.url)
      const blob = await res.blob()
      const ext = blob.type.split("/")[1] || "jpg"
      const file = new File([blob], `photo.${ext}`, { type: blob.type })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] }).catch(() => {})
      } else {
        await shareLink()
      }
    } catch {
      await shareLink()
    }
  }

  function openCamera() {
    if (!activeAlbum) {
      window.dispatchEvent(new CustomEvent("found:open-camera"))
      return
    }
    setShowAddOptions(true)
  }

  function handleTakePhotoFromSheet() {
    setShowAddOptions(false)
    if (!activeAlbum) return
    pendingAlbumIdRef.current = activeAlbum.id
    if (typeof navigator !== "undefined" && "mediaDevices" in navigator) {
      setShowCamera(true)
    } else {
      fileRef.current?.click()
    }
  }

  function handleUploadFromSheet() {
    setShowAddOptions(false)
    if (!activeAlbum) return
    pendingAlbumIdRef.current = activeAlbum.id
    fileRef.current?.click()
  }

  async function handleUseExistingConfirm(ids: string[]) {
    if (!activeAlbum || ids.length === 0) { setShowExistingPicker(false); return }
    const albumId = activeAlbum.id
    setPhotos(prev => prev.map(p => ids.includes(p.id) ? { ...p, album_id: albumId } : p))
    setShowExistingPicker(false)
    await Promise.all(ids.map(id =>
      fetch("/api/photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, album_id: albumId }),
      }).catch(console.error)
    ))
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

  const allPhotos = photos
  const gallery = photos.filter(p => p.in_gallery || (p.for_website && !p.website_section))
  const favorites  = photos.filter(p => p.for_social)
  const unused = photos.filter(p => !p.in_gallery && !p.website_section)
  const filteredAllPhotos =
    photoFilter === "favorites" ? favorites :
    photoFilter === "unused" ? unused :
    allPhotos

  const albumPhotos = activeAlbum
    ? photos.filter(p => p.album_id === activeAlbum.id)
    : []

  const currentPhotos =
    view === "all" ? filteredAllPhotos :
    view === "website" ? gallery : []

  const lightroomPhotos = lightroomSource === "album" ? albumPhotos : currentPhotos

  const activeAllTabLabel = photoFilter === "favorites" ? "Favorites" : photoFilter === "unused" ? "Not on site" : "All Photos"
  const activeAllTabCount = photoFilter === "favorites" ? favorites.length : photoFilter === "unused" ? unused.length : allPhotos.length
  const TAB_LABELS = { all: activeAllTabLabel, website: "Gallery", albums: "Albums" }
  const ACTIVE_TAB_COUNTS = { all: activeAllTabCount, website: gallery.length, albums: albums.length }
  const FILTER_LABELS = { all: "All Photos", favorites: "Favorites", unused: "Not on site" }
  const FILTER_COUNTS = { all: allPhotos.length, favorites: favorites.length, unused: unused.length }

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
          {!selectMode && photos.length > 0 && (
            <button onClick={() => setSelectMode(true)} style={{
              padding: "10px 16px", borderRadius: 100,
              backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)", cursor: "pointer", ...TYPE.footnote, fontWeight: 700,
            }}>
              Select
            </button>
          )}
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
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleUpload} style={{ display: "none" }} />
      </div>

      {/* Tabs â€” hidden when inside an album */}
      {!activeAlbum && (
        <div style={{
          position: "sticky",
          top: "calc(max(env(safe-area-inset-top), 14px) + 47px)",
          zIndex: 30,
          padding: "8px 24px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          background: "#080A09",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: -140, height: 140, backgroundColor: "#080A09", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "stretch", gap: 10, width: "100%" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 0 }}>
              {(["all", "website", "albums"] as View[]).map(v => {
                const active = view === v
                return (
                  <button key={v} onClick={() => { setView(v); if (v !== "all") setPhotoFilter("all") }} style={{
                    flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
                    backgroundColor: "transparent",
                    borderBottom: `2px solid ${active ? SIGNAL_GREEN : "rgba(255,255,255,0.08)"}`,
                    color: active ? "white" : "rgba(255,255,255,0.3)",
                    ...TYPE.footnote, fontWeight: active ? 700 : 400,
                    transition: "all 0.15s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    {TAB_LABELS[v]}
                    {ACTIVE_TAB_COUNTS[v] > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        backgroundColor: active ? SIGNAL_GREEN : "rgba(255,255,255,0.1)",
                        color: active ? FOUND_BLACK : "rgba(255,255,255,0.4)",
                        borderRadius: 100, padding: "2px 6px",
                      }}>{ACTIVE_TAB_COUNTS[v]}</span>
                    )}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setShowPhotoFilters(true)}
              disabled={view !== "all" || photos.length === 0}
              aria-label="Filter photos"
              style={{
                width: 42,
                minHeight: 42,
                borderRadius: 14,
                border: `1px solid ${view === "all" && photoFilter !== "all" ? `${SIGNAL_GREEN}66` : "rgba(255,255,255,0.1)"}`,
                backgroundColor: view === "all" && photoFilter !== "all" ? `${SIGNAL_GREEN}18` : "rgba(255,255,255,0.055)",
                color: view === "all" && photoFilter !== "all" ? SIGNAL_GREEN : "rgba(255,255,255,0.62)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: view === "all" && photos.length > 0 ? "pointer" : "default",
                opacity: view === "all" && photos.length > 0 ? 1 : 0.34,
                transition: "background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease",
              }}
            >
              <FilterLinesIcon />
            </button>
          </div>
          {showPhotoFilters && (
            <PhotoFilterPopover
              active={photoFilter}
              labels={FILTER_LABELS}
              counts={FILTER_COUNTS}
              onSelect={(filter) => { setPhotoFilter(filter); setShowPhotoFilters(false) }}
              onClose={() => setShowPhotoFilters(false)}
            />
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes lrFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes photoNoticeIn {
          from { opacity: 0; transform: translate(-50%, 10px) scale(0.98); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>

      {photoNotice && (
        <div style={{
          position: "fixed",
          left: "50%",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)",
          transform: "translateX(-50%)",
          zIndex: 90,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderRadius: 999,
          backgroundColor: "rgba(18,22,20,0.94)",
          border: `1px solid ${photoNotice.tone === "favorite" ? "rgba(255,75,139,0.44)" : photoNotice.tone === "gallery" ? `${SIGNAL_GREEN}66` : "rgba(255,255,255,0.18)"}`,
          boxShadow: "0 16px 44px rgba(0,0,0,0.32)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          animation: "photoNoticeIn 180ms ease-out both",
          pointerEvents: "none",
        }}>
          {photoNotice.tone === "gallery" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          ) : photoNotice.tone === "favorite" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#FF4B8B" stroke="#FF4B8B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          ) : null}
          <span style={{ fontSize: 13, fontWeight: 850, color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap" }}>{photoNotice.text}</span>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, padding: "0 24px 32px" }}>
        {loading ? (
          <div style={{ paddingTop: 80, textAlign: "center", color: "rgba(255,255,255,0.2)", ...TYPE.footnote }}>Loadingâ€¦</div>
        ) : activeAlbum ? (
          <DateGroupedGrid
            photos={albumPhotos}
            onView={p => openLightroom(p, albumPhotos)}
            onFlag={flag}
            onGallery={toggleGallery}
            onPlace={openPlacement}
            onShare={handleSharePhoto}
            onRequestDelete={setDeleteConfirmPhoto}
            destinations={destinations}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            emptyTitle={`No photos in this ${albumLabel.singular.toLowerCase()} yet.`}
            emptySub="Tap the camera button to add photos."
            onAdd={openCamera}
            showAddCta
          />
        ) : view === "albums" ? (
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
          <>
          <DateGroupedGrid
            photos={currentPhotos}
            onView={p => openLightroom(p, currentPhotos)}
            onFlag={flag}
            onGallery={toggleGallery}
            onPlace={openPlacement}
            onShare={handleSharePhoto}
            onRequestDelete={setDeleteConfirmPhoto}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            emptyTitle={
              view === "website" ? "No gallery photos yet." :
              photoFilter === "favorites" ? "No favorites yet." :
              photoFilter === "unused" ? "Every photo is being used." :
              "Take your first photo."
            }
            emptySub={
              view === "website" ? "Tap Add to Gallery on any photo customers should see." :
              photoFilter === "favorites" ? "Heart the photos you want to find quickly later." :
              photoFilter === "unused" ? "New photos that are not in your gallery or on a page will show here." :
              "Tap the camera button to take photos or upload from your phone."
            }
            emptyIcon={
              view === "website" ? <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg> :
              photoFilter === "favorites" ? <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> :
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            }
            onAdd={undefined}
            showAddCta={false}
          />
          </>
        )}
      </div>

      {/* Lightroom viewer */}
      {lightroomIndex !== null && lightroomPhotos.length > 0 && (
        <PhotoLightroom
          photos={lightroomPhotos}
          initialIndex={lightroomIndex}
          onClose={() => setLightroomIndex(null)}
          onFlag={flag}
          onGallery={toggleGallery}
          onPlace={openPlacement}
          destinations={destinations}
          onShare={handleSharePhoto}
          onRemove={remove}
        />
      )}

      {/* Add to Site sheet */}
      {placingPhoto && (
        <PlacementSheet
          photo={photos.find(p => p.id === placingPhoto.id) ?? placingPhoto}
          destinations={destinations}
          loading={destinationsLoading}
          placingSlot={placingSlot}
          confirm={placeReassignConfirm}
          onPlace={handlePlace}
          onConfirmReplace={() => {
            if (placeReassignConfirm) {
              const dest = destinations?.find(d => d.slot === placeReassignConfirm.slot)
              if (dest) handlePlace(dest, true)
            }
          }}
          onCancelConfirm={() => setPlaceReassignConfirm(null)}
          onClose={() => { setPlacingPhoto(null); setPlaceReassignConfirm(null) }}
        />
      )}

      {/* Share album sheet */}
      {shareAlbum && (
        <ShareSheet
          album={shareAlbum}
          siteSlug={siteSlug}
          customDomain={customDomain}
          copied={copied}
          onShare={handleShare}
          onClose={() => setShareAlbum(null)}
        />
      )}

      {/* Delete confirm - friendly, not a system warning, since this is the
          one irreversible action available straight from the thumbnail. */}
      {deleteConfirmPhoto && (
        <>
          <div onClick={() => setDeleteConfirmPhoto(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.72)", zIndex: 80, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}/>
          <div style={{ position: "fixed", left: 20, right: 20, top: "50%", transform: "translateY(-50%)", zIndex: 90, borderRadius: 24, backgroundColor: "#161616", border: "1px solid rgba(255,255,255,0.1)", padding: "26px 22px", boxShadow: "0 24px 70px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>🗑️</div>
            <p style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800, color: "white", lineHeight: 1.3 }}>Delete this one?</p>
            <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.5, color: "rgba(255,255,255,0.72)" }}>
              It'll be gone for good, including anywhere it's used on your site or in an album.
            </p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
              <button
                onClick={() => { remove(deleteConfirmPhoto); setDeleteConfirmPhoto(null) }}
                style={{ padding: "15px 0", borderRadius: 14, border: "none", backgroundColor: "rgba(255,70,70,0.16)", color: "#FF6B6B", fontSize: 15, fontWeight: 900, cursor: "pointer" }}
              >
                Yes, delete it
              </button>
              <button
                onClick={() => setDeleteConfirmPhoto(null)}
                style={{ padding: "15px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", backgroundColor: "transparent", color: "rgba(255,255,255,0.75)", fontSize: 15, fontWeight: 800, cursor: "pointer" }}
              >
                Keep it
              </button>
            </div>
          </div>
        </>
      )}

      {/* Upgrade sheet */}
      {showUpgrade && (
        <UpgradeSheet onClose={() => setShowUpgrade(false)} />
      )}

      {/* Add to project — choose how */}
      {showAddOptions && activeAlbum && (
        <AddToAlbumSheet
          albumName={activeAlbum.name}
          onTakePhoto={handleTakePhotoFromSheet}
          onUpload={handleUploadFromSheet}
          onUseExisting={() => { setShowAddOptions(false); setShowExistingPicker(true) }}
          onClose={() => setShowAddOptions(false)}
        />
      )}

      {/* Use an existing Found photo */}
      {showExistingPicker && activeAlbum && (
        <ExistingPhotoPicker
          photos={photos.filter(p => p.album_id !== activeAlbum.id)}
          onClose={() => setShowExistingPicker(false)}
          onConfirm={handleUseExistingConfirm}
        />
      )}

      {/* In-app camera */}
      {showCamera && (
        <CameraSheet
          onClose={handleCameraClose}
          onUploaded={handleCameraUploaded}
          pendingAlbumId={pendingAlbumIdRef.current}
        />
      )}

      {/* Select mode - pick specific photos to download, not just all of them */}
      {selectMode && (
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 75,
          padding: "14px 20px max(env(safe-area-inset-bottom, 0px), 20px)",
          backgroundColor: "rgba(15,18,16,0.94)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <button onClick={exitSelectMode} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", ...TYPE.body, cursor: "pointer", padding: 0 }}>
            Cancel
          </button>
          <span style={{ ...TYPE.footnote, color: "rgba(255,255,255,0.5)" }}>
            {selectedIds.size === 0 ? "Tap photos to select" : `${selectedIds.size} selected`}
          </span>
          <button
            onClick={downloadSelected}
            disabled={selectedIds.size === 0 || downloadingZip}
            style={{
              padding: "12px 20px", borderRadius: 100, border: "none",
              backgroundColor: selectedIds.size === 0 ? "rgba(255,255,255,0.08)" : SIGNAL_GREEN,
              color: selectedIds.size === 0 ? "rgba(255,255,255,0.35)" : FOUND_BLACK,
              ...TYPE.footnote, fontWeight: 800, cursor: selectedIds.size === 0 ? "default" : "pointer",
            }}
          >
            {downloadingZip ? "Zipping..." : "Download"}
          </button>
        </div>
      )}
    </main>
  )
}

// â”€â”€ Lightroom viewer â”€â”€
function PhotoLightroom({ photos, initialIndex, onClose, onFlag, onGallery, onPlace, destinations, onShare, onRemove }: {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
  onFlag: (id: string, field: "for_website" | "for_social", current: boolean) => void
  onGallery: (photo: Photo) => void
  onPlace?: (photo: Photo) => void
  destinations?: PhotoDestination[] | null
  onShare?: (photo: Photo) => void
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

      {/* Media */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {isVideoMedia(photo.url, photo.mime_type) ? (
          <video src={photo.url} controls playsInline style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", userSelect: "none" }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", userSelect: "none", pointerEvents: "none" }} />
        )}

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
        {/* Gallery - public photo gallery */}
        <button onClick={() => onGallery(photo)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            backgroundColor: (photo.in_gallery || (photo.for_website && !photo.website_section)) ? "rgba(50,208,116,0.2)" : "rgba(255,255,255,0.1)",
            border: `2px solid ${(photo.in_gallery || (photo.for_website && !photo.website_section)) ? "rgba(50,208,116,0.5)" : "rgba(255,255,255,0.14)"}`,
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.18s ease",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24"
              fill="none"
              stroke={(photo.in_gallery || (photo.for_website && !photo.website_section)) ? SIGNAL_GREEN : "rgba(255,255,255,0.75)"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: (photo.in_gallery || (photo.for_website && !photo.website_section)) ? SIGNAL_GREEN : "rgba(255,255,255,0.5)", letterSpacing: "0.02em" }}>
            {(photo.in_gallery || (photo.for_website && !photo.website_section)) ? "In Gallery" : "Gallery"}
          </span>
        </button>

        {/* Heart - private favorite */}
        <button onClick={() => onFlag(photo.id, "for_social", photo.for_social)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            backgroundColor: photo.for_social ? "rgba(255,75,139,0.28)" : "rgba(255,255,255,0.1)",
            border: `2px solid ${photo.for_social ? "rgba(255,75,139,0.55)" : "rgba(255,255,255,0.14)"}`,
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.18s ease",
          }}>
            <svg width="25" height="25" viewBox="0 0 24 24"
              fill={photo.for_social ? "#FF4B8B" : "none"}
              stroke={photo.for_social ? "#FF4B8B" : "rgba(255,255,255,0.75)"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </div>
          <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: photo.for_social ? "#FF4B8B" : "rgba(255,255,255,0.5)", letterSpacing: "0.02em" }}>Favorite</span>
        </button>

        {/* Add to Site */}
        {onPlace && (() => {
          const active = Boolean(photo.website_section && photo.website_section !== "announcement")
          const activeColor = active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)"
          const label = active ? `On ${photoSitePlacementLabel(photo, destinations) ?? "page"}` : "Use on Page"
          return (
            <button onClick={() => onPlace(photo)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                backgroundColor: active ? "rgba(0,0,0,0.48)" : "rgba(255,255,255,0.1)",
                border: `2px solid ${active ? "rgba(50,208,116,0.5)" : "rgba(255,255,255,0.14)"}`,
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.18s ease",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={activeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2"/><rect x="7" y="9" width="7" height="6" rx="1" fill={activeColor} stroke="none"/>
                </svg>
              </div>
              <span style={{ maxWidth: 86, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.6875rem", fontWeight: 700, color: active ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.5)", letterSpacing: "0.02em" }}>{label}</span>
            </button>
          )
        })()}

        {/* Share */}
        {onShare && (
          <button onClick={() => onShare(photo)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
            background: "none", border: "none", cursor: "pointer", padding: 0,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.1)",
              border: "2px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </div>
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.02em" }}>Share</span>
          </button>
        )}

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

// â”€â”€ Date-grouped photo grid â”€â”€
function DateGroupedGrid({
  photos, onView, onFlag, onGallery, onPlace, destinations, onShare, onRequestDelete, selectMode, selectedIds, onToggleSelect, emptyTitle, emptySub, emptyIcon, onAdd, showAddCta
}: {
  photos: Photo[]
  onView: (photo: Photo) => void
  onFlag?: (id: string, field: "for_website" | "for_social", current: boolean) => void
  onGallery?: (photo: Photo) => void
  onPlace?: (photo: Photo) => void
  destinations?: PhotoDestination[] | null
  onShare?: (photo: Photo) => void
  onRequestDelete?: (photo: Photo) => void
  selectMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
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
              <PhotoCard
                key={photo.id}
                photo={photo}
                onView={onView}
                onFlag={onFlag}
                onGallery={onGallery}
                onPlace={onPlace}
                destinations={destinations}
                onShare={onShare}
                onRequestDelete={onRequestDelete}
                selectMode={selectMode}
                selected={selectedIds?.has(photo.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Albums tab
// â”€â”€ Album title editor (inside album detail header) â”€â”€
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
            placeholder={`${albumLabel.singular} nameâ€¦`}
            style={{ width: "100%", padding: "13px 16px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 12 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onHideNew} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button onClick={onCreate} disabled={!newName.trim() || saving} style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", backgroundColor: newName.trim() ? SIGNAL_GREEN : "rgba(255,255,255,0.08)", color: newName.trim() ? FOUND_BLACK : "rgba(255,255,255,0.3)", fontSize: "0.8125rem", fontWeight: 700, cursor: newName.trim() ? "pointer" : "default" }}>
              {saving ? "Creatingâ€¦" : `Create ${albumLabel.singular}`}
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

// â”€â”€ Photo card â€” tap to open lightroom â”€â”€
function PhotoCard({ photo, onView, onFlag, onGallery, onPlace, destinations, onShare, onRequestDelete, selectMode, selected, onToggleSelect }: {
  photo: Photo
  onView: (photo: Photo) => void
  onFlag?: (id: string, field: "for_website" | "for_social", current: boolean) => void
  onGallery?: (photo: Photo) => void
  onPlace?: (photo: Photo) => void
  destinations?: PhotoDestination[] | null
  onShare?: (photo: Photo) => void
  onRequestDelete?: (photo: Photo) => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  const isVideo = isVideoMedia(photo.url, photo.mime_type)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }
  function handlePointerDown(e: React.PointerEvent) {
    if (selectMode || !onPlace) return
    longPressFired.current = false
    pointerStart.current = { x: e.clientX, y: e.clientY }
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      onPlace(photo)
    }, 500)
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!pointerStart.current) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    if (Math.sqrt(dx * dx + dy * dy) > 10) clearLongPress()
  }

  return (
    <div
      style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "1", backgroundColor: isVideo ? "#111813" : "transparent", border: isVideo ? "1px solid rgba(255,255,255,0.08)" : "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
    >
      <button
        onClick={() => {
          if (longPressFired.current) { longPressFired.current = false; return }
          selectMode ? onToggleSelect?.(photo.id) : onView(photo)
        }}
        aria-label={isVideo ? "Open business video" : "Open business photo"}
        onContextMenu={(e) => e.preventDefault()}
        style={{ width: "100%", height: "100%", padding: 0, border: "none", background: "transparent", cursor: "pointer", display: "block", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
      >
        {isVideo ? (
          <VideoPreviewTile src={photo.url} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt="Business photo"
            onContextMenu={(e) => e.preventDefault()}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
          />
        )}
      </button>
      {selectMode && (
        <>
          <div style={{ position: "absolute", inset: 0, backgroundColor: selected ? `${SIGNAL_GREEN}40` : "rgba(0,0,0,0.15)", pointerEvents: "none", transition: "background-color 0.12s ease" }} />
          <div style={{
            position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%",
            border: `2px solid ${selected ? SIGNAL_GREEN : "rgba(255,255,255,0.7)"}`,
            backgroundColor: selected ? SIGNAL_GREEN : "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
          }}>
            {selected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
          </div>
        </>
      )}
      {isVideo && (
        <div style={{ position: "absolute", right: 8, top: 8, padding: "5px 7px", borderRadius: 999, backgroundColor: "rgba(0,0,0,0.72)", color: "white", fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", pointerEvents: "none" }}>VIDEO</div>
      )}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: isVideo ? "inset 0 0 0 1px rgba(255,255,255,0.05)" : "none" }} />
      {/* Favorite / Gallery - always visible, tappable straight from the thumbnail
          now instead of only inside the enlarged viewer. Hidden in select
          mode so a tap always means "select," not "toggle a flag." */}
      {(onFlag || onGallery) && !selectMode && (
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 6 }}>
          {onGallery && (() => {
            const inGallery = photo.in_gallery || (photo.for_website && !photo.website_section)
            return (
          <button
            onClick={(e) => { e.stopPropagation(); onGallery(photo) }}
            aria-label={inGallery ? "Remove from gallery" : "Add to gallery"}
            style={{ width: 31, height: 31, borderRadius: 10, border: "none", padding: 0, cursor: "pointer", backgroundColor: "rgba(0,0,0,0.58)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={inGallery ? SIGNAL_GREEN : "rgba(255,255,255,0.76)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
            )
          })()}
          {onFlag && (
          <button
            onClick={(e) => { e.stopPropagation(); onFlag(photo.id, "for_social", photo.for_social) }}
            aria-label={photo.for_social ? "Remove from favorites" : "Add to favorites"}
            style={{ width: 31, height: 31, borderRadius: 10, border: "none", padding: 0, cursor: "pointer", backgroundColor: "rgba(0,0,0,0.58)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={photo.for_social ? "#FF4B8B" : "none"} stroke={photo.for_social ? "#FF4B8B" : "rgba(255,255,255,0.76)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
          )}
        </div>
      )}
      {onPlace && !selectMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onPlace(photo) }}
          aria-label={photo.website_section && photo.website_section !== "announcement" ? `Change page photo: ${photoSitePlacementLabel(photo, destinations) ?? "page"}` : "Use on page"}
          style={{
            position: "absolute", bottom: 8, left: 8,
            height: 23, maxWidth: "calc(100% - 48px)", padding: "0 8px", borderRadius: 7,
            border: photo.website_section && photo.website_section !== "announcement" ? `1px solid ${SIGNAL_GREEN}88` : "none", cursor: "pointer",
            backgroundColor: photo.website_section && photo.website_section !== "announcement" ? "rgba(0,0,0,0.68)" : "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", gap: 4, justifyContent: "center",
          }}
        >
          {(() => {
            const active = Boolean(photo.website_section && photo.website_section !== "announcement")
            const activeColor = active ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.85)"
            const label = active ? (photoSitePlacementLabel(photo, destinations) ?? "On page") : "Use on page"
            return (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={activeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2"/>
                  <rect x="6.5" y="8" width="7" height="6" rx="1" fill={activeColor} stroke="none"/>
                </svg>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 9, fontWeight: 900, letterSpacing: "0.02em", color: activeColor, textTransform: "uppercase" }}>{label}</span>
              </>
            )
          })()}
        </button>
      )}
      {onShare && !selectMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onShare(photo) }}
          aria-label="Share photo"
          style={{
            position: "absolute", top: isVideo ? 36 : 8, right: 8,
            width: 26, height: 26, borderRadius: 8, border: "none", padding: 0, cursor: "pointer",
            backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
        </button>
      )}
      {onRequestDelete && !selectMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onRequestDelete(photo) }}
          aria-label="Delete photo"
          style={{ position: "absolute", bottom: 8, right: 8, width: 26, height: 26, borderRadius: 8, border: "none", padding: 0, cursor: "pointer", backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,120,120,0.9)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      )}
    </div>
  )
}

function FilterLinesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M7.5 12h9" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M10 17h4" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  )
}

function PhotoFilterPopover({ active, labels, counts, onSelect, onClose }: {
  active: PhotoFilter
  labels: Record<PhotoFilter, string>
  counts: Record<PhotoFilter, number>
  onSelect: (filter: PhotoFilter) => void
  onClose: () => void
}) {
  const descriptions: Record<PhotoFilter, string> = {
    all: "Everything in your photo library.",
    favorites: "Your best shots, saved for quick access.",
    unused: "Photos not in your gallery or on a page.",
  }
  const icons: Record<PhotoFilter, React.ReactNode> = {
    all: <FilterLinesIcon />,
    favorites: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF4B8B" stroke="#FF4B8B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
    unused: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "transparent",
          zIndex: 31,
        }}
      />
      <div style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 24,
        width: "min(356px, calc(100vw - 48px))",
        zIndex: 32,
        backgroundColor: "rgba(246,248,246,0.9)",
        borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.62)",
        padding: 12,
        boxShadow: "0 24px 80px rgba(0,0,0,0.38)",
        backdropFilter: "blur(34px) saturate(1.35)",
        WebkitBackdropFilter: "blur(34px) saturate(1.35)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, position: "relative" }}>
          {(["all", "favorites", "unused"] as PhotoFilter[]).map(filter => {
            const selected = active === filter
            return (
              <button
                key={filter}
                onClick={() => onSelect(filter)}
                style={{
                  minHeight: 74,
                  borderRadius: 20,
                  border: "none",
                  backgroundColor: selected ? "rgba(50,208,116,0.16)" : "transparent",
                  color: "#0A0C0B",
                  cursor: "pointer",
                  padding: "0 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  textAlign: "left",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                  <span style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    backgroundColor: "rgba(255,255,255,0.72)",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
                    color: selected ? SIGNAL_GREEN : "rgba(10,12,11,0.62)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {icons[filter]}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 20, fontWeight: 780, color: selected ? "#0E6D37" : "#101211" }}>{labels[filter]}</span>
                    <span style={{ display: "block", marginTop: 2, fontSize: 13, lineHeight: 1.28, fontWeight: 560, color: "rgba(10,12,11,0.52)" }}>{descriptions[filter]}</span>
                  </span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 17, fontWeight: 760, color: selected ? "#0E6D37" : "rgba(10,12,11,0.42)" }}>{counts[filter]}</span>
                  {selected && (
                    <span style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Small glyphs for destination rows ──
function DestinationGlyph({ icon, color }: { icon: PhotoDestination["icon"]; color: string }) {
  const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (icon) {
    case "home":
      return <svg {...common}><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>
    case "person":
      return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
    case "wrench":
      return <svg {...common}><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94z"/></svg>
    case "phone":
      return <svg {...common}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg>
    case "tag":
      return <svg {...common}><path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2.5 12.5V4a2 2 0 012-2h8.5l7.59 7.59a2 2 0 010 2.82z"/><circle cx="7.5" cy="7.5" r="1" fill={color} stroke="none"/></svg>
    case "star":
      return <svg {...common} fill={color}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case "grid":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
  }
}

// ── One destination row in the placement sheet ──
function DestinationRow({ dest, photo, placingSlot, onPlace }: {
  dest: PhotoDestination
  photo: Photo
  placingSlot: string | null
  onPlace: (destination: PhotoDestination) => void
}) {
  const isGallery = Boolean(dest.toggle)
  const active = isGallery ? Boolean(photo.in_gallery) : photo.website_section === dest.slot
  const isPlacing = placingSlot === dest.slot
  const iconColor = active ? SIGNAL_GREEN : "rgba(255,255,255,0.55)"

  return (
    <button
      onClick={() => onPlace(dest)}
      disabled={isPlacing}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        padding: "14px 16px", borderRadius: 14, textAlign: "left", cursor: isPlacing ? "default" : "pointer",
        border: isGallery
          ? `1px dashed ${active ? SIGNAL_GREEN : "rgba(255,255,255,0.28)"}`
          : active ? `1px solid ${SIGNAL_GREEN}55` : "1px solid rgba(255,255,255,0.08)",
        backgroundColor: isGallery ? "transparent" : active ? `${SIGNAL_GREEN}14` : "rgba(255,255,255,0.04)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <DestinationGlyph icon={dest.icon} color={iconColor} />
        <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
          <span style={{ ...TYPE.subhead, fontWeight: 600, color: "white" }}>{dest.label}</span>
        </span>
      </span>
      {isPlacing ? (
        <Spinner size={16} color={SIGNAL_GREEN} />
      ) : isGallery ? (
        active ? (
          <span style={{ ...TYPE.footnote, fontWeight: 800, color: SIGNAL_GREEN }}>Added</span>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        )
      ) : active ? (
        <span style={{ ...TYPE.footnote, fontWeight: 800, color: SIGNAL_GREEN }}>Current</span>
      ) : null}
    </button>
  )
}

// ── Placement sheet — "Add to Site" destination picker ──
function PlacementSheet({ photo, destinations, loading, placingSlot, confirm, onPlace, onConfirmReplace, onCancelConfirm, onClose }: {
  photo: Photo
  destinations: PhotoDestination[] | null
  loading: boolean
  placingSlot: string | null
  confirm: { slot: string; label: string } | null
  onPlace: (destination: PhotoDestination) => void
  onConfirmReplace: () => void
  onCancelConfirm: () => void
  onClose: () => void
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  function handleClose() {
    setOpen(false)
    setTimeout(onClose, 320)
  }

  return (
    <>
      <div onClick={handleClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.72)", zIndex: 90, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", opacity: open ? 1 : 0, transition: "opacity 320ms ease" }} />
      <div className={`placement-sheet${open ? " placement-sheet-open" : ""}`} style={{ padding: "18px 20px calc(env(safe-area-inset-bottom, 0px) + 26px)" }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)", margin: "0 auto 18px" }} />
        <div style={{ marginBottom: 18 }}>
          <div style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 14 }}>
            {isVideoMedia(photo.url, photo.mime_type) ? (
              <VideoPreviewTile src={photo.url} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, ...TYPE.caption, color: `${SIGNAL_GREEN}cc` }}>ADD TO SITE</p>
            <h3 style={{ margin: 0, ...TYPE.title, color: "white" }}>Where do you want this photo?</h3>
          </div>
        </div>

        {confirm ? (() => {
          const submitting = placingSlot === confirm.slot
          return (
            <div style={{ borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "18px 16px" }}>
              <p style={{ margin: "0 0 16px", ...TYPE.subhead, fontWeight: 400, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                <strong style={{ color: "white" }}>{confirm.label}</strong> already has a photo. Replace it with this one?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={onConfirmReplace} disabled={submitting} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "14px 0", borderRadius: 14, border: "none",
                  backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK, fontSize: 15, fontWeight: 800,
                  cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.75 : 1,
                }}>
                  {submitting && <Spinner size={16} color={FOUND_BLACK} />}
                  {submitting ? "Replacing..." : "Replace it"}
                </button>
                <button onClick={onCancelConfirm} disabled={submitting} style={{ padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", backgroundColor: "transparent", color: "rgba(255,255,255,0.75)", fontSize: 15, fontWeight: 700, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.5 : 1 }}>Cancel</button>
              </div>
            </div>
          )
        })() : loading || !destinations ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: "rgba(255,255,255,0.3)", ...TYPE.footnote }}>Loading...</div>
        ) : (() => {
          const homeDests = destinations.filter(d => d.group === "home")
          const otherDests = destinations.filter(d => d.group !== "home")
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {homeDests.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
                    <DestinationGlyph icon="home" color="rgba(255,255,255,0.45)" />
                    <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Home Page</span>
                  </div>
                  {homeDests.map(dest => (
                    <DestinationRow key={dest.slot} dest={dest} photo={photo} placingSlot={placingSlot} onPlace={onPlace} />
                  ))}
                </div>
              )}
              {otherDests.map(dest => (
                <DestinationRow key={dest.slot} dest={dest} photo={photo} placingSlot={placingSlot} onPlace={onPlace} />
              ))}
            </div>
          )
        })()}
      </div>
    </>
  )
}

function VideoPreviewTile({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "radial-gradient(circle at 50% 35%, rgba(45,210,117,0.18), rgba(11,17,13,0.92) 58%, #070907 100%)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <video
        src={src}
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
        onLoadedData={() => setLoaded(true)}
        onCanPlay={() => setLoaded(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: loaded ? 1 : 0.18, transition: "opacity 180ms ease" }}
      />
      <div style={{ position: "absolute", inset: 0, background: loaded ? "linear-gradient(to top, rgba(0,0,0,0.18), transparent 55%)" : "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0))", pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 42, height: 42, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.58)", border: "1px solid rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
      </div>
    </div>
  )
}
// â”€â”€ Upgrade sheet â”€â”€
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
          {["Share project galleries with clients", "Branded gallery link â€” your colors", "Client sees only the photos you choose"].map(f => (
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
          Upgrade to Pro â†’
        </a>
        <button onClick={onClose} style={{ display: "block", width: "100%", marginTop: 12, padding: "13px 0", background: "none", border: "none", cursor: "pointer", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
          Maybe later
        </button>
      </div>
    </>
  )
}

// â”€â”€ Add to project sheet â”€â”€
function AddToAlbumSheet({ albumName, onTakePhoto, onUpload, onUseExisting, onClose }: {
  albumName: string
  onTakePhoto: () => void
  onUpload: () => void
  onUseExisting: () => void
  onClose: () => void
}) {
  const options = [
    {
      label: "Take Photo",
      sub: "Use your camera",
      onClick: onTakePhoto,
      primary: true,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
        </svg>
      ),
    },
    {
      label: "Choose from Library",
      sub: "Upload from your device",
      onClick: onUpload,
      primary: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
        </svg>
      ),
    },
    {
      label: "Use Existing Photo",
      sub: "Pick from photos already in Found",
      onClick: onUseExisting,
      primary: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
        </svg>
      ),
    },
  ]

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 60, backdropFilter: "blur(4px)" }}/>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70, backgroundColor: "#101411", borderTop: "1px solid rgba(255,255,255,0.1)", borderRadius: "28px 28px 0 0", padding: "14px 24px calc(env(safe-area-inset-bottom, 0px) + 32px)" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 22px" }}/>
        <h3 style={{ margin: "0 0 6px", ...TYPE.title, color: "white" }}>Add to {albumName}</h3>
        <p style={{ margin: "0 0 22px", ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
          Choose how you&apos;d like to add photos or video.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map(opt => (
            <button key={opt.label} onClick={opt.onClick} style={{
              display: "flex", alignItems: "center", gap: 14, width: "100%",
              padding: "14px 16px", borderRadius: 16, cursor: "pointer", textAlign: "left",
              backgroundColor: opt.primary ? SIGNAL_GREEN : "rgba(255,255,255,0.06)",
              border: opt.primary ? "none" : "1px solid rgba(255,255,255,0.1)",
              boxShadow: opt.primary ? `0 0 24px ${SIGNAL_GREEN}33` : "none",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: opt.primary ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.06)",
              }}>
                {opt.icon}
              </div>
              <div>
                <div style={{ ...TYPE.subhead, fontWeight: 700, color: opt.primary ? FOUND_BLACK : "white" }}>{opt.label}</div>
                <div style={{ ...TYPE.footnote, fontWeight: 400, color: opt.primary ? "rgba(0,0,0,0.6)" : `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{opt.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// â”€â”€ Existing photo picker â”€â”€
function ExistingPhotoPicker({ photos, onClose, onConfirm }: {
  photos: Photo[]
  onClose: () => void
  onConfirm: (ids: string[]) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, backgroundColor: "#0B0F0D", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "white", ...TYPE.body, cursor: "pointer" }}>Cancel</button>
        <h3 style={{ margin: 0, ...TYPE.subhead, fontWeight: 700, color: "white" }}>Use Existing Photo</h3>
        <button
          onClick={() => onConfirm(Array.from(selected))}
          disabled={selected.size === 0}
          style={{ background: "none", border: "none", color: selected.size ? SIGNAL_GREEN : "rgba(255,255,255,0.25)", ...TYPE.body, fontWeight: 700, cursor: selected.size ? "pointer" : "default" }}
        >
          Add{selected.size ? ` (${selected.size})` : ""}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 32px" }}>
        {photos.length === 0 ? (
          <div style={{ paddingTop: 80, textAlign: "center", ...TYPE.footnote, color: "rgba(255,255,255,0.3)" }}>
            No other photos yet. Take or upload one instead.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
            {photos.map(p => {
              const isSelected = selected.has(p.id)
              return (
                <button key={p.id} onClick={() => toggle(p.id)} style={{ position: "relative", aspectRatio: "1", padding: 0, border: "none", borderRadius: 8, overflow: "hidden", cursor: "pointer" }}>
                  {isVideoMedia(p.url, p.mime_type) ? (
                    <video src={p.url} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  )}
                  <div style={{ position: "absolute", inset: 0, backgroundColor: isSelected ? `${SIGNAL_GREEN}48` : "transparent", transition: "background-color 0.12s ease" }} />
                  <div style={{
                    position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%",
                    border: `2px solid ${isSelected ? SIGNAL_GREEN : "rgba(255,255,255,0.6)"}`,
                    backgroundColor: isSelected ? SIGNAL_GREEN : "rgba(0,0,0,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isSelected && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// â”€â”€ Share sheet â”€â”€
function ShareSheet({ album, siteSlug, customDomain, copied, onShare, onClose }: {
  album: Album
  siteSlug: string
  customDomain: string | null
  copied: boolean
  onShare: (album: Album) => void
  onClose: () => void
}) {
  const url = siteSlug ? `${getPublicSiteOrigin(siteSlug, customDomain)}/gallery/${album.slug}` : null

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
          {copied ? "Link Copied âœ“" : "Copy & Share Link"}
        </button>
      </div>
    </>
  )
}
