"use client"

import React, { useEffect, useMemo, useState } from "react"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"

type TabOption = { id: string; label: string }

function optionsFor(industry: string | null | undefined, activeAddons: string[]) {
  if (industry === "food") {
    return [
      { id: "home", label: "Home" },
      ...(activeAddons.includes("online_ordering") ? [{ id: "orders", label: "Orders" }] : []),
      ...(activeAddons.includes("reservation_calendar") ? [{ id: "reservations", label: "Reserve" }] : []),
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
  const defaultIds = useMemo(() => options.slice(0, 5).map(tab => tab.id), [options])
  const storageKey = `found_dashboard_tabs_${companyName || "default"}`
  const [tabIds, setTabIds] = useState<string[]>(defaultIds)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (!saved) { setTabIds(defaultIds); return }
      const ids = JSON.parse(saved) as string[]
      const allowed = new Set(options.map(tab => tab.id))
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

  function toggle(id: string) {
    if (id === "home" || id === "more") return
    if (tabIds.includes(id)) {
      save(tabIds.filter(tabId => tabId !== id))
      return
    }
    if (tabIds.length >= 5) return
    save([...tabIds, id])
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

  const selectedOptions = tabIds
    .map(id => options.find(tab => tab.id === id))
    .filter(Boolean) as TabOption[]

  return (
    <section style={{ marginBottom: 24 }}>
      <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
        Dashboard Tabs
      </p>
      <div style={{ borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", padding: 16 }}>
        <p style={{ margin: "0 0 14px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, lineHeight: 1.45 }}>
          Choose what appears at the bottom of your Found dashboard.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {selectedOptions.map((tab, index) => (
            <div key={tab.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 999, backgroundColor: `${GREEN}16`, border: `1px solid ${GREEN}33` }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: GREEN }}>{index + 1}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "white" }}>{tab.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {options.map(tab => {
            const active = tabIds.includes(tab.id)
            const index = tabIds.indexOf(tab.id)
            const locked = tab.id === "home" || tab.id === "more"
            return (
              <div key={tab.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 10px 11px 12px", borderRadius: 14, backgroundColor: active ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.025)", border: `1px solid ${active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.055)"}` }}>
                <button onClick={() => toggle(tab.id)} disabled={locked || (!active && tabIds.length >= 5)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", backgroundColor: active ? GREEN : "rgba(255,255,255,0.08)", color: active ? BLACK : "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 900, cursor: locked ? "default" : "pointer", flexShrink: 0 }}>
                  {active ? "âœ“" : "+"}
                </button>
                <div style={{ flex: 1, minWidth: 0, color: active ? "white" : "rgba(255,255,255,0.45)", fontSize: 14, fontWeight: 800 }}>{tab.label}</div>
                {active && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => move(tab.id, -1)} disabled={index <= 0} style={{ padding: "7px 9px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", color: index <= 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 800 }}>Up</button>
                    <button onClick={() => move(tab.id, 1)} disabled={index === tabIds.length - 1} style={{ padding: "7px 9px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", color: index === tabIds.length - 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 800 }}>Down</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}