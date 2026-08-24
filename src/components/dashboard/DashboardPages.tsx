"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { TYPE, TEXT_OPACITY, GREEN } from "@/lib/dashboard/typography"
import { DASHBOARD_TOOL_GROUP_LABELS, DASHBOARD_TOOL_GROUP_ORDER, getAvailableDashboardTools, getDashboardToolStorageKey, getDefaultDashboardToolIds, type DashboardTool, type DashboardToolGroup } from "@/lib/dashboard/toolPolicy"
import { DashboardToolIcon } from "@/components/dashboard/DashboardToolIcon"

type PageDef = DashboardTool

const GROUP_META: Record<DashboardToolGroup, string> = {
  website: "What customers see online",
  get_paid: "Estimates, orders, and payment work",
  customers: "People and incoming requests",
  work_schedule: "Calendar, bookings, and job timing",
  marketing: "Updates that bring customers back",
  insights: "How the business is doing",
  settings: "Account, billing, team, and your Dock",
}

export default function DashboardPages({
  companyName,
  industry,
  subIndustry = null,
  activeAddons,
  plan = null,
  primaryIntent = null,
}: {
  companyName: string | null
  industry: string | null
  subIndustry?: string | null
  activeAddons: string[]
  plan?: string | null
  primaryIntent?: string | null
}) {
  const pathname = usePathname()
  const prefix = pathname.startsWith("/dashboard") ? "/dashboard" : ""
  const addonKey = activeAddons.join("|")
  const storageKey = getDashboardToolStorageKey(companyName, industry, activeAddons, subIndustry)

  const allPages = useMemo(() => getAvailableDashboardTools({ industry, subIndustry, activeAddons, plan, primaryIntent }), [industry, subIndustry, addonKey, plan, primaryIntent])
  const defaultIds = useMemo(() => getDefaultDashboardToolIds({ industry, subIndustry, activeAddons, plan, primaryIntent }), [industry, subIndustry, addonKey, plan, primaryIntent])

  const [mode, setMode] = useState<"view" | "edit">("view")
  const [tabIds, setTabIds] = useState<string[]>(defaultIds)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (!saved) { setTabIds(defaultIds); return }
      const ids = JSON.parse(saved) as string[]
      const allowed = new Set(allPages.map(p => p.id))
      const ordered = ids.filter(id => allowed.has(id))
      // HOME always first, MORE always last — use saved order, no re-injection of removed tabs
      const middle = ordered.filter(id => id !== "home" && id !== "more").slice(0, 3)
      setTabIds(["home", ...middle, "more"])
    } catch {
      setTabIds(defaultIds)
    }
  }, [storageKey, allPages, defaultIds])

  function save(nextIds: string[]) {
    const next = nextIds.slice(0, 5)
    setTabIds(next)
    window.localStorage.setItem(storageKey, JSON.stringify(next))
    window.dispatchEvent(new Event("found:dashboard-tabs-updated"))
  }

  function move(id: string, direction: -1 | 1) {
    const index = tabIds.indexOf(id)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= tabIds.length) return
    const next = [...tabIds]
    const [tab] = next.splice(index, 1)
    next.splice(nextIndex, 0, tab)
    save(next)
  }

  function removeFromNav(id: string) {
    save(tabIds.filter(t => t !== id))
  }

  function addToNav(id: string) {
    if (tabIds.length >= 5) return
    const moreIdx = tabIds.indexOf("more")
    const next = [...tabIds]
    if (moreIdx >= 0) next.splice(moreIdx, 0, id)
    else next.push(id)
    save(next.slice(0, 5))
  }

  const byId = new Map(allPages.map(p => [p.id, p]))
  const isFull = tabIds.length >= 5
  const activeTabs = tabIds.map(id => byId.get(id)).filter(Boolean) as PageDef[]
  const inactiveTabs = allPages.filter(p => !tabIds.includes(p.id))

  // View mode: grouped business navigator, powered by the tool registry
  if (mode === "view") {
    const viewablePages = allPages.filter(p => p.id !== "home" && p.id !== "more")
    const groups = DASHBOARD_TOOL_GROUP_ORDER
      .map((group) => ({
        group,
        pages: viewablePages.filter((page) => page.group === group),
      }))
      .filter((entry) => entry.pages.length > 0)

    return (
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {groups.map(({ group, pages }: { group: DashboardToolGroup; pages: PageDef[] }) => (
            <div key={group}>
              <div style={{ marginBottom: 10 }}>
                <p style={{ margin: "0 0 3px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                  {DASHBOARD_TOOL_GROUP_LABELS[group]}
                </p>
                <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
                  {GROUP_META[group]}
                </p>
              </div>
              <div style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: "rgba(255,255,255,0.025)",
              }}>
                {pages.map(page => {
                  const pinned = tabIds.includes(page.id)
                  return (
                    <Link key={page.id} href={`${prefix}${page.path}`} style={{ textDecoration: "none" }}>
                      <div style={{
                        minHeight: 72,
                        padding: "14px 0",
                        borderTop: page === pages[0] ? "none" : "1px solid rgba(255,255,255,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                          <span style={{ width: 24, height: 24, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><DashboardToolIcon tool={page} active={pinned} muted={!pinned} size={21} /></span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", ...TYPE.subhead, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.label}</span>
                            {page.description && (
                              <span style={{ display: "block", marginTop: 2, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.description}</span>
                            )}
                          </span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,${TEXT_OPACITY.disabled})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </Link>
                  )
                })}
                {group === "settings" && (
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    style={{
                      width: "100%",
                      minHeight: 72,
                      padding: "14px 0",
                      border: "none",
                      borderTop: pages.length > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      background: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                      <span style={{ width: 24, height: 24, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7h16"/>
                          <path d="M4 17h16"/>
                          <circle cx="9" cy="7" r="2"/>
                          <circle cx="15" cy="17" r="2"/>
                        </svg>
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", ...TYPE.subhead, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Organize Dock</span>
                        <span style={{ display: "block", marginTop: 2, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Choose the tabs at the bottom of your app</span>
                      </span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,${TEXT_OPACITY.disabled})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }
  // Edit mode: reorder / pin tabs inline
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ margin: 0, ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Organize Dock</p>
        <button
          onClick={() => setMode("view")}
          style={{ background: "none", border: `1px solid ${GREEN}35`, cursor: "pointer", padding: "5px 12px", borderRadius: 8, backgroundColor: `${GREEN}12` }}
        >
          <span style={{ ...TYPE.footnote, fontWeight: 700, color: GREEN }}>Done</span>
        </button>
      </div>
      <div style={{ borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 6px" }}>
          <p style={{ margin: "0 0 14px", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.5 }}>
            Choose the three middle tabs. Home and More stay pinned.
          </p>
          {activeTabs.map((tab, index) => {
            const locked = tab.id === "home" || tab.id === "more"
            const canMoveUp = !locked && index > 1
            const canMoveDown = !locked && index < tabIds.length - 2
            return (
              <div key={tab.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><DashboardToolIcon tool={tab} active={!locked} muted={locked} size={21} /></div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: locked ? 500 : 700, color: locked ? `rgba(255,255,255,${TEXT_OPACITY.secondary})` : "white" }}>
                  {tab.label}
                  {locked && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>locked</span>}
                </span>
                {!locked && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => move(tab.id, -1)} disabled={!canMoveUp} style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: canMoveUp ? "pointer" : "default", opacity: canMoveUp ? 1 : 0.2 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button onClick={() => move(tab.id, 1)} disabled={!canMoveDown} style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: canMoveDown ? "pointer" : "default", opacity: canMoveDown ? 1 : 0.2 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>
                )}
                {locked && <div style={{ width: 88, flexShrink: 0 }} />}
                {!locked ? (
                  <button onClick={() => removeFromNav(tab.id)} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", backgroundColor: "rgba(255,59,48,0.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                ) : (
                  <div style={{ width: 36, flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>
        {inactiveTabs.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px" }}>
            <p style={{ margin: "0 0 10px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
              {isFull ? "Remove a tab above to add another" : "Available"}
            </p>
            {inactiveTabs.map(tab => (
              <div key={tab.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><DashboardToolIcon tool={tab} active={false} muted size={21} /></div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>{tab.label}</span>
                <button onClick={() => addToNav(tab.id)} disabled={isFull} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", backgroundColor: isFull ? "rgba(255,255,255,0.04)" : `${GREEN}18`, display: "flex", alignItems: "center", justifyContent: "center", cursor: isFull ? "default" : "pointer", flexShrink: 0, opacity: isFull ? 0.35 : 1 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isFull ? "rgba(255,255,255,0.3)" : GREEN} strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
