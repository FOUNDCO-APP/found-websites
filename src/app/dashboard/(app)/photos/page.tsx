"use client"

import React, { useState, useEffect, useRef } from "react"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#080A09"

type Photo = {
  id: string
  url: string
  for_website: boolean
  for_social: boolean
  website_section: string | null
  created_at: string
}

type View = "queue" | "website" | "social"

export default function PhotosPage() {
  const [view, setView] = useState<View>("queue")
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/photos")
      .then(r => r.json())
      .then(d => { setPhotos(d.photos ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/photos", { method: "POST", body: form })
    const data = await res.json()
    if (data.photo) setPhotos(prev => [data.photo, ...prev])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function flag(id: string, field: "for_website" | "for_social", current: boolean) {
    const res = await fetch("/api/photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: !current }),
    })
    const data = await res.json()
    if (data.photo) setPhotos(prev => prev.map(p => p.id === id ? data.photo : p))
  }

  async function remove(photo: Photo) {
    await fetch("/api/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photo.id, storage_path: photo.url }),
    })
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  const queue = photos.filter(p => !p.for_website && !p.for_social)
  const website = photos.filter(p => p.for_website)
  const social = photos.filter(p => p.for_social)

  const currentPhotos = view === "queue" ? queue : view === "website" ? website : social

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "32px 24px 20px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 200, color: "white", letterSpacing: "-0.04em" }}>
            Photos
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
            {photos.length === 0 ? "Your work, beautifully organized" : `${photos.length} photo${photos.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* Upload button */}
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
          width: 44, height: 44, borderRadius: "50%",
          backgroundColor: SIGNAL_GREEN,
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 16px ${SIGNAL_GREEN}44`,
          opacity: uploading ? 0.6 : 1,
        }}>
          {uploading ? (
            <div style={{
              width: 18, height: 18, borderRadius: "50%",
              border: `2px solid ${FOUND_BLACK}44`,
              borderTopColor: FOUND_BLACK,
              animation: "spin 0.8s linear infinite",
            }}/>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment"
          onChange={handleUpload} style={{ display: "none" }} />
      </div>

      {/* View selector — minimal, not a database tab */}
      <div style={{ padding: "0 24px 20px", display: "flex", gap: 0 }}>
        {(["queue", "website", "social"] as View[]).map((v, i) => {
          const labels = { queue: "New", website: "Website", social: "Social" }
          const counts = { queue: queue.length, website: website.length, social: social.length }
          const active = view === v
          return (
            <button key={v} onClick={() => setView(v)} style={{
              flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
              backgroundColor: "transparent",
              borderBottom: `2px solid ${active ? SIGNAL_GREEN : "rgba(255,255,255,0.08)"}`,
              color: active ? "white" : "rgba(255,255,255,0.3)",
              fontSize: 13, fontWeight: active ? 700 : 500,
              transition: "all 0.15s ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {labels[v]}
              {counts[v] > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  backgroundColor: active ? SIGNAL_GREEN : "rgba(255,255,255,0.1)",
                  color: active ? FOUND_BLACK : "rgba(255,255,255,0.4)",
                  borderRadius: 100, padding: "2px 6px",
                }}>{counts[v]}</span>
              )}
            </button>
          )
        })}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Content */}
      <div style={{ flex: 1, padding: "0 24px 32px" }}>
        {loading ? (
          <div style={{ paddingTop: 80, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
            Loading…
          </div>
        ) : currentPhotos.length === 0 ? (
          <EmptyState view={view} onAdd={() => fileRef.current?.click()} />
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 3,
          }}>
            {currentPhotos.map(photo => (
              <PhotoCard key={photo.id} photo={photo} onFlag={flag} onRemove={remove} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function PhotoCard({ photo, onFlag, onRemove }: {
  photo: Photo
  onFlag: (id: string, field: "for_website" | "for_social", current: boolean) => void
  onRemove: (photo: Photo) => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", aspectRatio: "1" }}>
      {/* Photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt="Business photo"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onClick={() => setShowActions(v => !v)}
      />

      {/* Flag badges — always visible */}
      <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4 }}>
        {photo.for_website && (
          <span style={{
            fontSize: 12, backgroundColor: "rgba(0,0,0,0.7)",
            borderRadius: 6, padding: "2px 6px", backdropFilter: "blur(8px)",
          }}>❤️</span>
        )}
        {photo.for_social && (
          <span style={{
            fontSize: 12, backgroundColor: "rgba(0,0,0,0.7)",
            borderRadius: 6, padding: "2px 6px", backdropFilter: "blur(8px)",
          }}>⭐</span>
        )}
      </div>

      {/* Action overlay — tap photo to reveal */}
      {showActions && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundColor: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 10, padding: 16,
        }} onClick={() => setShowActions(false)}>
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <button onClick={e => { e.stopPropagation(); onFlag(photo.id, "for_website", photo.for_website) }} style={{
              flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer",
              backgroundColor: photo.for_website ? "#FF4B8B" : "rgba(255,255,255,0.15)",
              fontSize: 18,
            }}>❤️</button>
            <button onClick={e => { e.stopPropagation(); onFlag(photo.id, "for_social", photo.for_social) }} style={{
              flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer",
              backgroundColor: photo.for_social ? "#FFB800" : "rgba(255,255,255,0.15)",
              fontSize: 18,
            }}>⭐</button>
          </div>
          <button onClick={e => { e.stopPropagation(); onRemove(photo) }} style={{
            width: "100%", padding: "8px 0", borderRadius: 12, border: "none",
            cursor: "pointer", backgroundColor: "rgba(255,70,70,0.2)",
            color: "#FF4646", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
          }}>REMOVE</button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ view, onAdd }: { view: View; onAdd: () => void }) {
  const content = {
    queue: {
      emoji: "📸",
      title: "Take your first photo.",
      sub: "Tap the camera button above. Photos stay here — not in your camera roll.",
      cta: "Add a Photo",
    },
    website: {
      emoji: "❤️",
      title: "No website photos yet.",
      sub: "Heart any photo in the New tab and it'll appear here ready for your site.",
      cta: null,
    },
    social: {
      emoji: "⭐",
      title: "No social photos yet.",
      sub: "Star any photo in the New tab and Found will format it with your branding.",
      cta: null,
    },
  }[view]

  return (
    <div style={{ paddingTop: 60, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>{content.emoji}</div>
      <p style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 200, color: "white", letterSpacing: "-0.03em" }}>
        {content.title}
      </p>
      <p style={{ margin: "0 0 32px", fontSize: 14, color: "rgba(255,255,255,0.3)", lineHeight: 1.7 }}>
        {content.sub}
      </p>
      {content.cta && (
        <button onClick={onAdd} style={{
          padding: "14px 32px", borderRadius: 100,
          backgroundColor: SIGNAL_GREEN, border: "none",
          color: FOUND_BLACK, fontSize: 14, fontWeight: 700,
          cursor: "pointer",
          boxShadow: `0 4px 20px ${SIGNAL_GREEN}44`,
        }}>
          {content.cta}
        </button>
      )}
    </div>
  )
}
