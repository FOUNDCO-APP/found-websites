"use client"

import React from "react"
import { GREEN as SIGNAL_GREEN } from "@/lib/dashboard/typography"
import type { DashboardTool } from "@/lib/dashboard/toolPolicy"

type IconInput = Pick<DashboardTool, "id" | "path">

function iconColor(active: boolean, muted: boolean) {
  if (active) return SIGNAL_GREEN
  return muted ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.72)"
}

function strokeWidth(active: boolean) {
  return active ? 2.5 : 1.5
}

function pathOnly(path: string) {
  return path.split("?")[0]
}

export function DashboardToolIcon({ tool, active, muted = false, size = 22 }: { tool: IconInput; active: boolean; muted?: boolean; size?: number }) {
  const key = tool.id || pathOnly(tool.path)
  const path = pathOnly(tool.path)
  const s = iconColor(active, muted)
  const w = strokeWidth(active)
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: s, strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

  if (path === "/" || key === "home") {
    return <svg {...common}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  }
  if (path === "/estimates" || key === "estimates") {
    return <svg {...common}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/><path d="M8 9h2"/></svg>
  }
  if (key === "orders") {
    return <svg {...common}><path d="M6 2l1.5 3L10 2l2 3 2-3 2.5 3L18 2v20l-2-1-2 1-2-1-2 1-2-1-2 1V2z"/><path d="M8 10h8"/><path d="M8 14h6"/></svg>
  }
  if (key === "products") {
    return <svg {...common}><path d="M6 2h12l2 7H4l2-7z"/><path d="M4 9v11a2 2 0 002 2h12a2 2 0 002-2V9"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>
  }
  if (key === "reservations" || path === "/schedule" || key === "schedule") {
    return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>{path === "/schedule" || key === "schedule" ? <><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></> : <path d="M8 15h4"/>}</svg>
  }
  if (key === "camera") {
    return <svg {...common}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
  }
  if (path === "/photos" || key === "photos") {
    return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  }
  if (path === "/contacts" || key === "contacts") {
    return <svg {...common}><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
  }
  if (path === "/marketing" || key === "email") {
    return <svg {...common}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  }
  if (path === "/more" || key === "more") {
    const c = iconColor(active, muted)
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill={c}/><circle cx="12" cy="12" r="1.5" fill={c}/><circle cx="12" cy="19" r="1.5" fill={c}/></svg>
  }
  if (path === "/people" || key === "people") {
    return <svg {...common}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  }
  return <svg {...common}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}
