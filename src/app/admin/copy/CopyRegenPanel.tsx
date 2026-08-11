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
      <div className="hq-empty-state">
        <strong>No sites yet.</strong>
        <span>Sites will appear here once the first one is created.</span>
      </div>
    )
  }

  const fallbackCount = sites.filter((site) => !site.copy_generated).length

  return (
    <div>
      <p className="hq-subtitle" style={{ marginBottom: 20 }}>
        {fallbackCount > 0
          ? `${fallbackCount} site${fallbackCount !== 1 ? "s" : ""} used fallback copy. Review each site before regenerating.`
          : "All sites have AI-written copy. Regenerate only when a specific site needs a refresh."}
      </p>

      <div className="hq-business-list">
        {sites.map((site) => {
          const status = states[site.company_id] || "idle"
          const siteUrl = `https://${site.slug}.${ROOT_DOMAIN}`
          const busy = status === "pending" || status === "undoing"

          return (
            <article key={site.company_id} className="hq-business-row">
              <div className="hq-business-main">
                <div className="hq-business-copy">
                  <div className="hq-business-name-line">
                    <h2>{site.company_name}</h2>
                    <span className="hq-badge hq-badge-info">{site.industry.replace(/_/g, " ")}</span>
                    <span className={`hq-badge ${site.copy_generated ? "hq-badge-success" : "hq-badge-warning"}`}>
                      {site.copy_generated ? "AI" : "Fallback"}
                    </span>
                    {status === "restored" && <span className="hq-badge hq-badge-success">Restored</span>}
                    {status === "undo_error" && <span className="hq-badge hq-badge-danger">Undo failed</span>}
                  </div>
                  <p>{site.city}{site.state ? `, ${site.state}` : ""} - {site.slug}.{ROOT_DOMAIN}</p>
                  {site.hero_subtitle && <p style={{ fontStyle: "italic" }}>&ldquo;{site.hero_subtitle}&rdquo;</p>}
                </div>
                <div className="hq-business-actions">
                  {(status === "done" || status === "restored") && (
                    <a className="hq-button hq-button-secondary" href={siteUrl} target="_blank" rel="noreferrer">View site</a>
                  )}
                  {status === "done" ? (
                    <button className="hq-button hq-button-secondary" type="button" onClick={() => handleUndo(site)}>Undo changes</button>
                  ) : status === "undo_error" ? (
                    <button className="hq-button hq-button-secondary" type="button" onClick={() => handleUndo(site)}>Retry undo</button>
                  ) : status === "error" ? (
                    <button className="hq-button hq-button-secondary" type="button" onClick={() => setConfirming(site)}>Try again</button>
                  ) : status === "restored" ? null : (
                    <button className="hq-button hq-button-primary" type="button" disabled={busy} onClick={() => setConfirming(site)}>
                      {status === "pending" ? "Writing..." : status === "undoing" ? "Restoring..." : "Regenerate"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {confirming && (
        <>
          <div onClick={() => setConfirming(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.72)", zIndex: 150 }} />
          <div role="dialog" aria-modal="true" aria-labelledby="copy-confirm-title" style={{ position: "fixed", left: 20, right: 20, bottom: 20, maxWidth: 480, margin: "0 auto", zIndex: 151, borderRadius: 4, padding: 24, backgroundColor: "var(--hq-surface)", border: "1px solid var(--hq-border)" }}>
            <h2 id="copy-confirm-title" className="hq-row-title" style={{ fontSize: 18, marginBottom: 8 }}>
              Regenerate {confirming.company_name} copy?
            </h2>
            <p className="hq-row-meta" style={{ marginBottom: 18, fontSize: 13 }}>
              This immediately replaces the live hero, about text, tagline, CTA, services copy, and FAQs. The current version will be saved first so you can undo it.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="hq-button hq-button-secondary" style={{ flex: 1 }} type="button" onClick={() => setConfirming(null)}>Cancel</button>
              <button className="hq-button hq-button-primary" style={{ flex: 1 }} type="button" onClick={() => handleRegenerate(confirming)}>Save and regenerate</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
