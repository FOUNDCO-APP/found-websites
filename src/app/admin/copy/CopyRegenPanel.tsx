"use client"

import { useState, useTransition } from "react"
import { regenerateSiteCopy, type SiteNeedingCopy } from "./actions"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

export default function CopyRegenPanel({ initialSites }: { initialSites: SiteNeedingCopy[] }) {
  const [sites, setSites] = useState(initialSites)
  const [states, setStates] = useState<Record<string, "idle" | "pending" | "done" | "error">>({})
  const [isPending, startTransition] = useTransition()

  function setStatus(id: string, status: "idle" | "pending" | "done" | "error") {
    setStates((prev) => ({ ...prev, [id]: status }))
  }

  function handleRegenerate(site: SiteNeedingCopy) {
    setStatus(site.company_id, "pending")
    startTransition(async () => {
      const result = await regenerateSiteCopy(site.company_id)
      if (result.success) {
        setStatus(site.company_id, "done")
        setTimeout(() => {
          setSites((prev) => prev.filter((s) => s.company_id !== site.company_id))
        }, 1400)
      } else {
        setStatus(site.company_id, "error")
      }
    })
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: "#32D07420" }}>
          <svg width="28" height="28" fill="none" stroke="#32D074" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-xl font-black" style={{ color: "#ffffff" }}>All sites have Claude copy.</p>
        <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.45)" }}>Nothing needs regeneration right now.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
        {sites.length} site{sites.length !== 1 ? "s" : ""} used fallback copy — Claude was down or not configured when they signed up.
      </p>

      <div className="flex flex-col gap-3">
        {sites.map((site) => {
          const status = states[site.company_id] || "idle"
          const siteUrl = `https://${site.slug}.${ROOT_DOMAIN}`

          return (
            <div
              key={site.company_id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl"
              style={{
                backgroundColor: status === "done" ? "rgba(50,208,116,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${status === "done" ? "rgba(50,208,116,0.3)" : status === "error" ? "rgba(255,80,80,0.3)" : "rgba(255,255,255,0.08)"}`,
                transition: "all 300ms ease",
                opacity: status === "done" ? 0.5 : 1,
              }}
            >
              {/* Site info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-black text-base truncate" style={{ color: "#ffffff" }}>
                    {site.company_name}
                  </p>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
                    {site.industry.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-xs mb-2 truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {site.city}{site.state ? `, ${site.state}` : ""}
                  {" · "}
                  <a href={siteUrl} target="_blank" rel="noreferrer"
                    className="hover:opacity-80 underline transition-opacity"
                    style={{ color: "rgba(255,255,255,0.35)" }}>
                    {site.slug}.{ROOT_DOMAIN}
                  </a>
                </p>
                {site.hero_subtitle && (
                  <p className="text-xs italic line-clamp-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                    &ldquo;{site.hero_subtitle}&rdquo;
                  </p>
                )}
              </div>

              {/* Action */}
              <div className="shrink-0">
                {status === "done" ? (
                  <div className="flex items-center gap-2 text-sm font-black" style={{ color: "#32D074" }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Updated
                  </div>
                ) : status === "error" ? (
                  <div className="flex flex-col gap-2 items-end">
                    <p className="text-xs font-black" style={{ color: "#ff5050" }}>Failed — try again</p>
                    <button
                      onClick={() => handleRegenerate(site)}
                      className="text-xs font-black px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
                      style={{ backgroundColor: "rgba(255,80,80,0.15)", color: "#ff5050", border: "1px solid rgba(255,80,80,0.3)" }}>
                      Retry
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleRegenerate(site)}
                    disabled={status === "pending" || isPending}
                    className="flex items-center gap-2 text-sm font-black px-5 py-2.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#32D074", color: "#080A09" }}>
                    {status === "pending" ? (
                      <>
                        <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Writing...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerate
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
