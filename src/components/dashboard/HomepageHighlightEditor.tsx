"use client"

import { useEffect, useRef, useState } from "react"
import { Upload, Image, Trash2, Check } from "lucide-react"
import {
  uploadHighlightImage,
  publishHomepageHighlight,
  disableHomepageHighlight,
  type HighlightPhoto,
} from "@/app/dashboard/(app)/site/highlightActions"
import { isVideoMedia } from "@/lib/mediaKind"

export type HomepageHighlightEditorProps = {
  companyName: string
  photos: HighlightPhoto[]
  enabled: boolean
  currentImage: string | null
  onPublished: (result: { photo: HighlightPhoto; clearedPhotoIds: string[] }) => void
  onDisabled: () => void
  onUploaded?: (photo: HighlightPhoto) => void
  onBusyChange?: (busy: boolean) => void
}

export default function HomepageHighlightEditor({ companyName, photos, enabled, currentImage, onPublished, onDisabled, onUploaded, onBusyChange }: HomepageHighlightEditorProps) {
  const [uploads, setUploads] = useState<HighlightPhoto[]>([])
  const [draft, setDraft] = useState<HighlightPhoto | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [busy, setBusy] = useState<"upload" | "publish" | "disable" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const locked = useRef(false)
  const mounted = useRef(true)
  const busyCallback = useRef(onBusyChange)
  busyCallback.current = onBusyChange
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      busyCallback.current?.(false)
    }
  }, [])

  const images = [...new Map([...photos, ...uploads].map(photo => [photo.id, photo])).values()]
    .filter(photo => photo.media_type !== "video" && !isVideoMedia(photo.url))
  const preview = draft?.url ?? currentImage
  const selected = draft ?? images.find(photo => photo.url === currentImage) ?? null
  const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#32D074]"

  async function run(operation: "upload" | "publish" | "disable", action: () => Promise<void>) {
    if (locked.current) return
    locked.current = true
    setBusy(operation)
    setError(null)
    setNotice(null)
    try {
      busyCallback.current?.(true)
      await action()
    } catch {
      if (mounted.current) setError("The update could not be confirmed. Refresh before trying again.")
    } finally {
      locked.current = false
      if (mounted.current) {
        setBusy(null)
        busyCallback.current?.(false)
      }
    }
  }

  async function upload(file: File) {
    if (locked.current) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
      setError("Choose a JPEG, PNG or WebP image up to 10 MB.")
      return
    }
    await run("upload", async () => {
      const formData = new FormData()
      formData.append("file", file)
      const result = await uploadHighlightImage(formData)
      if (!mounted.current) return
      if ("error" in result) { setError(result.error); return }
      setUploads(previous => [...previous.filter(photo => photo.id !== result.photo.id), result.photo])
      setDraft(result.photo)
      setChoosing(false)
      onUploaded?.(result.photo)
    })
  }

  async function publish() {
    if (!selected) return
    await run("publish", async () => {
      const result = await publishHomepageHighlight({ photoId: selected.id })
      if (!mounted.current) return
      if ("error" in result) { setError(result.error); return }
      setDraft(null)
      setChoosing(false)
      setNotice("Highlight published.")
      onPublished(result)
    })
  }

  async function turnOff() {
    await run("disable", async () => {
      const result = await disableHomepageHighlight()
      if (!mounted.current) return
      if ("error" in result) { setError(result.error); return }
      setDraft(null)
      setNotice("Highlight turned off. Your photos are kept.")
      onDisabled()
    })
  }

  return <section aria-label="Homepage highlight" className="min-w-0 space-y-4 text-white">
    <div className="flex flex-wrap gap-2">
      <input ref={input} type="file" className="sr-only" aria-label="Upload highlight image" accept="image/jpeg,image/png,image/webp" disabled={!!busy}
        onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file) }} />
      <button type="button" className={`${button} bg-white/10`} disabled={!!busy} onClick={() => input.current?.click()}>
        <Upload size={18} aria-hidden="true" />{preview ? "Replace photo or flyer" : "Upload photo or flyer"}
      </button>
      <button type="button" className={button} disabled={!!busy} aria-expanded={choosing} onClick={() => setChoosing(value => !value)}>
        <Image size={18} aria-hidden="true" />Choose from Photos
      </button>
    </div>
    {choosing && <div aria-label="Photos" className="space-y-2" onKeyDown={event => { if (event.key === "Escape") setChoosing(false) }}>
      {images.length ? <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
        {images.map((photo, index) => <button key={photo.id} type="button" aria-label={`Choose photo ${index + 1}`} aria-pressed={selected?.id === photo.id}
          disabled={!!busy} className={`relative aspect-[4/3] min-w-0 overflow-hidden rounded-lg border-2 bg-black/20 focus-visible:outline-2 focus-visible:outline-[#32D074] ${selected?.id === photo.id ? "border-[#32D074]" : "border-white/10"}`}
          onClick={() => { setDraft(photo); setChoosing(false); setError(null); setNotice(null) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={`Photo ${index + 1}`} className="h-full w-full object-contain" />
        </button>)}
      </div> : <p className="text-sm text-white/60">No photos yet.</p>}
    </div>}
    {preview && <div className="flex h-[min(420px,60vh)] min-h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview} alt={`${companyName} homepage highlight preview`} className="h-full max-h-[420px] w-full object-contain" />
    </div>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={`${button} border-transparent bg-[#32D074] !text-black`} disabled={!!busy || !selected || (enabled && !draft)} onClick={() => void publish()}>
        <Check size={18} aria-hidden="true" />Publish highlight
      </button>
      {draft && <button type="button" className={button} disabled={!!busy} onClick={() => { setDraft(null); setChoosing(false); setError(null); setNotice(null) }}>Cancel changes</button>}
      {enabled && <button type="button" className={button} disabled={!!busy} onClick={() => void turnOff()}><Trash2 size={18} aria-hidden="true" />Turn off highlight</button>}
    </div>
    {busy && <p role="status" className="text-sm text-white/60">{busy === "upload" ? "Uploading image..." : busy === "publish" ? "Publishing highlight..." : "Turning off highlight..."}</p>}
    {draft && !busy && <p role="status" className="text-sm text-white/60">Unpublished changes</p>}
    {notice && <p role="status" className="text-sm text-white/70">{notice}</p>}
    {error && <p role="alert" className="break-words text-sm text-red-300">{error}</p>}
  </section>
}
