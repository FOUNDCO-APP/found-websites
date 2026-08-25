"use client"

import React, { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { TYPE, TEXT_OPACITY, GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK, albumLabelFor } from "@/lib/dashboard/typography"
import CameraSheet, { type UploadedPhoto } from "@/components/dashboard/CameraSheet"
import { isVideoMedia } from "@/lib/mediaKind"
import { uploadDashboardMedia, ensureFreshSession } from "@/lib/uploadDashboardMedia"
import { getPublicSiteOrigin } from "@/lib/siteUrl"
import { normalizeAddressText } from "@/lib/addressNormalization"
import { getPhotoDestinationOptions, placePhoto, removeFromGallery, type PhotoDestination } from "./placementActions"
import Spinner from "@/components/Spinner"
import DashboardLaunchLoader from "@/components/dashboard/DashboardLaunchLoader"
import { useUploadStatus } from "@/components/dashboard/UploadStatusProvider"

type Photo = {
  id: string
  url: string
  for_website: boolean
  for_social: boolean
  website_section: string | null
  in_gallery: boolean
  album_id: string | null
  note?: string | null
  created_at: string
  media_type?: "photo" | "video"
  mime_type?: string | null
}

type Album = {
  id: string
  name: string
  slug: string
  album_type?: "album" | "job" | null
  customer_name?: string | null
  customer_phone?: string | null
  customer_email?: string | null
  service_address?: string | null
  cover_photo_id?: string | null
  cover_url?: string | null
  notes?: string | null
  notes_overview?: string | null
  notes_materials?: string | null
  notes_measurements?: string | null
  notes_labor?: string | null
  notes_follow_up?: string | null
  show_address_public?: boolean | null
  show_on_website_gallery?: boolean | null
  created_at: string
}

const MAX_UPLOAD_BATCH = 12
const UPLOAD_CONCURRENCY = 3

type JobEstimate = {
  id: string
  estimate_number?: number | null
  title: string | null
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired"
  total: number
  job_id?: string | null
}

const ESTIMATE_STATUS_COLORS: Record<string, string> = {
  draft: "rgba(255,255,255,0.48)",
  sent: "#0A84FF",
  viewed: "#FFD60A",
  accepted: "#30D158",
  declined: "#FF453A",
  expired: "rgba(255,255,255,0.2)",
}

const ESTIMATE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", viewed: "Viewed",
  accepted: "Accepted", declined: "Declined", expired: "Expired",
}

type View = "all" | "website" | "albums"
type PhotoFilter = "all" | "favorites" | "unused"
type PhotoNotice = { text: string; tone: "gallery" | "favorite" | "page" | "delete" }
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

function albumContextLine(album: Album) {
  return [album.customer_name, normalizeAddressText(album.service_address)].filter(Boolean).join(" · ")
}

function toDisplayTitle(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase())
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
}

function albumDisplayName(album: Album, usesJobs?: boolean) {
  return usesJobs || album.album_type === "job" ? toDisplayTitle(album.name) : album.name
}

function albumPublicSlug(album: Album, usesJobs?: boolean) {
  return toSlug(albumDisplayName(album, usesJobs)) || album.slug
}

type WorkNotesCopy = {
  label: string
  helper: string
  sections: WorkNoteSectionCopy[]
}

type WorkNoteKey = "notes_overview" | "notes_materials" | "notes_measurements" | "notes_labor" | "notes_follow_up"

type WorkNoteSectionCopy = {
  key: WorkNoteKey
  label: string
  placeholder: string
}

const BASE_NOTE_SECTIONS: WorkNoteSectionCopy[] = [
  { key: "notes_overview", label: "Overview", placeholder: "What needs to happen?" },
  { key: "notes_materials", label: "Materials", placeholder: "Materials, supplies, products, or items involved..." },
  { key: "notes_measurements", label: "Measurements", placeholder: "Sizes, counts, quantities, square footage, timing, or other numbers..." },
  { key: "notes_labor", label: "Labor Notes", placeholder: "Difficulty, setup, prep work, access, special tools, or effort..." },
  { key: "notes_follow_up", label: "Follow-Up", placeholder: "Next steps, customer questions, reminders, or things to confirm..." },
]

function noteSections(sections: Partial<Record<WorkNoteKey, Omit<WorkNoteSectionCopy, "key">>>): WorkNoteSectionCopy[] {
  return BASE_NOTE_SECTIONS.map(section => ({ ...section, ...sections[section.key] }))
}

function normalizeIndustryKey(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[\s-]+/g, "_")
}

function workNotesCopyFor(industry: string | null | undefined, subIndustry: string | null | undefined, albumSingular: string): WorkNotesCopy {
  const n = normalizeIndustryKey(industry)
  const sub = normalizeIndustryKey(subIndustry)
  const fallbackName = albumSingular && albumSingular !== "Album" ? albumSingular : "Work"

  if (/balloon|event_design|party|wedding|floral|decor/.test(sub)) {
    return {
      label: "Event Design Notes",
      helper: "Capture the theme, colors, timing, setup needs, and anything promised to the customer.",
      sections: noteSections({
        notes_overview: { label: "Event Vision", placeholder: "What is the customer picturing for this event?" },
        notes_materials: { label: "Colors & Theme", placeholder: "Colors, theme, inspiration, design direction..." },
        notes_measurements: { label: "Setup Details", placeholder: "Venue, install time, dimensions, ceiling height, access..." },
        notes_labor: { label: "Materials", placeholder: "Balloons, stands, florals, signage, weights, supplies..." },
        notes_follow_up: { label: "Follow-Up", placeholder: "Questions to confirm, pickup, teardown, or customer reminders..." },
      }),
    }
  }

  if (["home_services", "landscaping", "home_property", "audio_visual", "automotive", "cleaning", "tech_repair", "print_signage"].includes(n)) {
    return {
      label: "Scope & Materials",
      helper: "Capture what needs to be done, parts, materials, measurements, and labor notes.",
      sections: noteSections({
        notes_overview: { label: "Scope", placeholder: "What needs to be done?" },
        notes_materials: { label: "Materials", placeholder: "Cabinets, tile, fixtures, paint, parts, supplies..." },
        notes_measurements: { label: "Measurements", placeholder: "Sizes, counts, square footage, linear feet, quantities..." },
        notes_labor: { label: "Labor Notes", placeholder: "Difficulty, access, demo, prep work, special tools..." },
        notes_follow_up: { label: "Follow-Up", placeholder: "What needs to happen next?" },
      }),
    }
  }

  if (["food", "home_based_food"].includes(n)) {
    return {
      label: "Order Notes",
      helper: "Capture customer requests, timing, quantities, prep notes, and delivery or pickup details.",
      sections: noteSections({
        notes_overview: { label: "Order Details", placeholder: "What is the customer ordering or requesting?" },
        notes_materials: { label: "Items & Quantities", placeholder: "Items, quantities, portions, packages, add-ons..." },
        notes_measurements: { label: "Timing", placeholder: "Pickup, delivery, prep time, event time, deadline..." },
        notes_labor: { label: "Prep Notes", placeholder: "Kitchen notes, packaging, dietary needs, special handling..." },
        notes_follow_up: { label: "Follow-Up", placeholder: "Questions to confirm, reminders, delivery details..." },
      }),
    }
  }

  if (["events", "music_performance"].includes(n)) {
    return {
      label: "Event Notes",
      helper: "Capture timing, location, setup needs, customer requests, and day-of details.",
      sections: noteSections({
        notes_overview: { label: "Event Details", placeholder: "What is happening and what did the customer request?" },
        notes_materials: { label: "Needs & Gear", placeholder: "Equipment, supplies, instruments, decor, rentals..." },
        notes_measurements: { label: "Timing & Location", placeholder: "Venue, schedule, arrival time, setup window..." },
        notes_labor: { label: "Setup Notes", placeholder: "Access, load-in, crew needs, sound check, special setup..." },
        notes_follow_up: { label: "Follow-Up", placeholder: "People to contact, details to confirm, next steps..." },
      }),
    }
  }

  if (["beauty", "wellness", "fitness", "healthcare", "childcare"].includes(n)) {
    return {
      label: "Appointment Notes",
      helper: "Capture preferences, service details, preparation notes, and follow-up items.",
      sections: noteSections({
        notes_overview: { label: "Service Notes", placeholder: "What service is being done and what matters most?" },
        notes_materials: { label: "Products Used", placeholder: "Products, tools, supplies, formulas, equipment..." },
        notes_measurements: { label: "Timing", placeholder: "Appointment length, frequency, schedule notes..." },
        notes_labor: { label: "Preferences", placeholder: "Comfort notes, pressure, style, sensitivities, setup..." },
        notes_follow_up: { label: "Follow-Up", placeholder: "Aftercare, rebooking, reminders, next steps..." },
      }),
    }
  }

  if (n === "real_estate") {
    return {
      label: "Property Notes",
      helper: "Capture property details, client priorities, showing notes, and next steps.",
      sections: noteSections({
        notes_overview: { label: "Property Details", placeholder: "What matters about this property or client?" },
        notes_materials: { label: "Features", placeholder: "Rooms, finishes, upgrades, issues, standout details..." },
        notes_measurements: { label: "Numbers", placeholder: "Beds, baths, square footage, price, dates, offer notes..." },
        notes_labor: { label: "Showing Notes", placeholder: "Access, condition, staging, repairs, client reactions..." },
        notes_follow_up: { label: "Follow-Up", placeholder: "Next steps, documents, calls, reminders..." },
      }),
    }
  }

  if (n === "creative_services" || /photo|video|portrait|brand|design|creative/.test(sub)) {
    return {
      label: /photo|video|portrait/.test(sub) ? "Shoot Notes" : "Creative Notes",
      helper: "Capture the brief, shot list, preferences, deadlines, and delivery details.",
      sections: noteSections({
        notes_overview: { label: "Creative Brief", placeholder: "What is the goal or direction?" },
        notes_materials: { label: /photo|video|portrait/.test(sub) ? "Shot List" : "Assets", placeholder: /photo|video|portrait/.test(sub) ? "Must-have shots, people, products, moments..." : "Assets, references, copy, files, examples..." },
        notes_measurements: { label: "Location & Timing", placeholder: "Location, schedule, deadline, delivery date..." },
        notes_labor: { label: "Production Notes", placeholder: "Lighting, setup, edits, revisions, complexity..." },
        notes_follow_up: { label: "Follow-Up", placeholder: "Approvals, files needed, next steps..." },
      }),
    }
  }

  if (["retail", "makers_crafts"].includes(n)) {
    return {
      label: "Order Notes",
      helper: "Capture custom requests, sizing, quantities, fulfillment notes, and delivery details.",
      sections: noteSections({
        notes_overview: { label: "Order Details", placeholder: "What is the customer buying or requesting?" },
        notes_materials: { label: "Products", placeholder: "Products, materials, colors, sizes, options..." },
        notes_measurements: { label: "Quantities & Sizing", placeholder: "Counts, sizes, dimensions, variants..." },
        notes_labor: { label: "Fulfillment Notes", placeholder: "Custom work, packaging, shipping, pickup, prep..." },
        notes_follow_up: { label: "Follow-Up", placeholder: "Questions, reminders, delivery details, next steps..." },
      }),
    }
  }

  if (n === "education") {
    return {
      label: "Session Notes",
      helper: "Capture goals, progress, assignments, and follow-up items.",
      sections: noteSections({
        notes_overview: { label: "Session Goals", placeholder: "What should this session accomplish?" },
        notes_materials: { label: "Materials", placeholder: "Lesson materials, links, books, resources, tools..." },
        notes_measurements: { label: "Progress", placeholder: "Scores, milestones, levels, dates, time spent..." },
        notes_labor: { label: "Teaching Notes", placeholder: "What worked, what was hard, what to repeat..." },
        notes_follow_up: { label: "Follow-Up", placeholder: "Homework, reminders, next session plan..." },
      }),
    }
  }

  if (n === "professional_services") {
    return {
      label: "Client Notes",
      helper: "Capture client goals, important context, decisions, and next steps.",
      sections: noteSections({
        notes_overview: { label: "Client Goals", placeholder: "What is the client trying to accomplish?" },
        notes_materials: { label: "Important Details", placeholder: "Documents, links, assets, constraints, context..." },
        notes_measurements: { label: "Dates & Numbers", placeholder: "Deadlines, budget, quantities, milestones..." },
        notes_labor: { label: "Work Notes", placeholder: "Decisions, complexity, research, work needed..." },
        notes_follow_up: { label: "Follow-Up", placeholder: "Next steps, reminders, questions, approvals..." },
      }),
    }
  }

  return {
    label: `${fallbackName} Notes`,
    helper: "Capture the details that help you prepare, quote, and follow up.",
    sections: BASE_NOTE_SECTIONS,
  }
}

