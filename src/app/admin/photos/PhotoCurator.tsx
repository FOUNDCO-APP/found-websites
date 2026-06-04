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

const DONE_THRESHOLD = 8

export default function PhotoCurator() {
  const [activeIndustry, setActiveIndustry] = useState("home_services")
  const [photos, setPhotos] = useState<Record<string, PexelsPhoto[] | "loading">>({})
  const [selected, setSelected] = useState<Record<string, Set<number>>>({})
  const [approvedCounts, setApprovedCounts] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [savedIndustry, setSavedIndustry] = useState<string | null>(null)

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
    // Clear saved banner when user starts selecting again
    if (savedIndustry === industry) setSavedIndustry(null)
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
  const currentApproved = approvedCounts[activeIndustry] || 0
  const doneCount = INDUSTRIES.filter(i => (approvedCounts[i.key] || 0) >= DONE_THRESHOLD).length
  const justSaved = savedIndustry === activeIndustry

  async function handleApprove() {
    const photoList = currentPhotos && currentPhotos !== "loading" ? currentPhotos : []
    const toSave = photoList
      .filter(p => selectedSet.has(p.id))
      .map(p => ({ url: p.url, desc: p.desc }))

    if (!toSave.length) return
    setSaving(true)
    const result = await saveApprovedPhotos(activeIndustry, toSave)
    if (result.success) {
      setSelected(prev => ({ ...prev, [activeIndustry]: new Set() }))
      setSavedIndustry(activeIndustry)
      await loadCounts()
    }
    setSaving(false)
  }

  const showBottomBar = selectedCount > 0 || justSaved

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#111111" }}>

      {/* Header + progress */}
      <div className="px-6 pt-8 pb-4">
        <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: "#2E7D32" }}>
          Found Co. Admin
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl font-black text-white">Photo Curation</h1>
          <p className="text-sm font-black pb-0.5" style={{ color: doneCount === 11 ? "#2E7D32" : "#555" }}>
            {doneCount === 11 ? "✓ All done!" : `${doneCount} / 11 complete`}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 rounded-full w-full" style={{ backgroundColor: "#222" }}>
          <div
            className="h-1 rounded-full transition-all duration-500"
            style={{ backgroundColor: "#2E7D32", width: `${(doneCount / 11) * 100}%` }}
          />
        </div>
      </div>

      {/* Industry tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 px-6 pb-4 min-w-max">
          {INDUSTRIES.map(ind => {
            const count = approvedCounts[ind.key] || 0
            const isDone = count >= DONE_THRESHOLD
            const isActive = activeIndustry === ind.key
            const hasPhotos = count > 0

            return (
              <button
                key={ind.key}
                onClick={() => setActiveIndustry(ind.key)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide whitespace-nowrap transition-all"
                style={{
                  backgroundColor: isActive ? "#2E7D32" : isDone ? "#1a2e1a" : "#222222",
                  color: isActive ? "#ffffff" : isDone ? "#4caf50" : hasPhotos ? "#bbbbbb" : "#666666",
                  border: isActive ? "none" : isDone ? "1px solid #2E7D32" : "1px solid #333",
                }}
              >
                {isDone && !isActive && (
                  <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {ind.label}
                {count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                    style={{
                      backgroundColor: isActive ? "rgba(255,255,255,0.25)" : isDone ? "#2E7D32" : "#333",
                      color: "#fff",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Current industry status strip */}
      <div className="px-6 pb-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#444" }}>
          {INDUSTRIES.find(i => i.key === activeIndustry)?.label}
        </p>
        {currentApproved > 0 && (
          <p className="text-xs font-black" style={{ color: currentApproved >= DONE_THRESHOLD ? "#2E7D32" : "#888" }}>
            {currentApproved >= DONE_THRESHOLD ? `✓ ${currentApproved} approved — done` : `${currentApproved} approved — need ${DONE_THRESHOLD - currentApproved} more`}
          </p>
        )}
      </div>

      {/* Photo grid */}
      <div className="px-3 pb-36">
        {!currentPhotos || currentPhotos === "loading" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-video bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : currentPhotos.length === 0 ? (
          <p className="text-center py-20" style={{ color: "#444" }}>No photos found.</p>
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
                  {!isSelected && (
                    <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.15)" }} />
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: "rgba(46,125,50,0.4)" }}>
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg">
                        <svg width="18" height="18" fill="none" stroke="#2E7D32" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
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

      {/* Fixed bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 px-6 py-4 flex items-center justify-between"
        style={{
          backgroundColor: justSaved ? "#1a2e1a" : "#1a1a1a",
          borderTop: justSaved ? "1px solid #2E7D32" : "1px solid #333",
          transform: showBottomBar ? "translateY(0)" : "translateY(100%)",
          transition: "transform 300ms ease, background-color 300ms ease, border-color 300ms ease",
        }}
      >
        {justSaved ? (
          <>
            <div>
              <p className="font-black text-sm" style={{ color: "#4caf50" }}>
                ✓ Saved — {currentApproved} photos approved
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#4caf50", opacity: 0.7 }}>
                {currentApproved >= DONE_THRESHOLD
                  ? "This industry is complete. Move to the next tab."
                  : `Need ${DONE_THRESHOLD - currentApproved} more to complete this industry.`}
              </p>
            </div>
            <button
              onClick={() => {
                const idx = INDUSTRIES.findIndex(i => i.key === activeIndustry)
                const next = INDUSTRIES[idx + 1]
                if (next) {
                  setSavedIndustry(null)
                  setActiveIndustry(next.key)
                } else {
                  setSavedIndustry(null)
                }
              }}
              className="px-5 py-3 font-black text-xs uppercase tracking-widest rounded-full"
              style={{ backgroundColor: "#2E7D32", color: "#ffffff" }}
            >
              {INDUSTRIES.findIndex(i => i.key === activeIndustry) < INDUSTRIES.length - 1 ? "Next →" : "Done"}
            </button>
          </>
        ) : (
          <>
            <p className="font-black text-sm text-white">
              {selectedCount} photo{selectedCount !== 1 ? "s" : ""} selected
            </p>
            <button
              onClick={handleApprove}
              disabled={saving || selectedCount === 0}
              className="px-6 py-3 font-black text-xs uppercase tracking-widest rounded-full disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: "#2E7D32", color: "#ffffff" }}
            >
              {saving ? "Saving…" : "Approve"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
