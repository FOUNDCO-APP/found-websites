"use client"

import { useState } from "react"
import { regenerateSiteCopy, undoSiteCopy, type SiteNeedingCopy } from "./actions"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
type SiteStatus = "idle" | "pending" | "done" | "error" | "undoing" | "undo_error" | "restored"

export default function CopyRegenPanel({ initialSites }: { initialSites: SiteNeedingCopy[] }) {
  const [sites] = useState(initialSites)
  const [states, setStates] = useState<Record<string, SiteStatus>>({})
  const [versionIds, setVersionIds] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState<SiteNeedingCopy | null>(null)

  function setStatus(id: string, status: SiteStatus) {
    setStates((prev) => ({ ...prev, [id]: status }))
  }

  async function handleRegenerate(site: SiteNeedingCopy) {
    setConfirming(null)
    setStatus(site.company_id, "pending")
    const result = await regenerateSiteCopy(site.company_id)
    if (result.success && result.versionId) {
      setVersionIds((prev) => ({ ...prev, [site.company_id]: result.versionId! }))
      setStatus(site.company_id, "done")
    } else {
      setStatus(site.company_id, "error")
    }
  }

  async function handleUndo(site: SiteNeedingCopy) {
    const versionId = versionIds[site.company_id]
    if (!versionId) return
    setStatus(site.company_id, "undoing")
    const result = await undoSiteCopy(versionId)
    setStatus(site.company_id, result.success ? "restored" : "undo_error")
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-xl font-black" style={{ color: "#ffffff" }}>No sites yet.</p>
        <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.45)" }}>Sites will appear here once the first one is created.</p>
      </div>
    )
  }

  const fallbackCount = sites.filter((site) => !site.copy_generated).length

  return (
    <div className="hq-copy-panel">
      <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
        {fallbackCount > 0
          ? `${fallbackCount} site${fallbackCount !== 1 ? "s" : ""} used fallback copy. Review each site before regenerating.`
          : "All sites have AI-written copy. Regenerate only when a specific site needs a refresh."}
      </p>

      <div className="flex flex-col gap-3">
        {sites.map((site) => {
          const status = states[site.company_id] || "idle"
          const siteUrl = `https://${site.slug}.${ROOT_DOMAIN}`
          const busy = status === "pending" || status === "undoing"

          return (
            <div
              key={site.company_id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl"
              style={{
                backgroundColor: status === "done" || status === "restored" ? "rgba(50,208,116,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${status === "error" ? "rgba(255,80,80,0.3)" : status === "done" || status === "restored" ? "rgba(50,208,116,0.3)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-black text-base truncate" style={{ color: "#ffffff" }}>{site.company_name}</p>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
                    {site.industry.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: site.copy_generated ? "rgba(50,208,116,0.08)" : "rgba(255,180,0,0.12)",
                      color: site.copy_generated ? "rgba(50,208,116,0.7)" : "#ffb400",
                    }}>
                    {site.copy_generated ? "AI" : "Fallback"}
                  </span>
                </div>
                <p className="text-xs mb-2 truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {site.city}{site.state ? `, ${site.state}` : ""} - {site.slug}.{ROOT_DOMAIN}
                </p>
                {site.hero_subtitle && (
                  <p className="text-xs italic line-clamp-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                    &ldquo;{site.hero_subtitle}&rdquo;
                  </p>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2 flex-wrap sm:justify-end">
                {(status === "done" || status === "restored") && (
                  <a href={siteUrl} target="_blank" rel="noreferrer"
                    className="text-xs font-black px-4 py-2.5 rounded-lg"
                    style={{ color: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none" }}>
                    View site
                  </a>
                )}
                {status === "done" ? (
                  <button onClick={() => handleUndo(site)}
                    className="text-sm font-black px-4 py-2.5 rounded-lg"
                    style={{ backgroundColor: "#ffffff", color: "#111111" }}>
                    Undo changes
                  </button>
                ) : status === "restored" ? (
                  <span className="text-sm font-black" style={{ color: "#32D074" }}>Previous copy restored</span>
                ) : status === "undo_error" ? (
                  <div className="flex flex-col gap-2 items-end">
                    <span className="text-xs font-black" style={{ color: "#ff7070" }}>Undo failed - site unchanged</span>
                    <button onClick={() => handleUndo(site)}
                      className="text-xs font-black px-4 py-2.5 rounded-lg"
                      style={{ backgroundColor: "#ffffff", color: "#111111" }}>
                      Retry undo
                    </button>
                  </div>
                ) : status === "error" ? (
                  <button onClick={() => setConfirming(site)}
                    className="text-xs font-black px-4 py-2.5 rounded-lg"
                    style={{ backgroundColor: "rgba(255,80,80,0.15)", color: "#ff7070", border: "1px solid rgba(255,80,80,0.3)" }}>
                    Try again
                  </button>
                ) : (
                  <button onClick={() => setConfirming(site)} disabled={busy}
                    className="text-sm font-black px-5 py-2.5 rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: "#32D074", color: "#080A09" }}>
                    {status === "pending" ? "Writing..." : status === "undoing" ? "Restoring..." : "Regenerate"}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {confirming && (
        <div role="dialog" aria-modal="true" aria-labelledby="copy-confirm-title"
          style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16, backgroundColor: "rgba(0,0,0,0.72)" }}>
          <div style={{ width: "100%", maxWidth: 520, borderRadius: 8, padding: 24, backgroundColor: "#151816", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h2 id="copy-confirm-title" style={{ margin: "0 0 8px", color: "white", fontSize: 20, fontWeight: 900 }}>
              Regenerate {confirming.company_name} copy?
            </h2>
            <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.58)", fontSize: 14, lineHeight: 1.55 }}>
              This immediately replaces the live hero, about text, tagline, CTA, services copy, and FAQs. The current version will be saved first so you can undo it.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirming(null)}
                style={{ flex: 1, minHeight: 44, borderRadius: 7, border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "transparent", color: "white", fontWeight: 800 }}>
                Cancel
              </button>
              <button onClick={() => handleRegenerate(confirming)}
                style={{ flex: 1, minHeight: 44, borderRadius: 7, border: "none", backgroundColor: "#32D074", color: "#080A09", fontWeight: 900 }}>
                Save and regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
