"use client"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import {
  fetchIndustryPhotos, saveApprovedPhotos, saveTeamPicks, promoteToLive,
  getApprovedCounts, getPendingCounts, getApprovedUrls, getTeamPickUrls,
  getTeamPicks, removePendingPhoto, type PexelsPhoto
} from "./actions"

const INDUSTRIES = [
  { key: "home_services",        label: "Home Services" },
  { key: "food",                 label: "Food" },
  { key: "wellness",             label: "Wellness" },
  { key: "events",               label: "Events" },
  { key: "retail",               label: "Retail" },
  { key: "fitness",              label: "Fitness" },
  { key: "beauty",               label: "Beauty" },
  { key: "automotive",           label: "Automotive" },
  { key: "pet_services",         label: "Pet Services" },
  { key: "cleaning",             label: "Cleaning" },
  { key: "landscaping",          label: "Landscaping" },
  { key: "real_estate",          label: "Real Estate" },
  { key: "creative_services",    label: "Creative Services",    owner: "Jony" },
  { key: "home_based_food",      label: "Home-Based Food",      owner: "Angela" },
  { key: "education",            label: "Education",            owner: "Angela" },
  { key: "music_performance",    label: "Music & Performance",  owner: "Jony" },
  { key: "professional_services",label: "Professional Services",owner: "Marcus" },
  { key: "healthcare",           label: "Healthcare",           owner: "Angela" },
  { key: "childcare",            label: "Childcare",            owner: "Angela" },
  { key: "makers_crafts",        label: "Makers & Crafts",      owner: "Jony" },
  { key: "home_property",        label: "Home & Property",      owner: "Jony" },
  { key: "audio_visual",         label: "Audio & Visual",       owner: "Jony" },
  { key: "nonprofit",            label: "Nonprofit",            owner: "Marcus" },
]

// New industries that need the two-step team → Shawn approval flow
const NEW_INDUSTRIES = new Set([
  "creative_services","home_based_food","education","music_performance",
  "professional_services","healthcare","childcare","makers_crafts","home_property","audio_visual","nonprofit",
])

const DONE_THRESHOLD = 8

