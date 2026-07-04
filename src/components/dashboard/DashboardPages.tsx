"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { TYPE, TEXT_OPACITY, GREEN, defaultFormIntentFor } from "@/lib/dashboard/typography"
import { getBusinessModel } from "@/lib/getBusinessModel"

type PageDef = { id: string; label: string; path: string }

function inboxLabelFor(industry: string | null | undefined): string {
  switch (defaultFormIntentFor(industry)) {
    case "booking":     return "Bookings"
    case "appointment": return "Appointments"
    case "estimate":    return "Estimates"
    case "order":       return "Orders"
    default:            return "Leads"
  }
}

function peoplePageFor(industry: string | null | undefined): PageDef {
  const label = industry === "food" ? "Guests" : getBusinessModel(industry, null).tabLabel
  return { id: "people", label, path: "/people" }
}

function allPagesFor(industry: string | null | undefined, activeAddons: string[]): PageDef[] {
  const hasCalendar = activeAddons.includes("reservation_calendar")
  const hasOrders   = (activeAddons.includes("online_ordering") || activeAddons.includes("shopping_cart"))
  const hasEmail    = activeAddons.includes("email_marketing")
  const hasEstimates = activeAddons.includes("quote_payments")
  const PEOPLE      = peoplePageFor(industry)

  if (industry === "food") {
    return [
      { id: "home", label: "Home", path: "/" },
      ...(hasOrders ? [{ id: "orders", label: "Orders", path: "/leads?view=orders" }] : []),
      hasCalendar
        ? { id: "reservations", label: "Reservations", path: "/leads?view=reservations" }
        : { id: "inbox", label: "Reservations", path: "/leads" },
      PEOPLE,
      ...(hasCalendar ? [{ id: "schedule", label: "Schedule", path: "/schedule" }] : []),
      { id: "photos", label: "Photos", path: "/photos" },
      { id: "contacts", label: "Contacts", path: "/contacts" },
      ...(hasEmail ? [{ id: "email", label: "Email", path: "/marketing" }] : []),
      { id: "more", label: "More", path: "/more" },
    ]
  }

  const inboxLabel = inboxLabelFor(industry)
  const inboxPath = defaultFormIntentFor(industry) === "order"
    ? "/leads?view=orders"
    : defaultFormIntentFor(industry) === "estimate"
      ? "/estimates"
      : "/leads"
  return [
    { id: "home", label: "Home", path: "/" },
    { id: "inbox", label: inboxLabel, path: inboxPath },
    ...(hasEstimates && inboxPath !== "/estimates" ? [{ id: "estimates", label: "Estimates", path: "/estimates" }] : []),
    ...(hasCalendar ? [{ id: "schedule", label: "Schedule", path: "/schedule" }] : []),
    PEOPLE,
    { id: "photos", label: "Photos", path: "/photos" },
    { id: "contacts", label: "Contacts", path: "/contacts" },
    ...(hasEmail ? [{ id: "email", label: "Email", path: "/marketing" }] : []),
    { id: "more", label: "More", path: "/more" },
  ]
}

function defaultTabIdsFor(industry: string | null | undefined, activeAddons: string[]): string[] {
  const hasCalendar = activeAddons.includes("reservation_calendar")
  const hasOrders   = (activeAddons.includes("online_ordering") || activeAddons.includes("shopping_cart"))
  const hasEmail    = activeAddons.includes("email_marketing")
  const hasEstimates = activeAddons.includes("quote_payments")

  if (industry === "food") {
    const reservationId = hasCalendar ? "reservations" : "inbox"
    const middle = [
      ...(hasOrders ? ["orders"] : []),
      reservationId,
      "people",
      ...(hasCalendar ? ["schedule"] : []),
      ...(hasEmail ? ["email"] : []),
      "photos",
      "contacts",
    ].slice(0, 3)
    return ["home", ...middle, "more"]
  }

  const middle = [
    "inbox",
    ...(hasEstimates && defaultFormIntentFor(industry) !== "estimate" ? ["estimates"] : []),
    ...(hasCalendar ? ["schedule"] : []),
    "people",
    ...(hasEmail ? ["email"] : []),
    "photos",
    "contacts",
  ].slice(0, 3)
  return ["home", ...middle, "more"]
}

export default function DashboardPages({
  companyName,
  industry,
  activeAddons,
}: {
  companyName: string | null
  industry: string | null
  activeAddons: string[]
}) {
  const pathname = usePathname()
  const prefix = pathname.startsWith("/dashboard") ? "/dashboard" : ""
  const addonKey = activeAddons.join("|")
  const storageKey = `found_dashboard_tabs_${companyName || "default"}_${industry || "general"}_${addonKey || "core"}`

  const allPages = useMemo(() => allPagesFor(industry, activeAddons), [industry, addonKey])
  const defaultIds = useMemo(() => defaultTabIdsFor(industry, activeAddons), [industry, addonKey])

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

  // View mode: full page navigator, green dot on pinned tabs
  if (mode === "view") {
    const viewablePages = allPages.filter(p => p.id !== "more")
    return (
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <p style={{ margin: 0, ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>My Dock</p>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 5px ${GREEN}80`, flexShrink: 0 }} />
            <span style={{ ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>= in your Dock</span>
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {viewablePages.map(page => {
            const pinned = tabIds.includes(page.id)
            return (
              <Link key={page.id} href={`${prefix}${page.path}`} style={{ textDecoration: "none" }}>
                <div style={{
                  borderRadius: 14, padding: "15px 18px",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: pinned ? GREEN : "rgba(255,255,255,0.1)",
                      boxShadow: pinned ? `0 0 5px ${GREEN}80` : "none",
                    }} />
                    <span style={{ ...TYPE.subhead, color: "white" }}>{page.label}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,${TEXT_OPACITY.disabled})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <span style={{ ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>(sort &amp; edit)</span>
          <button
            onClick={() => setMode("edit")}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span style={{ ...TYPE.footnote, fontWeight: 700, color: GREEN }}>Organize my Dock</span>
          </button>
        </div>
      </section>
    )
  }

  // Edit mode: reorder / pin tabs inline
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ margin: 0, ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Customize Tabs</p>
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
            Choose up to 5 pages to pin to your Dock.
          </p>
          {activeTabs.map((tab, index) => {
            const locked = tab.id === "home" || tab.id === "more"
            const canMoveUp = !locked && index > 1
            const canMoveDown = !locked && index < tabIds.length - 2
            return (
              <div key={tab.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
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
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} />
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