async function fetchEstimateSnapshot(): Promise<{ estimates: JobEstimate[] | null; error: string | null }> {
  try {
    const res = await fetch("/api/estimates", { cache: "no-store" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        estimates: null,
        error: data.error || "Estimate access did not load for this account.",
      }
    }
    return { estimates: data.estimates ?? [], error: null }
  } catch {
    return { estimates: null, error: "Estimate access could not be checked. Refresh and try again." }
  }
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
  const uploadStatus = useUploadStatus()
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null)
  const [showNewAlbum, setShowNewAlbum] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState("")
  const [savingAlbum, setSavingAlbum] = useState(false)
  const [shareAlbum, setShareAlbum] = useState<Album | null>(null)
  const [deleteConfirmPhoto, setDeleteConfirmPhoto] = useState<Photo | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [deletingSelected, setDeletingSelected] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [copied, setCopied] = useState(false)
  const [siteSlug, setSiteSlug] = useState("")
  const [industry, setIndustry] = useState<string | null>(null)
  const [subIndustry, setSubIndustry] = useState<string | null>(null)
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
  const [newJobCustomerName, setNewJobCustomerName] = useState("")
  const [newJobAddress, setNewJobAddress] = useState("")
  const [newJobPhone, setNewJobPhone] = useState("")
  const [newJobEmail, setNewJobEmail] = useState("")
  const [estimates, setEstimates] = useState<JobEstimate[]>([])
  const [estimatesAccess, setEstimatesAccess] = useState(false)
  const [estimatesAccessError, setEstimatesAccessError] = useState<string | null>(null)
  const [creatingEstimate, setCreatingEstimate] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingAlbumIdRef = useRef<string | null>(null)
  const photoNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  const albumLabel = industry === null ? { singular: "Job", plural: "Jobs", create: "New Job" } : albumLabelFor(industry)
  const usesJobs = ["Job", "Project"].includes(albumLabel.singular)

  useEffect(() => {
    const albumId = searchParams.get("album")
    const upload = searchParams.get("upload")
    const camera = searchParams.get("camera")
    const tab = searchParams.get("tab") ?? searchParams.get("view")
    const startNew = searchParams.get("new")
    if (tab === "jobs" || tab === "albums") {
      setView("albums")
      if (startNew === "1") setShowNewAlbum(true)
      router.replace("/photos")
      return
    }
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
      fetchEstimateSnapshot(),
    ]).then(([pd, ad, sd, ed]) => {
      setPhotos(pd.photos ?? [])
      setAlbums(ad.albums ?? [])
      setSiteSlug(sd.slug ?? "")
      setIndustry(sd.industry ?? null)
      setSubIndustry(sd.subIndustry ?? null)
      setCustomDomain(sd.customDomain ?? null)
      setIsPro(sd.isPro ?? false)
      setEstimatesAccess(ed.estimates !== null)
      setEstimatesAccessError(ed.error ?? null)
      setEstimates(ed.estimates ?? [])

      // Deep link straight into a specific Job's detail view (e.g. from the
      // "Linked to Job" card on an Estimate) - a plain ?album=<id> with no
      // camera/upload/tab intent, handled separately above. Checked here,
      // after albums have actually loaded, so the target can be found.
      const params = new URLSearchParams(window.location.search)
      const deepAlbumId = params.get("album")
      const hasOtherIntent = params.get("camera") || params.get("upload") || params.get("tab") || params.get("view")
      if (deepAlbumId && !hasOtherIntent) {
        const target = (ad.albums ?? []).find((a: Album) => a.id === deepAlbumId)
        if (target) {
          setActiveAlbum(target)
          setView("albums")
        }
        router.replace("/photos")
      }

      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    return () => {
      if (photoNoticeTimerRef.current) clearTimeout(photoNoticeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!activeAlbum) return
    let cancelled = false
    fetchEstimateSnapshot().then(ed => {
      if (cancelled) return
      setEstimatesAccess(ed.estimates !== null)
      setEstimatesAccessError(ed.error)
      setEstimates(ed.estimates ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [activeAlbum?.id])

  function showPhotoNotice(notice: PhotoNotice) {
    if (photoNoticeTimerRef.current) clearTimeout(photoNoticeTimerRef.current)
    setPhotoNotice(notice)
    photoNoticeTimerRef.current = setTimeout(() => setPhotoNotice(null), 1800)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length === 0) { if (fileRef.current) fileRef.current.value = ""; return }

    // Native pickers don't let a web app cap selection up front, so trim
    // after the fact instead of erroring out.
    const files = picked.slice(0, MAX_UPLOAD_BATCH)
    const albumId = pendingAlbumIdRef.current

    setUploading(true)
    uploadStatus.start(files.length)
    setPhotoError(null)
    await ensureFreshSession()
    let uploadedCount = 0
    try {
      // Bounded concurrency - a few uploads at once, not one-at-a-time and
      // not unlimited parallel, matching the same pattern used for the nav
      // upload flow.
      let nextIndex = 0
      async function worker() {
        while (nextIndex < files.length) {
          const file = files[nextIndex++]
          try {
            const newPhoto = await uploadDashboardMedia(file, { albumId })
            uploadedCount++
            setPhotos(prev => [{ ...newPhoto, album_id: albumId ?? null }, ...prev])
            uploadStatus.complete(true)
          } catch (uploadError) {
            // Keep going - one bad file shouldn't stop the rest from uploading
            uploadStatus.complete(false, uploadError instanceof Error ? uploadError.message : undefined)
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker))

      if (uploadedCount > 0 && albumId) {
        const target = albums.find(a => a.id === albumId)
        if (target) {
          setView("albums")
          setActiveAlbum(target)
        }
      }
      pendingAlbumIdRef.current = null
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
    showPhotoNotice({ text: "Photo deleted", tone: "delete" })
  }

  async function setCoverPhoto(photo: Photo) {
    if (!activeAlbum) return
    await updateAlbumDetails(activeAlbum, { cover_photo_id: photo.id })
    setAlbums(prev => prev.map(a => a.id === activeAlbum.id ? { ...a, cover_photo_id: photo.id, cover_url: photo.url } : a))
  }

  async function createEstimateForJob() {
    if (!activeAlbum || creatingEstimate) return
    const freshEstimateSnapshot = await fetchEstimateSnapshot()
    const estimateList = freshEstimateSnapshot.estimates ?? estimates
    setEstimatesAccess(freshEstimateSnapshot.estimates !== null)
    setEstimatesAccessError(freshEstimateSnapshot.error)
    setEstimates(estimateList)
    const existingEstimate = estimateList.find(estimate => estimate.job_id === activeAlbum.id)
    if (existingEstimate) {
      router.push(`/estimates?estimate=${existingEstimate.id}&fromJob=${encodeURIComponent(activeAlbum.id)}`)
      return
    }
    setCreatingEstimate(true)
    try {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: activeAlbum.customer_name || "New customer",
          client_phone: activeAlbum.customer_phone || undefined,
          client_email: activeAlbum.customer_email || undefined,
          property_address: normalizeAddressText(activeAlbum.service_address) || undefined,
          title: activeAlbum.name || undefined,
          job_id: activeAlbum.id,
        }),
      })
      const data = await res.json()
      if (res.ok && data.estimate) {
        router.push(`/estimates?estimate=${data.estimate.id}&fromJob=${encodeURIComponent(activeAlbum.id)}`)
      } else {
        setPhotoError(data.error || "Couldn't create the estimate. Try again.")
      }
    } catch {
      setPhotoError("Couldn't create the estimate. Try again.")
    } finally {
      setCreatingEstimate(false)
    }
  }

  async function savePhotoNote(photo: Photo, note: string) {
    const trimmed = note.trim() || null
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, note: trimmed } : p))
    await fetch("/api/photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photo.id, note: trimmed }),
    }).catch(console.error)
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

  async function deleteSelected() {
    if (selectedIds.size === 0 || deletingSelected) return
    setDeletingSelected(true)
    const ids = Array.from(selectedIds)
    try {
      await Promise.all(ids.map(id =>
        fetch("/api/photos", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }).catch(() => null)
      ))
      setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)))
      showPhotoNotice({ text: ids.length === 1 ? "Photo deleted" : `${ids.length} photos deleted`, tone: "delete" })
      exitSelectMode()
    } finally {
      setDeletingSelected(false)
      setShowBulkDeleteConfirm(false)
    }
  }

  async function createAlbum() {
    const rawName = usesJobs
      ? (newAlbumName.trim() || newJobCustomerName.trim() || newJobAddress.trim())
      : newAlbumName.trim()
    const name = usesJobs ? toDisplayTitle(rawName) : rawName.trim()
    if (!name) return
    setSavingAlbum(true)
    const res = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        album_type: usesJobs ? "job" : "album",
        customer_name: usesJobs ? newJobCustomerName : undefined,
        customer_phone: usesJobs ? newJobPhone : undefined,
        customer_email: usesJobs ? newJobEmail : undefined,
        service_address: usesJobs ? normalizeAddressText(newJobAddress) : undefined,
      }),
    })
    const data = await res.json()
    if (data.album) {
      setAlbums(prev => [data.album, ...prev])
      setNewAlbumName("")
      setNewJobCustomerName("")
      setNewJobAddress("")
      setNewJobPhone("")
      setNewJobEmail("")
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
    const trimmed = (usesJobs || album.album_type === "job") ? toDisplayTitle(name) : name.trim()
    if (!trimmed || trimmed === album.name) return
    const res = await fetch("/api/albums", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: album.id, name: trimmed }),
    })
    const data = await res.json()
    if (data.album) {
      setAlbums(prev => prev.map(a => a.id === album.id ? { ...a, ...data.album } : a))
      if (activeAlbum?.id === album.id) setActiveAlbum(prev => prev ? { ...prev, ...data.album } : prev)
    }
  }

  async function updateAlbumDetails(album: Album, details: Partial<Pick<Album, "customer_name" | "customer_phone" | "customer_email" | "service_address" | "notes" | "notes_overview" | "notes_materials" | "notes_measurements" | "notes_labor" | "notes_follow_up" | "show_address_public" | "cover_photo_id">>) {
    const normalizedDetails = {
      ...details,
      ...(typeof details.service_address === "string" ? { service_address: normalizeAddressText(details.service_address) || null } : {}),
    }
    const res = await fetch("/api/albums", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: album.id, ...normalizedDetails }),
    })
    const data = await res.json()
    if (data.album) {
      setAlbums(prev => prev.map(a => a.id === album.id ? { ...a, ...data.album } : a))
      if (activeAlbum?.id === album.id) setActiveAlbum(prev => prev ? { ...prev, ...data.album } : prev)
    }
  }

  async function toggleAlbumWebsiteGallery(album: Album) {
    const nextValue = !Boolean(album.show_on_website_gallery)
    setAlbums(prev => prev.map(a => a.id === album.id ? { ...a, show_on_website_gallery: nextValue } : a))
    if (activeAlbum?.id === album.id) setActiveAlbum(prev => prev ? { ...prev, show_on_website_gallery: nextValue } : prev)

    const res = await fetch("/api/albums", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: album.id, show_on_website_gallery: nextValue }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.album) {
      setAlbums(prev => prev.map(a => a.id === album.id ? album : a))
      if (activeAlbum?.id === album.id) setActiveAlbum(album)
      setPhotoError("Website gallery setting did not save. Try again.")
      return
    }
    setAlbums(prev => prev.map(a => a.id === album.id ? { ...a, ...data.album } : a))
    if (activeAlbum?.id === album.id) setActiveAlbum(prev => prev ? { ...prev, ...data.album } : prev)
  }

  async function handleShare(album: Album) {
    const title = albumDisplayName(album, usesJobs)
    const url = `${getPublicSiteOrigin(siteSlug, customDomain)}/gallery/${albumPublicSlug(album, usesJobs)}`
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {})
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
  const galleryFavorites = gallery.filter(p => p.for_social)
  const filteredAllPhotos =
    photoFilter === "favorites" ? favorites :
    photoFilter === "unused" ? unused :
    allPhotos
  // "Not on site" only makes sense against the full library - the Gallery
  // tab is by definition already-on-site photos, so only Favorites applies
  // there. Team-approved 2026-08-10.
  const filteredGallery = photoFilter === "favorites" ? galleryFavorites : gallery

  const albumPhotos = activeAlbum
    ? photos.filter(p => p.album_id === activeAlbum.id)
    : []
  const activeAlbumUsesJobTools = activeAlbum ? (usesJobs || activeAlbum.album_type === "job") : usesJobs

  const currentPhotos =
    view === "all" ? filteredAllPhotos :
    view === "website" ? filteredGallery : []

  const lightroomPhotos = lightroomSource === "album" ? albumPhotos : currentPhotos

  const activeAllTabLabel = photoFilter === "favorites" ? "Favorites" : photoFilter === "unused" ? "Not on site" : "All Photos"
  const activeAllTabCount = photoFilter === "favorites" ? favorites.length : photoFilter === "unused" ? unused.length : allPhotos.length
  const activeWebsiteTabLabel = view === "website" && photoFilter === "favorites" ? "Favorites" : "Gallery"
  const activeWebsiteTabCount = view === "website" && photoFilter === "favorites" ? galleryFavorites.length : gallery.length
  const TAB_LABELS = { all: activeAllTabLabel, website: activeWebsiteTabLabel, albums: albumLabel.plural }
  const ACTIVE_TAB_COUNTS = { all: activeAllTabCount, website: activeWebsiteTabCount, albums: albums.length }
  const canFilter = view === "all" || view === "website"
  const filterableBaseCount = view === "website" ? gallery.length : allPhotos.length
  const FILTER_LABELS = { all: view === "website" ? "All Gallery Photos" : "All Photos", favorites: "Favorites", unused: "Not on site" }
  const FILTER_COUNTS = view === "website"
    ? { all: gallery.length, favorites: galleryFavorites.length, unused: 0 }
    : { all: allPhotos.length, favorites: favorites.length, unused: unused.length }
  const FILTER_OPTIONS: PhotoFilter[] = view === "website" ? ["all", "favorites"] : ["all", "favorites", "unused"]

  function openLightroom(photo: Photo, source: Photo[]) {
    const index = source.findIndex(p => p.id === photo.id)
    if (index === -1) return
    setLightroomSource(source === albumPhotos ? "album" : "current")
    setLightroomIndex(index)
  }

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

      {activeAlbum ? (
        <div style={{ padding: "22px 24px 18px" }}>
          <button onClick={() => setActiveAlbum(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,${TEXT_OPACITY.tertiary})`} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{albumLabel.plural}</span>
          </button>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <AlbumTitleEditor album={activeAlbum} usesJobs={usesJobs} onRename={renameAlbum} />
              {albumContextLine(activeAlbum) && (
                <p style={{ margin: "8px 0 0", ...TYPE.subhead, fontWeight: 500, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, lineHeight: 1.35 }}>
                  {albumContextLine(activeAlbum)}
                </p>
              )}
              {activeAlbumUsesJobTools && (
                <>
                  <JobDetailsEditor album={activeAlbum} onSave={updateAlbumDetails} />
                  <JobNotesEditor
                    album={activeAlbum}
                    onSave={updateAlbumDetails}
                    industry={industry}
                    subIndustry={subIndustry}
                    albumSingular={albumLabel.singular}
                  />
                  {estimatesAccess ? (
                    <JobEstimatesCard
                      estimates={estimates.filter(e => e.job_id === activeAlbum.id)}
                      onOpen={id => router.push(`/estimates?estimate=${id}&fromJob=${encodeURIComponent(activeAlbum.id)}`)}
                      onCreate={createEstimateForJob}
                      creating={creatingEstimate}
                    />
                  ) : (
                    <JobEstimateAccessNotice message={estimatesAccessError} />
                  )}
                </>
              )}
            </div>

            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: 0, ...TYPE.title, color: "white" }}>
                    {activeAlbumUsesJobTools ? "Job Photos" : "Photos"}
                  </h2>
                  <p style={{ margin: "2px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                    {albumPhotos.length} photo{albumPhotos.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
                  {!selectMode && photos.length > 0 && (
                    <button onClick={() => setSelectMode(true)} style={{
                      padding: "10px 16px", borderRadius: 100,
                      backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.7)", cursor: "pointer", ...TYPE.footnote, fontWeight: 700,
                    }}>
                      Select
                    </button>
                  )}
                  <button onClick={() => isPro ? setShareAlbum(activeAlbum) : setShowUpgrade(true)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "10px 16px", borderRadius: 100,
                    backgroundColor: isPro ? `${SIGNAL_GREEN}18` : "rgba(255,255,255,0.06)",
                    border: `1px solid ${isPro ? `${SIGNAL_GREEN}33` : "rgba(255,255,255,0.1)"}`,
                    color: isPro ? SIGNAL_GREEN : "rgba(255,255,255,0.5)",
                    cursor: "pointer", ...TYPE.footnote, fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}>
                    {!isPro && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                    )}
                    {activeAlbumUsesJobTools ? "Share with customer" : "Share"}
                    {isPro && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                    )}
                  </button>
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
              </div>
              {activeAlbumUsesJobTools && (
                <JobWebsiteVisibilityCard album={activeAlbum} onToggle={toggleAlbumWebsiteGallery} />
              )}
            </section>
          </div>
        </div>
      ) : (
        <div style={{ padding: "16px 24px 8px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, ...TYPE.largeTitle, color: "white" }}>Photos</h1>
            <p style={{ margin: "2px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
              {photos.length === 0 ? "Your work, beautifully organized" : `${photos.length} photo${photos.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            {!selectMode && photos.length > 0 && (
              <button onClick={() => setSelectMode(true)} style={{
                padding: "10px 16px", borderRadius: 100,
                backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)", cursor: "pointer", ...TYPE.footnote, fontWeight: 700,
              }}>
                Select
              </button>
            )}
            <button onClick={openCamera} disabled={uploading} aria-label="Add photo" style={{
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
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleUpload} style={{ display: "none" }} />

      {/* Tabs â€” hidden when inside an album */}
      {!activeAlbum && (
        <div style={{
          position: "sticky",
          top: "calc(max(env(safe-area-inset-top), 14px) + 32px)",
          zIndex: 30,
          padding: "6px 24px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          background: "#080A09",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "stretch", gap: 10, width: "100%" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 0 }}>
              {(["all", "website", "albums"] as View[]).map(v => {
                const active = view === v
                return (
                  <button key={v} onClick={() => {
                    setView(v)
                    // "Not on site" only applies to the full library - carry
                    // Favorites across tabs, but clear an inapplicable filter
                    // instead of leaving it silently selected and unapplied.
                    if (v === "albums" || (v === "website" && photoFilter === "unused")) setPhotoFilter("all")
                  }} style={{
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
              disabled={!canFilter || filterableBaseCount === 0}
              aria-label="Filter photos"
              style={{
                width: 42,
                minHeight: 42,
                borderRadius: 14,
                border: `1px solid ${canFilter && photoFilter !== "all" ? `${SIGNAL_GREEN}66` : "rgba(255,255,255,0.1)"}`,
                backgroundColor: canFilter && photoFilter !== "all" ? `${SIGNAL_GREEN}18` : "rgba(255,255,255,0.055)",
                color: canFilter && photoFilter !== "all" ? SIGNAL_GREEN : "rgba(255,255,255,0.62)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: canFilter && filterableBaseCount > 0 ? "pointer" : "default",
                opacity: canFilter && filterableBaseCount > 0 ? 1 : 0.34,
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
              options={FILTER_OPTIONS}
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
          border: `1px solid ${photoNotice.tone === "favorite" ? "rgba(255,75,139,0.44)" : photoNotice.tone === "gallery" ? `${SIGNAL_GREEN}66` : photoNotice.tone === "delete" ? "rgba(255,107,90,0.44)" : "rgba(255,255,255,0.18)"}`,
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
          ) : photoNotice.tone === "delete" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF6B5A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          ) : null}
          <span style={{ fontSize: 13, fontWeight: 850, color: "rgba(255,255,255,0.92)", whiteSpace: "nowrap" }}>{photoNotice.text}</span>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, padding: "0 24px 32px" }}>
        {loading ? (
          <DashboardLaunchLoader compact />
        ) : activeAlbum ? (
          <DateGroupedGrid
            photos={albumPhotos}
            onView={p => openLightroom(p, albumPhotos)}
            onFlag={usesJobs ? undefined : flag}
            onGallery={usesJobs ? undefined : toggleGallery}
            onPlace={usesJobs ? undefined : openPlacement}
            onShare={usesJobs ? undefined : handleSharePhoto}
            onRequestDelete={usesJobs ? undefined : setDeleteConfirmPhoto}
            destinations={destinations}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            gridColumns={usesJobs ? "repeat(2, minmax(0, 1fr))" : "repeat(3, 1fr)"}
            cardVariant={usesJobs ? "job" : "library"}
            groupByDate={!usesJobs}
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
            onHideNew={() => {
              setShowNewAlbum(false)
              setNewAlbumName("")
              setNewJobCustomerName("")
              setNewJobAddress("")
              setNewJobPhone("")
              setNewJobEmail("")
            }}
            onNameChange={setNewAlbumName}
            usesJobs={usesJobs}
            newJobCustomerName={newJobCustomerName}
            newJobAddress={newJobAddress}
            newJobPhone={newJobPhone}
            newJobEmail={newJobEmail}
            onJobCustomerNameChange={setNewJobCustomerName}
            onJobAddressChange={setNewJobAddress}
            onJobPhoneChange={setNewJobPhone}
            onJobEmailChange={setNewJobEmail}
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
              view === "website" && photoFilter === "favorites" ? "No favorites in your gallery yet." :
              view === "website" ? "No gallery photos yet." :
              photoFilter === "favorites" ? "No favorites yet." :
              photoFilter === "unused" ? "Every photo is being used." :
              "Take your first photo."
            }
            emptySub={
              view === "website" && photoFilter === "favorites" ? "Heart a gallery photo to find it here quickly." :
              view === "website" ? "Tap Add to Gallery on any photo customers should see." :
              photoFilter === "favorites" ? "Heart the photos you want to find quickly later." :
              photoFilter === "unused" ? "New photos that are not in your gallery or on a page will show here." :
              "Tap the camera button to take photos or upload from your phone."
            }
            emptyIcon={
              view === "website" && photoFilter === "favorites" ? <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> :
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
          onRequestDelete={setDeleteConfirmPhoto}
          album={lightroomSource === "album" ? activeAlbum : null}
          onSetCover={setCoverPhoto}
          onNoteSave={savePhotoNote}
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
          usesJobs={usesJobs}
          copied={copied}
          onShare={handleShare}
          onClose={() => setShareAlbum(null)}
        />
      )}

      {/* Delete confirm - friendly, not a system warning, since this is the
          one irreversible action available straight from the thumbnail. */}
      {deleteConfirmPhoto && (
        <>
          <div onClick={() => setDeleteConfirmPhoto(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.72)", zIndex: 150, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}/>
          <div style={{ position: "fixed", left: 20, right: 20, top: "50%", transform: "translateY(-50%)", zIndex: 151, borderRadius: 24, backgroundColor: "#161616", border: "1px solid rgba(255,255,255,0.1)", padding: "26px 22px", boxShadow: "0 24px 70px rgba(0,0,0,0.5)" }}>
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
          album={activeAlbum}
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
          padding: "16px 24px max(env(safe-area-inset-bottom, 0px), 22px)",
          background: "linear-gradient(to top, rgba(8,10,9,0.97) 0%, rgba(8,10,9,0.94) 70%, rgba(8,10,9,0.86) 100%)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={exitSelectMode} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", ...TYPE.body, cursor: "pointer", padding: 0 }}>
              Cancel
            </button>
            <span style={{ ...TYPE.footnote, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
              {selectedIds.size === 0 ? "Tap photos to select" : `${selectedIds.size} selected`}
            </span>
            <div style={{ width: 46 }} aria-hidden="true" />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 56 }}>
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              disabled={selectedIds.size === 0}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, background: "none", border: "none", cursor: selectedIds.size === 0 ? "default" : "pointer", padding: 0 }}
            >
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                backgroundColor: selectedIds.size === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,70,70,0.14)",
                border: `2px solid ${selectedIds.size === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,70,70,0.3)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={selectedIds.size === 0 ? "rgba(255,255,255,0.25)" : "rgba(255,100,100,0.9)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: selectedIds.size === 0 ? "rgba(255,255,255,0.3)" : "rgba(255,100,100,0.85)" }}>Delete</span>
            </button>
            <button
              onClick={downloadSelected}
              disabled={selectedIds.size === 0 || downloadingZip}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, background: "none", border: "none", cursor: selectedIds.size === 0 ? "default" : "pointer", padding: 0 }}
            >
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                backgroundColor: selectedIds.size === 0 ? "rgba(255,255,255,0.06)" : `${SIGNAL_GREEN}18`,
                border: `2px solid ${selectedIds.size === 0 ? "rgba(255,255,255,0.1)" : `${SIGNAL_GREEN}44`}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {downloadingZip ? (
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${SIGNAL_GREEN}35`, borderTopColor: SIGNAL_GREEN, animation: "spin 0.7s linear infinite" }} />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={selectedIds.size === 0 ? "rgba(255,255,255,0.25)" : SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: selectedIds.size === 0 ? "rgba(255,255,255,0.3)" : SIGNAL_GREEN }}>
                {downloadingZip ? "Zipping..." : "Download"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk delete confirm - same friendly, non-system-warning tone as the
          single-photo delete, scaled to the selected count. */}
      {showBulkDeleteConfirm && (
        <>
          <div onClick={() => !deletingSelected && setShowBulkDeleteConfirm(false)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.72)", zIndex: 150, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}/>
          <div style={{ position: "fixed", left: 20, right: 20, top: "50%", transform: "translateY(-50%)", zIndex: 151, borderRadius: 24, backgroundColor: "#161616", border: "1px solid rgba(255,255,255,0.1)", padding: "26px 22px", boxShadow: "0 24px 70px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>🗑️</div>
            <p style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800, color: "white", lineHeight: 1.3 }}>
              Delete {selectedIds.size} photo{selectedIds.size !== 1 ? "s" : ""}?
            </p>
            <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: 1.5, color: "rgba(255,255,255,0.72)" }}>
              They'll be gone for good, including anywhere they're used on your site or in an album.
            </p>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
              <button
                onClick={deleteSelected}
                disabled={deletingSelected}
                style={{ padding: "15px 0", borderRadius: 14, border: "none", backgroundColor: "rgba(255,70,70,0.16)", color: "#FF6B6B", fontSize: 15, fontWeight: 900, cursor: deletingSelected ? "default" : "pointer" }}
              >
                {deletingSelected ? "Deleting..." : `Yes, delete ${selectedIds.size === 1 ? "it" : "them"}`}
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={deletingSelected}
                style={{ padding: "15px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", backgroundColor: "transparent", color: "rgba(255,255,255,0.75)", fontSize: 15, fontWeight: 800, cursor: deletingSelected ? "default" : "pointer" }}
              >
                Keep them
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}

// â”€â”€ Lightroom viewer â”€â”€
function PhotoLightroom({ photos, initialIndex, onClose, onFlag, onGallery, onPlace, destinations, onShare, onRequestDelete, album, onSetCover, onNoteSave }: {
  photos: Photo[]
  initialIndex: number
  onClose: () => void
  onFlag: (id: string, field: "for_website" | "for_social", current: boolean) => void
  onGallery: (photo: Photo) => void
  onPlace?: (photo: Photo) => void
  destinations?: PhotoDestination[] | null
  onShare?: (photo: Photo) => void
  onRequestDelete: (photo: Photo) => void
  album?: Album | null
  onSetCover?: (photo: Photo) => void
  onNoteSave?: (photo: Photo, note: string) => Promise<void>
}) {
  const [index, setIndex] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const photo = photos[Math.min(index, photos.length - 1)]
  const isJobPhoto = album?.album_type === "job"
  const isCover = isJobPhoto && album?.cover_photo_id === photo?.id

  useEffect(() => {
    setEditingNote(false)
    setNoteDraft(photo?.note ?? "")
  }, [photo?.id, photo?.note])

  async function saveNote() {
    if (!photo || !onNoteSave) return
    setSavingNote(true)
    await onNoteSave(photo, noteDraft)
    setSavingNote(false)
    setEditingNote(false)
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft")  setIndex(i => Math.max(0, i - 1))
      else if (e.key === "ArrowRight") setIndex(i => Math.min(photos.length - 1, i + 1))
      else if (e.key === "Escape") onCloseRef.current()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [photos.length])

  // Deletion now happens externally (through the shared confirm dialog) -
  // if the array this viewer was given shrinks to nothing, close instead of
  // showing a black screen with nothing in it.
  useEffect(() => {
    if (photos.length === 0) onCloseRef.current()
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
        display: "flex", flexDirection: "column", gap: 14,
        padding: `56px 24px max(env(safe-area-inset-bottom, 0px), 36px)`,
      }}>
        {/* Photo note - job photos only */}
        {isJobPhoto && onNoteSave && (
          editingNote ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                placeholder="Add a note about this photo..."
                autoFocus
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 100,
                  border: "1px solid rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.1)",
                  color: "white", ...TYPE.footnote, outline: "none",
                }}
              />
              <button onClick={saveNote} disabled={savingNote} style={{ border: "none", background: "none", color: SIGNAL_GREEN, ...TYPE.footnote, fontWeight: 700, cursor: "pointer", padding: "6px 4px" }}>
                {savingNote ? "..." : "Save"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingNote(true)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span style={{ ...TYPE.footnote, color: photo?.note ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)" }}>
                {photo?.note || "Add a note about this photo"}
              </span>
            </button>
          )
        )}

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around" }}>
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

        {/* Cover photo - job photos only, replaces Add to Site in this context */}
        {isJobPhoto && onSetCover && (
          <button onClick={() => onSetCover(photo)} disabled={isCover} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
            background: "none", border: "none", cursor: isCover ? "default" : "pointer", padding: 0,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              backgroundColor: isCover ? "rgba(50,208,116,0.2)" : "rgba(255,255,255,0.1)",
              border: `2px solid ${isCover ? "rgba(50,208,116,0.5)" : "rgba(255,255,255,0.14)"}`,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill={isCover ? SIGNAL_GREEN : "none"} stroke={isCover ? SIGNAL_GREEN : "rgba(255,255,255,0.75)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: isCover ? SIGNAL_GREEN : "rgba(255,255,255,0.5)", letterSpacing: "0.02em" }}>
              {isCover ? "Cover Photo" : "Set as Cover"}
            </span>
          </button>
        )}

        {/* Add to Site */}
        {!isJobPhoto && onPlace && (() => {
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
        <button onClick={() => onRequestDelete(photo)} style={{
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
    </div>
  )
}

// â”€â”€ Date-grouped photo grid â”€â”€
function DateGroupedGrid({
  photos, onView, onFlag, onGallery, onPlace, destinations, onShare, onRequestDelete, selectMode, selectedIds, onToggleSelect, emptyTitle, emptySub, emptyIcon, onAdd, showAddCta, gridColumns = "1fr 1fr", cardVariant = "library", groupByDate = true
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
  gridColumns?: string
  cardVariant?: "library" | "job"
  // A Job is a bounded project record, not a rolling chronological stream -
  // "This week" headers borrow personal-photo-library framing that doesn't
  // fit there. Team-approved 2026-08-10: flat grid inside a Job, date
  // grouping stays for the general Photos/Gallery views.
  groupByDate?: boolean
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

  if (!groupByDate) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 3 }}>
        {photos.map(photo => (
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
            variant={cardVariant}
          />
        ))}
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
          <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 3 }}>
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
                variant={cardVariant}
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
function AlbumTitleEditor({ album, usesJobs, onRename }: { album: Album; usesJobs?: boolean; onRename: (a: Album, name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const displayName = albumDisplayName(album, usesJobs)
  const [name, setName] = useState(displayName)

  useEffect(() => { setName(albumDisplayName(album, usesJobs)) }, [album.name, album.album_type, usesJobs])

  function save() {
    onRename(album, name)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false) }}
          style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 14, padding: "12px 14px", color: "white",
            fontSize: "1.75rem", fontWeight: 500, letterSpacing: "-0.03em",
            outline: "none", width: "100%",
          }}
        />
        <div style={{ display: "flex", gap: 18, justifyContent: "flex-end", alignItems: "center" }}>
          <button onClick={() => setEditing(false)} style={{ border: "none", background: "none", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, ...TYPE.caption, cursor: "pointer", padding: 0 }}>Cancel</button>
          <button onClick={save} style={{ border: "none", background: "none", color: SIGNAL_GREEN, ...TYPE.caption, cursor: "pointer", padding: 0 }}>Save</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
      <h1 style={{ margin: 0, ...TYPE.largeTitle, color: "white", lineHeight: 1.02, overflowWrap: "anywhere" }}>{displayName}</h1>
      <button onClick={() => setEditing(true)} style={{ border: "none", background: "none", padding: "4px", cursor: "pointer", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, display: "flex", alignItems: "center", flexShrink: 0, marginTop: 2 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  )
}

function JobDetailsEditor({
  album,
  onSave,
}: {
  album: Album
  onSave: (album: Album, details: Partial<Pick<Album, "customer_name" | "customer_phone" | "customer_email" | "service_address" | "show_address_public">>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customerName, setCustomerName] = useState(album.customer_name ?? "")
  const [address, setAddress] = useState(normalizeAddressText(album.service_address))
  const [phone, setPhone] = useState(album.customer_phone ?? "")
  const [email, setEmail] = useState(album.customer_email ?? "")
  const [showAddressPublic, setShowAddressPublic] = useState(Boolean(album.show_address_public))
  const hasDetails = Boolean(album.customer_name || album.service_address || album.customer_phone || album.customer_email)

  useEffect(() => {
    setCustomerName(album.customer_name ?? "")
    setAddress(normalizeAddressText(album.service_address))
    setPhone(album.customer_phone ?? "")
    setEmail(album.customer_email ?? "")
    setShowAddressPublic(Boolean(album.show_address_public))
    setEditing(false)
  }, [album.id, album.customer_name, album.service_address, album.customer_phone, album.customer_email, album.show_address_public])

  async function save() {
    setSaving(true)
    await onSave(album, {
      customer_name: customerName,
      service_address: normalizeAddressText(address),
      customer_phone: phone,
      customer_email: email,
      show_address_public: showAddressPublic,
    })
    setSaving(false)
    setEditing(false)
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "white",
    ...TYPE.subhead,
    outline: "none",
    boxSizing: "border-box",
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{
          marginTop: 10,
          padding: "10px 12px",
          borderRadius: 13,
          border: `1px solid ${hasDetails ? "rgba(255,255,255,0.1)" : `${SIGNAL_GREEN}33`}`,
          backgroundColor: hasDetails ? "rgba(255,255,255,0.04)" : `${SIGNAL_GREEN}10`,
          color: hasDetails ? `rgba(255,255,255,${TEXT_OPACITY.secondary})` : SIGNAL_GREEN,
          ...TYPE.footnote,
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {hasDetails ? "Edit customer details" : "Add customer or address"}
      </button>
    )
  }

  return (
    <div style={{ marginTop: 12, padding: 14, borderRadius: 18, border: `1px solid ${SIGNAL_GREEN}22`, backgroundColor: "rgba(255,255,255,0.045)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ ...TYPE.caption, color: SIGNAL_GREEN }}>JOB DETAILS</div>
      <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" style={fieldStyle} />
      <input value={address} onChange={e => setAddress(e.target.value)} onBlur={() => setAddress(normalizeAddressText(address))} placeholder="Job address" style={fieldStyle} />
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={showAddressPublic}
          onChange={e => setShowAddressPublic(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
          Show this address on the shared job link (off by default — the customer's name still shows either way)
        </span>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" style={fieldStyle} />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={fieldStyle} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 18, paddingTop: 2 }}>
        <button onClick={() => setEditing(false)} disabled={saving} style={{ border: "none", background: "none", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, ...TYPE.caption, cursor: "pointer", padding: 0 }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ border: "none", background: "none", color: SIGNAL_GREEN, ...TYPE.caption, cursor: "pointer", padding: 0 }}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  )
}

function JobWebsiteVisibilityCard({ album, onToggle }: { album: Album; onToggle: (album: Album) => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const shown = Boolean(album.show_on_website_gallery)

  async function toggle() {
    if (saving) return
    setSaving(true)
    await onToggle(album)
    setSaving(false)
  }

  return (
    <div style={{
      padding: "10px 0",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      borderBottom: "1px solid rgba(255,255,255,0.045)",
      backgroundColor: "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ ...TYPE.caption, color: shown ? SIGNAL_GREEN : `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          {shown ? "SHOWN ON WEBSITE" : "HIDDEN FROM WEBSITE"}
        </div>
        <p style={{ margin: "5px 0 0", ...TYPE.footnote, lineHeight: 1.45, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
          {shown ? "This job can appear on your public gallery." : "This job will not appear on your public gallery."}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-pressed={shown}
        style={{
          width: 56,
          height: 32,
          borderRadius: 999,
          border: `1px solid ${shown ? `${SIGNAL_GREEN}66` : "rgba(255,255,255,0.16)"}`,
          backgroundColor: shown ? SIGNAL_GREEN : "rgba(255,255,255,0.08)",
          cursor: saving ? "default" : "pointer",
          flexShrink: 0,
          padding: 3,
          display: "flex",
          justifyContent: shown ? "flex-end" : "flex-start",
          transition: "background-color 0.18s ease, border-color 0.18s ease",
          opacity: saving ? 0.7 : 1,
        }}
      >
        <span style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          backgroundColor: shown ? FOUND_BLACK : "rgba(255,255,255,0.82)",
          display: "block",
          boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
        }} />
      </button>
    </div>
  )
}

function JobNotesEditor({
  album,
  onSave,
  industry,
  subIndustry,
  albumSingular,
}: {
  album: Album
  onSave: (album: Album, details: Partial<Pick<Album, "notes" | "notes_overview" | "notes_materials" | "notes_measurements" | "notes_labor" | "notes_follow_up">>) => Promise<void>
  industry: string | null
  subIndustry: string | null
  albumSingular: string
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const copy = workNotesCopyFor(industry, subIndustry, albumSingular)
  const [fields, setFields] = useState<Record<WorkNoteKey, string>>(() => ({
    notes_overview: album.notes_overview ?? album.notes ?? "",
    notes_materials: album.notes_materials ?? "",
    notes_measurements: album.notes_measurements ?? "",
    notes_labor: album.notes_labor ?? "",
    notes_follow_up: album.notes_follow_up ?? "",
  }))

  const currentFields: Record<WorkNoteKey, string> = {
    notes_overview: album.notes_overview ?? album.notes ?? "",
    notes_materials: album.notes_materials ?? "",
    notes_measurements: album.notes_measurements ?? "",
    notes_labor: album.notes_labor ?? "",
    notes_follow_up: album.notes_follow_up ?? "",
  }

  const filledSections = copy.sections
    .map(section => ({ ...section, value: currentFields[section.key]?.trim() ?? "" }))
    .filter(section => section.value)
  const hasStructuredNotes = filledSections.length > 0

  useEffect(() => {
    setFields({
      notes_overview: album.notes_overview ?? album.notes ?? "",
      notes_materials: album.notes_materials ?? "",
      notes_measurements: album.notes_measurements ?? "",
      notes_labor: album.notes_labor ?? "",
      notes_follow_up: album.notes_follow_up ?? "",
    })
    setEditing(false)
  }, [album.id, album.notes, album.notes_overview, album.notes_materials, album.notes_measurements, album.notes_labor, album.notes_follow_up])

  function updateField(key: WorkNoteKey, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  function summaryFromFields(values: Record<WorkNoteKey, string>) {
    const lines = copy.sections
      .map(section => {
        const value = values[section.key]?.trim()
        return value ? `${section.label}: ${value}` : null
      })
      .filter(Boolean)
    return lines.join("\n\n")
  }

  async function save() {
    setSaving(true)
    await onSave(album, {
      notes: summaryFromFields(fields),
      notes_overview: fields.notes_overview,
      notes_materials: fields.notes_materials,
      notes_measurements: fields.notes_measurements,
      notes_labor: fields.notes_labor,
      notes_follow_up: fields.notes_follow_up,
    })
    setSaving(false)
    setEditing(false)
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 190,
    padding: "16px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.055)",
    color: "white",
    ...TYPE.subhead,
    lineHeight: 1.48,
    outline: "none",
    boxSizing: "border-box",
    resize: "vertical",
    fontFamily: "inherit",
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{
          marginTop: 10,
          padding: hasStructuredNotes ? "12px 14px" : "13px 14px",
          borderRadius: 14,
          border: hasStructuredNotes ? "1px solid rgba(255,255,255,0.06)" : `1px solid ${SIGNAL_GREEN}22`,
          backgroundColor: hasStructuredNotes ? "rgba(255,255,255,0.025)" : `${SIGNAL_GREEN}08`,
          color: "white",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: hasStructuredNotes ? 8 : 8,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ ...TYPE.caption, color: hasStructuredNotes ? `rgba(255,255,255,${TEXT_OPACITY.tertiary})` : SIGNAL_GREEN }}>
            {copy.label.toUpperCase()}
          </span>
          <span style={{ ...TYPE.caption, color: SIGNAL_GREEN }}>
            {hasStructuredNotes ? "EDIT" : "ADD"}
          </span>
        </span>
        {hasStructuredNotes ? (
          <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filledSections.slice(0, 3).map(section => (
              <span key={section.key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{section.label.toUpperCase()}</span>
                <span style={{ ...TYPE.subhead, color: "white", whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{section.value}</span>
              </span>
            ))}
            {filledSections.length > 3 && (
              <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                +{filledSections.length - 3} more section{filledSections.length - 3 === 1 ? "" : "s"}
              </span>
            )}
          </span>
        ) : (
          <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, lineHeight: 1.45 }}>
            {copy.helper}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.label}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 130,
        backgroundColor: "rgba(0,0,0,0.66)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "18px",
        boxSizing: "border-box",
      }}
    >
      <div style={{
        width: "100%",
        maxWidth: 620,
        maxHeight: "calc(100dvh - 36px)",
        overflowY: "auto",
        borderRadius: 26,
        border: "1px solid rgba(255,255,255,0.1)",
        backgroundColor: "#101311",
        boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}>
        <div>
          <div style={{ ...TYPE.caption, color: SIGNAL_GREEN }}>{copy.label.toUpperCase()}</div>
          <p style={{ margin: "6px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, lineHeight: 1.45 }}>
            {copy.helper}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {copy.sections.map((section, index) => (
            <label key={section.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ ...TYPE.caption, color: index === 0 ? SIGNAL_GREEN : `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                {section.label.toUpperCase()}
              </span>
              <textarea
                value={fields[section.key]}
                onChange={e => updateField(section.key, e.target.value)}
                placeholder={section.placeholder}
                style={{ ...fieldStyle, minHeight: index === 0 ? 126 : 94 }}
                autoFocus={index === 0}
              />
            </label>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 18, paddingTop: 2 }}>
          <button onClick={() => setEditing(false)} disabled={saving} style={{ border: "none", background: "none", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, ...TYPE.caption, cursor: "pointer", padding: "10px 0" }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ border: "none", background: "none", color: SIGNAL_GREEN, ...TYPE.caption, cursor: "pointer", padding: "10px 0" }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

function JobEstimateAccessNotice({ message }: { message: string | null }) {
  return (
    <div style={{
      marginTop: 10,
      padding: 14,
      borderRadius: 18,
      border: "1px solid rgba(255, 214, 10, 0.28)",
      backgroundColor: "rgba(255, 214, 10, 0.08)",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <div style={{ ...TYPE.caption, color: "#FFD60A" }}>ESTIMATE TOOL NEEDS ATTENTION</div>
      <p style={{ margin: 0, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, lineHeight: 1.45 }}>
        {message || "This job can use estimates, but estimate access did not load. Refresh once. If it stays, Found needs to fix this account's billing or add-on access."}
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          alignSelf: "flex-start",
          marginTop: 2,
          border: "none",
          background: "none",
          color: SIGNAL_GREEN,
          ...TYPE.footnote,
          fontWeight: 800,
          cursor: "pointer",
          padding: 0,
        }}
      >
        Refresh
      </button>
    </div>
  )
}

function JobEstimatesCard({ estimates, onOpen, onCreate, creating }: {
  estimates: JobEstimate[]
  onOpen: (id: string) => void
  onCreate: () => void
  creating: boolean
}) {
  const formatMoney = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (estimates.length === 0) {
    return (
      <div style={{ marginTop: 10, padding: 14, borderRadius: 16, border: `1px solid ${SIGNAL_GREEN}22`, backgroundColor: "rgba(255,255,255,0.025)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ ...TYPE.caption, color: SIGNAL_GREEN }}>ESTIMATE</div>
          <p style={{ margin: "6px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, lineHeight: 1.45 }}>
            Build pricing from this job. Customer details will carry over.
          </p>
        </div>
        <button
          onClick={onCreate}
          disabled={creating}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 14,
            border: "none",
            backgroundColor: SIGNAL_GREEN,
            color: "#06100a",
            ...TYPE.subhead,
            fontWeight: 800,
            cursor: creating ? "default" : "pointer",
          }}
        >
          {creating ? "Creating estimate..." : "Start Estimate"}
        </button>
      </div>
    )
  }

  const primaryEstimate = estimates[0]

  return (
    <div style={{ marginTop: 10, padding: 14, borderRadius: 16, border: `1px solid ${SIGNAL_GREEN}22`, backgroundColor: "rgba(255,255,255,0.025)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ ...TYPE.caption, color: SIGNAL_GREEN }}>
        ESTIMATE STARTED
      </div>
      <button
        onClick={() => onOpen(primaryEstimate.id)}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 14,
          border: "none",
          backgroundColor: SIGNAL_GREEN,
          color: "#06100a",
          ...TYPE.subhead,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Continue Estimate
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {estimates.map(est => (
          <button
            key={est.id}
            onClick={() => onOpen(est.id)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              padding: "9px 11px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.02)",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <span style={{ ...TYPE.subhead, color: "white", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {est.title || (est.estimate_number ? `Estimate #${est.estimate_number}` : "Estimate")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ ...TYPE.footnote, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{formatMoney(est.total)}</span>
              <span style={{
                fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 100,
                color: ESTIMATE_STATUS_COLORS[est.status] ?? "rgba(255,255,255,0.5)",
                backgroundColor: `${ESTIMATE_STATUS_COLORS[est.status] ?? "rgba(255,255,255,0.5)"}18`,
              }}>
                {ESTIMATE_STATUS_LABELS[est.status] ?? est.status}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ProjectsTab({
  albums, photos, albumLabel, isPro, showNew, newName, saving, usesJobs,
  newJobCustomerName, newJobAddress, newJobPhone, newJobEmail,
  onShowNew, onHideNew, onNameChange, onJobCustomerNameChange, onJobAddressChange, onJobPhoneChange, onJobEmailChange,
  onCreate, onOpen, onShare, onUpgrade, onDelete,
}: {
  albums: Album[]
  photos: Photo[]
  albumLabel: { singular: string; plural: string; create: string }
  isPro: boolean
  showNew: boolean
  newName: string
  saving: boolean
  usesJobs: boolean
  newJobCustomerName: string
  newJobAddress: string
  newJobPhone: string
  newJobEmail: string
  onShowNew: () => void
  onHideNew: () => void
  onNameChange: (s: string) => void
  onJobCustomerNameChange: (s: string) => void
  onJobAddressChange: (s: string) => void
  onJobPhoneChange: (s: string) => void
  onJobEmailChange: (s: string) => void
  onCreate: () => void
  onOpen: (a: Album) => void
  onShare: (a: Album) => void
  onUpgrade: () => void
  onDelete: (a: Album) => void
}) {
  const canCreate = usesJobs
    ? Boolean(newName.trim() || newJobCustomerName.trim() || newJobAddress.trim())
    : Boolean(newName.trim())
  const newFieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 16px",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "white",
    fontSize: "0.9375rem",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {showNew ? (
        <div style={{ borderRadius: 20, padding: 20, backgroundColor: "rgba(255,255,255,0.05)", border: `1px solid ${SIGNAL_GREEN}22`, marginBottom: 6 }}>
          <div style={{ ...TYPE.caption, color: SIGNAL_GREEN, marginBottom: 14 }}>{albumLabel.create}</div>
          {usesJobs ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
              <input
                autoFocus
                value={newName}
                onChange={e => onNameChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canCreate && onCreate()}
                placeholder="Job name"
                style={newFieldStyle}
              />
              <input
                value={newJobCustomerName}
                onChange={e => onJobCustomerNameChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canCreate && onCreate()}
                placeholder="Customer name"
                style={newFieldStyle}
              />
              <input
                value={newJobAddress}
                onChange={e => onJobAddressChange(e.target.value)}
                onBlur={() => onJobAddressChange(normalizeAddressText(newJobAddress))}
                onKeyDown={e => e.key === "Enter" && canCreate && onCreate()}
                placeholder="Job address"
                style={newFieldStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input
                  value={newJobPhone}
                  onChange={e => onJobPhoneChange(e.target.value)}
                  placeholder="Phone"
                  inputMode="tel"
                  style={newFieldStyle}
                />
                <input
                  value={newJobEmail}
                  onChange={e => onJobEmailChange(e.target.value)}
                  placeholder="Email"
                  type="email"
                  style={newFieldStyle}
                />
              </div>
            </div>
          ) : (
            <input
              autoFocus
              value={newName}
              onChange={e => onNameChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onCreate()}
              placeholder={`${albumLabel.singular} name...`}
              style={{ ...newFieldStyle, marginBottom: 12 }}
            />
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onHideNew} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button onClick={onCreate} disabled={!canCreate || saving} style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", backgroundColor: canCreate ? SIGNAL_GREEN : "rgba(255,255,255,0.08)", color: canCreate ? FOUND_BLACK : "rgba(255,255,255,0.3)", fontSize: "0.8125rem", fontWeight: 700, cursor: canCreate ? "pointer" : "default" }}>
              {saving ? "Creating..." : `Create ${albumLabel.singular}`}
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
            {usesJobs ? "Capture the customer, address, and job photos in one place." : "Group photos by job, client, or event."}<br/>Share a branded link with any client.
          </p>
        </div>
      ) : (
        <>
          {showNew && usesJobs && albums.length > 0 && (
            <div style={{ margin: "18px 0 10px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
              Continue a job
            </div>
          )}
          {albums.map(album => {
          const count = photos.filter(p => p.album_id === album.id).length
          const thumb = photos.find(p => p.album_id === album.id)
          const coverUrl = album.cover_url ?? thumb?.url ?? null
          const context = albumContextLine(album)
          return (
            <div key={album.id} style={{ borderRadius: 18, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div onClick={() => onOpen(album)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)", flexShrink: 0 }}>
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...TYPE.headline, color: "white", marginBottom: 3 }}>{albumDisplayName(album, usesJobs)}</div>
                  {context && (
                    <div style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {context}
                    </div>
                  )}
                  {usesJobs && !context && (
                    <div style={{ ...TYPE.footnote, color: `${SIGNAL_GREEN}aa`, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>
                      Add customer or address
                    </div>
                  )}
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
          })}
        </>
      )}
    </div>
  )
}

// â”€â”€ Photo card â€” tap to open lightroom â”€â”€
function PhotoCard({ photo, onView, onFlag, onGallery, onPlace, destinations, onShare, onRequestDelete, selectMode, selected, onToggleSelect, variant = "library" }: {
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
  variant?: "library" | "job"
}) {
  const isVideo = isVideoMedia(photo.url, photo.mime_type)
  const isJobWorkspace = variant === "job"
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
      style={{
        position: "relative",
        borderRadius: isJobWorkspace ? 18 : 16,
        overflow: "hidden",
        aspectRatio: isJobWorkspace ? "4 / 3" : "1",
        backgroundColor: isVideo || isJobWorkspace ? "#111813" : "transparent",
        border: isJobWorkspace ? "1px solid rgba(255,255,255,0.08)" : isVideo ? "1px solid rgba(255,255,255,0.08)" : "none",
        boxShadow: isJobWorkspace ? "0 16px 36px rgba(0,0,0,0.22)" : "none",
      }}
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

function PhotoFilterPopover({ active, labels, counts, options = ["all", "favorites", "unused"], onSelect, onClose }: {
  active: PhotoFilter
  labels: Record<PhotoFilter, string>
  counts: Record<PhotoFilter, number>
  options?: PhotoFilter[]
  onSelect: (filter: PhotoFilter) => void
  onClose: () => void
}) {
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
        top: "calc(100% + 8px)",
        right: 24,
        width: "min(286px, calc(100vw - 48px))",
        zIndex: 32,
        backgroundColor: "rgba(15,18,16,0.96)",
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.11)",
        padding: 8,
        boxShadow: "0 18px 54px rgba(0,0,0,0.46)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }}>
          {options.map(filter => {
            const selected = active === filter
            return (
              <button
                key={filter}
                onClick={() => onSelect(filter)}
                style={{
                  minHeight: 60,
                  borderRadius: 16,
                  border: "1px solid transparent",
                  backgroundColor: selected ? "rgba(255,255,255,0.055)" : "transparent",
                  color: "white",
                  cursor: "pointer",
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  textAlign: "left",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "rgba(255,255,255,0.07)",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.66)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {icons[filter]}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 17, fontWeight: 780, color: "rgba(255,255,255,0.95)" }}>{labels[filter]}</span>
                  </span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 780, color: "rgba(255,255,255,0.42)" }}>{counts[filter]}</span>
                  {selected && (
                    <span style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
          <div style={{ padding: "30px 0", display: "flex", justifyContent: "center" }}>
            <Spinner color={SIGNAL_GREEN} />
          </div>
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
          {["Share project galleries with clients", "Branded gallery link - your colors", "Client sees only the photos you choose"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: `${SIGNAL_GREEN}18`, border: `1px solid ${SIGNAL_GREEN}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span style={{ ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{f}</span>
            </div>
          ))}
        </div>
        <a href="/billing" onClick={onClose} style={{
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
function AddToAlbumSheet({ album, onTakePhoto, onUpload, onUseExisting, onClose }: {
  album: Album
  onTakePhoto: () => void
  onUpload: () => void
  onUseExisting: () => void
  onClose: () => void
}) {
  const context = albumContextLine(album)
  const displayName = albumDisplayName(album, album.album_type === "job")
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
      label: "Use photo from Found",
      sub: "Pick one already in your library",
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
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70, backgroundColor: "#101411", borderTop: "1px solid rgba(255,255,255,0.1)", borderRadius: "28px 28px 0 0", padding: "14px 24px calc(env(safe-area-inset-bottom, 0px) + 36px)" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 22px" }}/>
        <h3 style={{ margin: "0 0 8px", ...TYPE.title, color: "white", lineHeight: 1.08, overflowWrap: "anywhere" }}>Add photos to {displayName}</h3>
        {context && (
          <p style={{ margin: "0 0 22px", ...TYPE.subhead, fontWeight: 600, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, lineHeight: 1.35 }}>
            {context}
          </p>
        )}
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
        <h3 style={{ margin: 0, ...TYPE.subhead, fontWeight: 700, color: "white" }}>Use photo from Found</h3>
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
function ShareSheet({ album, siteSlug, customDomain, usesJobs, copied, onShare, onClose }: {
  album: Album
  siteSlug: string
  customDomain: string | null
  usesJobs: boolean
  copied: boolean
  onShare: (album: Album) => void
  onClose: () => void
}) {
  const displayName = albumDisplayName(album, usesJobs)
  const url = siteSlug ? `${getPublicSiteOrigin(siteSlug, customDomain)}/gallery/${albumPublicSlug(album, usesJobs)}` : null

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 60, backdropFilter: "blur(4px)" }}/>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70, backgroundColor: "#101411", borderTop: "1px solid rgba(255,255,255,0.1)", borderRadius: "28px 28px 0 0", padding: "14px 24px 40px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 22px" }}/>
        <h3 style={{ margin: "0 0 6px", ...TYPE.title, color: "white" }}>Share with Client</h3>
        <p style={{ margin: "0 0 22px", ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
          Send this link to your client. They&apos;ll see only photos from <strong style={{ color: "white", fontWeight: 700 }}>{displayName}</strong>.
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
