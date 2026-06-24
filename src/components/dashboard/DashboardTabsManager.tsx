"use client"

import React, { useEffect, useMemo, useState } from "react"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"

type TabOption = { id: string; label: string }

function optionsFor(industry: string | null | undefined, activeAddons: string[]) {
  if (industry === "food") {
    const hasCalendar = activeAddons.includes("reservation_calendar")
    return [
      { id: "home", label: "Home" },
      ...(activeAddons.includes("online_ordering") ? [{ id: "orders", label: "Orders" }] : []),
      // Always include a reservations tab — basic list or calendar upgrade
      hasCalendar
        ? { id: "reservations", label: "Reserve" }
        : { id: "inbox", label: "Reservations" },
      { id: "photos", label: "Photos" },
      { id: "contacts", label: "Contacts" },
      { id: "more", label: "More" },
    ]
  }
  return [
    { id: "home", label: "Home" },
    { id: "inbox", label: "Inbox" },
    { id: "photos", label: "Photos" },
    { id: "contacts", label: "Contacts" },
    { id: "more", label: "More" },
  ]
}

export default function DashboardTabsManager({
  companyName,
  industry,
  activeAddons,
}: {
  companyName: string | null
  industry: string | null
  activeAddons: string[]
}) {
  const options = useMemo(() => optionsFor(industry, activeAddons), [industry, activeAddons])
  const defaultIds = useMemo(() => options.slice(0, 5).map(t => t.id), [options])
  const storageKey = `found_dashboard_tabs_${companyName || "default"}`
  const [tabIds, setTabIds] = useState<string[]>(defaultIds)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (!saved) { setTabIds(defaultIds); return }
      const ids = JSON.parse(saved) as string[]
      const allowed = new Set(options.map(t => t.id))
      const ordered = ids.filter(id => allowed.has(id))
      const missing = defaultIds.filter(id => !ordered.includes(id))
      setTabIds([...ordered, ...missing].slice(0, 5))
    } catch {
      setTabIds(defaultIds)
    }
  }, [storageKey, defaultIds, options])

  function save(nextIds: string[]) {
    const next = nextIds.slice(0, 5)
    setTabIds(next)
    window.localStorage.setItem(storageKey, JSON.stringify(next))
    window.dispatchEvent(new Event("found:dashboard-tabs-updated"))
  }

  function remove(id: string) {
    save(tabIds.filter(t => t !== id))
  }

  function add(id: string) {
    if (tabIds.length >= 5) return
    const moreIdx = tabIds.indexOf("more")
    const next = [...tabIds]
    if (moreIdx >= 0) {
      next.splice(moreIdx, 0, id)
    } else {
      next.push(id)
    }
    save(next.slice(0, 5))
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

  const byId = new Map(options.map(t => [t.id, t]))
  const activeTabs = tabIds.map(id => byId.get(id)).filter(Boolean) as TabOption[]
  const inactiveTabs = options.filter(t => !tabIds.includes(t.id))
  const isFull = tabIds.length >= 5

  return (
    <section style={{ marginBottom: 24 }}>
      <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
        Bottom Tabs
      </p>
      <div style={{ borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>

        {/* Active tabs — rendered in tabIds order */}
        <div style={{ padding: "14px 16px 6px" }}>
          <p style={{ margin: "0 0 14px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.5 }}>
            Choose up to 5 tabs for your dashboard.
          </p>
          {activeTabs.map((tab, index) => {
            const locked = tab.id === "home" || tab.id === "more"
            const canMoveUp = !locked && index > 1
            const canMoveDown = !locked && index < tabIds.length - 2
            return (
              <div key={tab.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>

                {/* Position badge */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 900,
                  backgroundColor: locked ? "rgba(255,255,255,0.05)" : `${GREEN}18`,
                  border: `1px solid ${locked ? "rgba(255,255,255,0.07)" : `${GREEN}30`}`,
                  color: locked ? `rgba(255,255,255,${TEXT_OPACITY.disabled})` : GREEN,
                }}>
                  {index + 1}
                </div>

                {/* Label */}
                <span style={{ flex: 1, fontSize: 15, fontWeight: locked ? 500 : 700, color: locked ? `rgba(255,255,255,${TEXT_OPACITY.secondary})` : "white" }}>
                  {tab.label}
                  {locked && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, textTransform: "uppercase", letterSpacing: "0.06em" }}>locked</span>}
                </span>

                {/* Move buttons — icon only, larger tap targets */}
                {!locked && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => move(tab.id, -1)}
                      disabled={!canMoveUp}
                      style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: canMoveUp ? "pointer" : "default", opacity: canMoveUp ? 1 : 0.2 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => move(tab.id, 1)}
                      disabled={!canMoveDown}
                      style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: canMoveDown ? "pointer" : "default", opacity: canMoveDown ? 1 : 0.2 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  </div>
                )}
                {locked && <div style={{ width: 88, flexShrink: 0 }} />}

                {/* Remove button — larger tap target */}
                {!locked ? (
                  <button
                    onClick={() => remove(tab.id)}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: "none", backgroundColor: "rgba(255,59,48,0.14)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                ) : (
                  <div style={{ width: 36, flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Inactive tabs — available to add */}
        {inactiveTabs.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px" }}>
            <p style={{ margin: "0 0 10px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
              {isFull ? "Remove a tab above to add another" : "Available"}
            </p>
            {inactiveTabs.map(tab => (
              <div key={tab.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
                  {tab.label}
                </span>
                <button
                  onClick={() => add(tab.id)}
                  disabled={isFull}
                  style={{ width: 26, height: 26, borderRadius: "50%", border: "none", backgroundColor: isFull ? "rgba(255,255,255,0.04)" : `${GREEN}18`, display: "flex", alignItems: "center", justifyContent: "center", cursor: isFull ? "default" : "pointer", flexShrink: 0, opacity: isFull ? 0.35 : 1 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isFull ? "rgba(255,255,255,0.3)" : GREEN} strokeWidth="3" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
