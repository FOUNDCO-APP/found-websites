"use client"
import { useState, useEffect, useCallback } from "react"
import { fetchIndustryPhotos, saveApprovedPhotos, getApprovedCounts, type PexelsPhoto } from "./actions"

const INDUSTRIES = [
  { key: "home_services", label: "Home Services" },
  { key: "food",          label: "Food" },
  { key: "wellness",      label: "Wellness" },
  { key: "events",        label: "Events" },
  { key: "retail",        label: "Retail" },
  { key: "fitness",       label: "Fitness" },
  { key: "beauty",        label: "Beauty" },
  { key: "automotive",    label: "Automotive" },
  { key: "pet_services",  label: "Pet Services" },
  { key: "cleaning",      label: "Cleaning" },
  { key: "landscaping",   label: "Landscaping" },
]

export default function PhotoCurator() {
  const [activeIndustry, setActiveIndustry] = useState("home_services")
  const [photos, setPhotos] = useState<Record<string, PexelsPhoto[] | "loading">>({})
  const [selected, setSelected] = useState<Record<string, Set<number>>>({})
  const [approvedCounts, setApprovedCounts] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  const loadCounts = useCallback(async () => {
    const counts = await getApprovedCounts()
    setApprovedCounts(counts)
  }, [])

  useEffect(() => { loadCounts() }, [loadCounts])

  const loadPhotos = useCallback(async (industry: string) => {
    if (photos[industry]) return
    setPhotos(prev => ({ ...prev, [industry]: "loading" }))
    const results = await fetchIndustryPhotos(industry)
    setPhotos(prev => ({ ...prev, [industry]: results }))
  }, [photos])

  useEffect(() => { loadPhotos(activeIndustry) }, [activeIndustry, loadPhotos])

  function togglePhoto(industry: string, photoId: number) {
    setSelected(prev => {
      const set = new Set(prev[industry] || [])
      if (set.has(photoId)) set.delete(photoId)
      else set.add(photoId)
      return { ...prev, [industry]: set }
    })
  }

  const selectedSet = selected[activeIndustry] || new Set<number>()
  const currentPhotos = photos[activeIndustry]
  const selectedCount = selectedSet.size

  async function handleApprove() {
    const photoList = currentPhotos && currentPhotos !== "loading" ? currentPhotos : []
    const toSave = photoList
      .filter(p => selectedSet.has(p.id))
      .map(p => ({ url: p.url, desc: p.desc }))

    if (!toSave.length) return
    setSaving(true)
    setSaveStatus("idle")

    const result = await saveApprovedPhotos(activeIndustry, toSave)

    if (result.success) {
      setSaveStatus("success")
      setSelected(prev => ({ ...prev, [activeIndustry]: new Set() }))
      await loadCounts()
      setTimeout(() => setSaveStatus("idle"), 3000)
    } else {
      setSaveStatus("error")
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#111111" }}>

      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: "#2E7D32" }}>Found Co. Admin</p>
        <h1 className="text-2xl font-black text-white">Photo Curation</h1>
        <p className="text-sm mt-1" style={{ color: "#666" }}>Tap photos to select, then approve to save to the database.</p>
      </div>

      {/* Industry tabs — horizontal scroll */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 px-6 pb-4 min-w-max">
          {INDUSTRIES.map(ind => {
            const count = approvedCounts[ind.key] || 0
            const isActive = activeIndustry === ind.key
            return (
              <button
                key={ind.key}
                onClick={() => setActiveIndustry(ind.key)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: isActive ? "#2E7D32" : "#222222",
                  color: isActive ? "#ffffff" : "#888888",
                  border: isActive ? "none" : "1px solid #333",
                }}
              >
                {ind.label}
                {count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                    style={{ backgroundColor: isActive ? "rgba(255,255,255,0.3)" : "#2E7D32", color: "#fff" }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Photo grid */}
      <div className="px-3 pb-32">
        {!currentPhotos || currentPhotos === "loading" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-video bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : currentPhotos.length === 0 ? (
          <p className="text-center py-20 text-white/30">No photos found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {currentPhotos.map(photo => {
              const isSelected = selectedSet.has(photo.id)
              return (
                <button
                  key={photo.id}
                  onClick={() => togglePhoto(activeIndustry, photo.id)}
                  className="relative aspect-video overflow-hidden rounded focus:outline-none"
                  style={{ border: isSelected ? "3px solid #2E7D32" : "3px solid transparent" }}
                >
                  <img
                    src={photo.thumb}
                    alt={photo.desc}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Dark overlay when not selected */}
                  {!isSelected && (
                    <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.15)" }} />
                  )}
                  {/* Selected overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: "rgba(46,125,50,0.35)" }}>
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                        <svg width="16" height="16" fill="none" stroke="#2E7D32" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {/* Description on hover/bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 hover:opacity-100 transition-opacity"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                    <p className="text-[10px] text-white leading-tight line-clamp-2">{photo.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Fixed bottom bar — approve button */}
      <div
        className="fixed bottom-0 left-0 right-0 px-6 py-4 flex items-center justify-between"
        style={{
          backgroundColor: "#1a1a1a",
          borderTop: "1px solid #333",
          transform: selectedCount > 0 || saveStatus !== "idle" ? "translateY(0)" : "translateY(100%)",
          transition: "transform 300ms ease",
        }}
      >
        <div>
          {saveStatus === "success" ? (
            <p className="font-black text-sm" style={{ color: "#2E7D32" }}>
              ✓ {INDUSTRIES.find(i => i.key === activeIndustry)?.label} photos saved
            </p>
          ) : saveStatus === "error" ? (
            <p className="font-black text-sm text-red-400">Error saving. Try again.</p>
          ) : (
            <p className="font-black text-sm text-white">
              {selectedCount} photo{selectedCount !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>
        <button
          onClick={handleApprove}
          disabled={saving || selectedCount === 0}
          className="px-6 py-3 font-black text-xs uppercase tracking-widest rounded-full disabled:opacity-40 transition-opacity"
          style={{ backgroundColor: "#2E7D32", color: "#ffffff" }}
        >
          {saving ? "Saving…" : "Approve"}
        </button>
      </div>
    </div>
  )
}