export default function PhotoCurator() {
  const [activeIndustry, setActiveIndustry] = useState("home_services")
  const [photos, setPhotos] = useState<Record<string, PexelsPhoto[] | "loading">>({})
  const [selected, setSelected] = useState<Record<string, Set<number>>>({})
  const [approvedCounts, setApprovedCounts] = useState<Record<string, number>>({})
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [savedIndustry, setSavedIndustry] = useState<string | null>(null)
  const [saveMode, setSaveMode] = useState<"team" | "live" | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [activeQuery, setActiveQuery] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<{ url: string; desc: string; tag?: string | null }[]>([])
  const [removingPending, setRemovingPending] = useState<string | null>(null)

  const loadCounts = useCallback(async () => {
    const [approved, pending] = await Promise.all([getApprovedCounts(), getPendingCounts()])
    setApprovedCounts(approved)
    setPendingCounts(pending)
  }, [])

  useEffect(() => { loadCounts() }, [loadCounts])

  const loadPendingPhotos = useCallback(async (industry: string) => {
    if (NEW_INDUSTRIES.has(industry)) {
      const picks = await getTeamPicks(industry)
      setPendingPhotos(picks)
    } else {
      setPendingPhotos([])
    }
  }, [])

  const loadPhotos = useCallback(async (industry: string, customQuery?: string) => {
    const cacheKey = customQuery ? `${industry}::${customQuery}` : industry
    if (!customQuery && photos[industry]) return
    setPhotos(prev => ({ ...prev, [cacheKey]: "loading" }))

    // For new industries: pre-select team picks if any; otherwise pre-select live approved
    const isNew = NEW_INDUSTRIES.has(industry)
    const [results, preSelectUrls] = await Promise.all([
      fetchIndustryPhotos(industry, customQuery),
      customQuery ? Promise.resolve([] as string[])
        : isNew ? getTeamPickUrls(industry)
        : getApprovedUrls(industry),
    ])
    setPhotos(prev => ({ ...prev, [cacheKey]: results }))
    if (preSelectUrls.length > 0) {
      const urlSet = new Set(preSelectUrls)
      const preSelected = new Set(results.filter(p => urlSet.has(p.url)).map(p => p.id))
      if (preSelected.size > 0) {
        setSelected(prev => ({ ...prev, [industry]: new Set([...(prev[industry] || []), ...preSelected]) }))
      }
    }
  }, [photos])

  useEffect(() => {
    setActiveQuery(null)
    setSearchInput("")
    setSavedIndustry(null)
    setSaveMode(null)
    setPendingPhotos([])
    loadPhotos(activeIndustry)
    loadPendingPhotos(activeIndustry)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndustry])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchInput.trim()
    if (!q) return
    setSearching(true)
    setActiveQuery(q)
    await loadPhotos(activeIndustry, q)
    setSearching(false)
  }

  function clearSearch() {
    setActiveQuery(null)
    setSearchInput("")
  }

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
  const cacheKey = activeQuery ? `${activeIndustry}::${activeQuery}` : activeIndustry
  const currentPhotos = photos[cacheKey]
  const selectedCount = selectedSet.size
  const currentApproved = approvedCounts[activeIndustry] || 0
  const currentPending  = pendingCounts[activeIndustry]  || 0
  const isNewIndustry   = NEW_INDUSTRIES.has(activeIndustry)
  const activeOwner     = INDUSTRIES.find(i => i.key === activeIndustry)?.owner
  const doneCount = INDUSTRIES.filter(i => (approvedCounts[i.key] || 0) >= DONE_THRESHOLD).length
  const justSaved = savedIndustry === activeIndustry

  // Team submits picks for Shawn's review — goes to pending, NOT live
  async function handleTeamSubmit() {
    const photoList = currentPhotos && currentPhotos !== "loading" ? currentPhotos : []
    const toSave = photoList.filter(p => selectedSet.has(p.id)).map(p => ({ url: p.url, desc: p.desc }))
    if (!toSave.length) return
    setSaving(true)
    setSaveError(null)
    const result = await saveTeamPicks(activeIndustry, toSave, activeQuery || undefined)
    if (result.success) {
      setSavedIndustry(activeIndustry)
      setSaveMode("team")
      await loadCounts()
      await loadPendingPhotos(activeIndustry)
    } else {
      setSaveError(result.error || "Submit failed")
    }
    setSaving(false)
  }

  // Shawn approves: save any new selections first, then promote everything to live
  async function handlePromoteToLive() {
    setSaving(true)
    setSaveError(null)
    // If the user selected additional photos from the grid, save them to pending first
    const photoList = currentPhotos && currentPhotos !== "loading" ? currentPhotos : []
    const newPicks = photoList.filter(p => selectedSet.has(p.id)).map(p => ({ url: p.url, desc: p.desc }))
    if (newPicks.length > 0) {
      await saveTeamPicks(activeIndustry, newPicks, activeQuery || undefined)
    }
    const result = await promoteToLive(activeIndustry)
    if (result.success) {
      setSavedIndustry(activeIndustry)
      setSaveMode("live")
      setPendingPhotos([])
      await loadCounts()
    } else {
      setSaveError(result.error || "Approve failed")
    }
    setSaving(false)
  }

  async function handleRemovePending(url: string) {
    setRemovingPending(url)
    const result = await removePendingPhoto(activeIndustry, url)
    if (result.success) {
      setPendingPhotos(prev => prev.filter(p => p.url !== url))
      await loadCounts()
    }
    setRemovingPending(null)
  }

  // Original approve — used for already-live original 12 industries
  async function handleApprove() {
    const photoList = currentPhotos && currentPhotos !== "loading" ? currentPhotos : []
    const toSave = photoList.filter(p => selectedSet.has(p.id)).map(p => ({ url: p.url, desc: p.desc }))
    if (!toSave.length) return
    setSaving(true)
    setSaveError(null)
    const result = await saveApprovedPhotos(activeIndustry, toSave, activeQuery || undefined)
    if (result.success) {
      setSavedIndustry(activeIndustry)
      setSaveMode("live")
      await loadCounts()
    } else {
      setSaveError(result.error || "Save failed")
    }
    setSaving(false)
  }

  const showBottomBar = selectedCount > 0 || justSaved

  return (
    <div className="min-h-screen hq-photo-page" style={{ backgroundColor: "var(--hq-bg)" }}>

      {/* Header + progress */}
      <div className="px-6 pt-8 pb-4">
        <Link href="/admin/more" className="hq-back-link"><span className="hq-back-chevron" />More</Link>
        <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: "var(--hq-green)" }}>
          Quality
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl font-black" style={{ color: "var(--hq-text)" }}>Photo library</h1>
          <p className="text-sm font-black pb-0.5" style={{ color: doneCount === INDUSTRIES.length ? "var(--hq-green)" : "var(--hq-muted)" }}>
            {doneCount === INDUSTRIES.length ? "All done" : `${doneCount} / ${INDUSTRIES.length} complete`}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 rounded-full w-full" style={{ backgroundColor: "var(--hq-surface-raised)" }}>
          <div
            className="h-1 rounded-full transition-all duration-500"
            style={{ backgroundColor: "var(--hq-green)", width: `${(doneCount / INDUSTRIES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Industry tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 px-6 pb-4 min-w-max">
          {INDUSTRIES.map(ind => {
            const liveCount    = approvedCounts[ind.key] || 0
            const pendingCount = pendingCounts[ind.key]  || 0
            const isDone       = liveCount >= DONE_THRESHOLD
            const hasPending   = pendingCount > 0 && !isDone
            const isActive     = activeIndustry === ind.key
            const isNew        = NEW_INDUSTRIES.has(ind.key)

            return (
              <button
                key={ind.key}
                onClick={() => setActiveIndustry(ind.key)}
                className="flex items-center gap-2 px-4 py-2 rounded text-xs font-black uppercase tracking-wide whitespace-nowrap transition-all"
                style={{
                  backgroundColor: isActive ? "var(--hq-green)" : isDone ? "rgba(50,208,116,0.1)" : hasPending ? "rgba(217,189,104,0.12)" : "var(--hq-surface-raised)",
                  color: isActive ? "var(--hq-bg)" : isDone ? "var(--hq-green)" : hasPending ? "var(--hq-amber)" : isNew ? "var(--hq-dim)" : liveCount > 0 ? "var(--hq-muted)" : "var(--hq-dim)",
                  border: isActive ? "none" : isDone ? "1px solid var(--hq-green)" : hasPending ? "1px solid var(--hq-amber)" : "1px solid var(--hq-border-strong)",
                }}
              >
                {isDone && !isActive && (
                  <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {ind.label}
                {/* Live count badge */}
                {liveCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                    style={{ backgroundColor: isActive ? "rgba(255,255,255,0.25)" : isDone ? "var(--hq-green)" : "var(--hq-border-strong)", color: isActive || isDone ? "var(--hq-bg)" : "var(--hq-text)" }}>
                    {liveCount}
                  </span>
                )}
                {/* Pending badge — amber */}
                {hasPending && !isActive && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                    style={{ backgroundColor: "var(--hq-amber)", color: "var(--hq-bg)" }}>
                    {pendingCount} pending
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Current industry status strip */}
      <div className="px-6 pb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--hq-dim)" }}>
            {INDUSTRIES.find(i => i.key === activeIndustry)?.label}
          </p>
          {activeOwner && (
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--hq-dim)" }}>
              / {activeOwner}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {currentPending > 0 && (
            <p className="text-xs font-black" style={{ color: "var(--hq-amber)" }}>
              {currentPending} pending
            </p>
          )}
          {currentApproved > 0 && (
            <p className="text-xs font-black" style={{ color: "var(--hq-green)" }}>
              {currentApproved} live
            </p>
          )}
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="px-6 pb-4 flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder={`Search Pexels... e.g. "spa facial treatment"`}
          className="flex-1 px-4 py-2.5 text-sm rounded border focus:outline-none"
          style={{ backgroundColor: "var(--hq-surface)", color: "var(--hq-text)", borderColor: "var(--hq-border-strong)" }}
        />
        <button
          type="submit"
          disabled={searching || !searchInput.trim()}
          className="px-5 py-2.5 font-black text-xs uppercase tracking-widest rounded disabled:opacity-40 transition-opacity shrink-0"
          style={{ backgroundColor: "var(--hq-green)", color: "var(--hq-bg)" }}
        >
          {searching ? "..." : "Search"}
        </button>
        {activeQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="px-4 py-2.5 text-xs font-black uppercase tracking-widest rounded shrink-0"
            style={{ backgroundColor: "var(--hq-surface-raised)", color: "var(--hq-muted)" }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Active search indicator */}
      {activeQuery && (
        <div className="px-6 pb-3">
          <p className="text-xs" style={{ color: "var(--hq-dim)" }}>
            Showing results for <span className="font-black" style={{ color: "var(--hq-muted)" }}>&quot;{activeQuery}&quot;</span>
            {" / "}
            <button onClick={clearSearch} className="underline" style={{ color: "var(--hq-dim)" }}>
              back to defaults
            </button>
          </p>
        </div>
      )}

      {/* Pending Review section — shows stored picks for new industries */}
      {isNewIndustry && pendingPhotos.length > 0 && (
        <div className="px-3 mb-6">
          <div className="flex items-center gap-3 mb-3 px-3">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--hq-amber)" }}>
              Pending review - team picks
            </p>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black" style={{ backgroundColor: "var(--hq-amber)", color: "var(--hq-bg)" }}>
              {pendingPhotos.length}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {pendingPhotos.map(photo => (
              <div key={photo.url} className="relative rounded overflow-hidden" style={{ border: "2px solid var(--hq-amber)" }}>
                <div className="aspect-video relative">
                  <img
                    src={photo.url}
                    alt={photo.desc}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <button
                    onClick={() => handleRemovePending(photo.url)}
                    disabled={removingPending === photo.url}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center font-black text-sm disabled:opacity-40"
                    style={{ backgroundColor: "rgba(0,0,0,0.75)", color: "var(--hq-text)" }}
                    title="Remove this photo"
                  >
                    {removingPending === photo.url ? "..." : "X"}
                  </button>
                </div>
                <div className="px-2 py-1.5" style={{ backgroundColor: "rgba(217,189,104,0.08)" }}>
                  <p className="text-[10px] leading-tight" style={{ color: "var(--hq-amber)" }}>
                    {photo.desc || "No description"}
                  </p>
                  {photo.tag && (
                    <p className="text-[9px] mt-0.5 font-black uppercase tracking-widest" style={{ color: "var(--hq-dim)" }}>
                      {photo.tag}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3 px-3" style={{ color: "var(--hq-dim)" }}>
            Remove unwanted picks, then approve when ready.
          </p>
        </div>
      )}

      {/* Photo grid */}
      <div className="px-3 pb-36">
        {!currentPhotos || currentPhotos === "loading" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-video bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : currentPhotos.length === 0 ? (
          <p className="text-center py-20" style={{ color: "var(--hq-dim)" }}>No photos found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {currentPhotos.map(photo => {
              const isSelected = selectedSet.has(photo.id)
              return (
                <button
                  key={photo.id}
                  onClick={() => togglePhoto(activeIndustry, photo.id)}
                  className="relative aspect-video overflow-hidden rounded focus:outline-none"
                  style={{ border: isSelected ? "3px solid var(--hq-green)" : "3px solid transparent" }}
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
                      style={{ backgroundColor: "rgba(50,208,116,0.35)" }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: "var(--hq-text)" }}>
                        <svg width="18" height="18" fill="none" stroke="var(--hq-green)" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 hover:opacity-100 transition-opacity"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                    <p className="text-[10px] leading-tight line-clamp-2" style={{ color: "var(--hq-text)" }}>{photo.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 px-6 py-4 flex items-center justify-between found-hq-bottom-bar"
        style={{
          backgroundColor: justSaved && saveMode === "live" ? "rgba(50,208,116,0.12)" : justSaved && saveMode === "team" ? "rgba(217,189,104,0.12)" : "var(--hq-surface-raised)",
          borderTop: justSaved && saveMode === "live" ? "1px solid var(--hq-green)" : justSaved && saveMode === "team" ? "1px solid var(--hq-amber)" : "1px solid var(--hq-border-strong)",
          transform: showBottomBar ? "translateY(0)" : "translateY(100%)",
          transition: "transform 300ms ease, background-color 300ms ease, border-color 300ms ease",
        }}
      >
        {justSaved ? (
          <>
            <div>
              {saveMode === "live" ? (
                <>
                  <p className="font-black text-sm" style={{ color: "var(--hq-green)" }}>
                    Live - {currentApproved} photos in {INDUSTRIES.find(i => i.key === activeIndustry)?.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--hq-green)", opacity: 0.7 }}>
                    {activeQuery ? `Tagged as "${activeQuery}" - search another term or tap Next.` : "Tagged as general - works for any business in this category."}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-black text-sm" style={{ color: "var(--hq-amber)" }}>
                    Submitted for review - {currentPending} photos pending
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--hq-amber)", opacity: 0.7 }}>
                    Not live yet. Shawn approves the final picks.
                  </p>
                </>
              )}
            </div>
            <button
              onClick={() => {
                const idx = INDUSTRIES.findIndex(i => i.key === activeIndustry)
                const next = INDUSTRIES[idx + 1]
                if (next) { setSavedIndustry(null); setSaveMode(null); setActiveIndustry(next.key) }
                else       { setSavedIndustry(null); setSaveMode(null) }
              }}
              className="px-5 py-3 font-black text-xs uppercase tracking-widest rounded-full"
              style={{ backgroundColor: saveMode === "live" ? "var(--hq-green)" : "var(--hq-amber)", color: "var(--hq-bg)" }}
            >
              {INDUSTRIES.findIndex(i => i.key === activeIndustry) < INDUSTRIES.length - 1 ? "Next" : "Done"}
            </button>
          </>
        ) : (
          <>
            <div>
              <p className="font-black text-sm" style={{ color: "var(--hq-text)" }}>
                {selectedCount} photo{selectedCount !== 1 ? "s" : ""} selected
              </p>
              {saveError && <p className="text-xs mt-0.5" style={{ color: "var(--hq-red)" }}>{saveError}</p>}
            </div>
            <div className="flex items-center gap-3">
              {/* New industries: team submits for review, Shawn promotes to live */}
              {isNewIndustry ? (
                <>
                  <button
                    onClick={handleTeamSubmit}
                    disabled={saving || selectedCount === 0}
                    className="px-5 py-3 font-black text-xs uppercase tracking-widest rounded-full disabled:opacity-40 transition-opacity"
                    style={{ backgroundColor: "var(--hq-surface-raised)", color: "var(--hq-amber)", border: "1px solid var(--hq-amber)" }}
                  >
                    {saving ? "Submitting..." : "Submit for review"}
                  </button>
                  {(currentPending > 0 || selectedCount > 0) && (
                    <button
                      onClick={handlePromoteToLive}
                      disabled={saving}
                      className="px-6 py-3 font-black text-xs uppercase tracking-widest rounded-full disabled:opacity-40 transition-opacity"
                      style={{ backgroundColor: "var(--hq-green)", color: "var(--hq-bg)" }}
                    >
                      {saving ? "Approving..." : `Approve and go live (${currentPending + selectedCount})`}
                    </button>
                  )}
                </>
              ) : (
                /* Original 12 industries: direct approve */
                <button
                  onClick={handleApprove}
                  disabled={saving || selectedCount === 0}
                  className="px-6 py-3 font-black text-xs uppercase tracking-widest rounded-full disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: "var(--hq-green)", color: "var(--hq-bg)" }}
                >
                  {saving ? "Saving..." : "Approve"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
