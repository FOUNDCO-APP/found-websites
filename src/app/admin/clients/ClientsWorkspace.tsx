"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

export type ClientRow = {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  plan: string | null
  subscription_status: string | null
  client_state: string
  account_kind: string
  comp_reason: string | null
  created_at: string
  last_activity: string | null
  last_activity_at: string | null
  industry_category: string | null
  is_test: boolean | null
  included_addon_slug: string | null
  issues: string[]
  emails: { summary: string; created_at: string }[]
}

function planLabel(plan: string | null) {
  if (plan === "found_business") return "Business / $69"
  if (plan === "found_pro") return "Pro / $39"
  if (plan === "found") return "Starter / $29"
  return "No plan"
}

function stateTone(state: string) {
  if (state === "active" || state === "comp") return "success"
  if (state === "past_due" || state === "cancelled") return "warning"
  return "info"
}

function statusLabel(row: ClientRow) {
  if (row.issues.length > 0) return row.issues.join(", ")
  if (row.client_state === "active" || row.client_state === "comp") return "Healthy"
  if (row.client_state === "onboarding") return "Finish launch"
  return row.client_state.replace("_", " ")
}

function daysSince(value: string | null) {
  if (!value) return null
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000))
}

function activityHealth(row: ClientRow) {
  const days = daysSince(row.last_activity_at ?? row.created_at)
  if (days == null) return { label: "Stagnant", tone: "warning" }
  if (!row.last_activity_at && days < 14) return { label: "New", tone: "success" }
  if (days < 14) return { label: "Active", tone: "success" }
  if (days < 30) return { label: `Quiet ${days}d`, tone: "warning" }
  return { label: `Stagnant ${days}d`, tone: "warning" }
}

function ClientItem({ row }: { row: ClientRow }) {
  const isRecent = Date.now() - new Date(row.created_at).getTime() < 48 * 3600000
  const needsAttention = row.issues.length > 0 || row.client_state === "past_due"
  const activity = activityHealth(row)
  const summary = [
    { label: planLabel(row.plan) },
    { label: row.subscription_status ?? "not active" },
    { label: statusLabel(row), tone: needsAttention ? "warning" : undefined },
    { label: activity.label, tone: activity.tone },
  ]

  return (
    <Link href={`/admin/clients/${row.id}`} className="hq-business-row hq-business-row-link">
      <div className="hq-business-main">
        <div className="hq-business-copy">
          <div className="hq-business-name-line">
            <h2>{row.name}</h2>
            <span className={`hq-badge hq-badge-${stateTone(row.client_state)}`}>{row.account_kind === "test" ? "Test" : row.client_state.replace("_", " ")}</span>
            {isRecent && <span className="hq-badge hq-badge-success">New</span>}
            {row.is_test && <span className="hq-badge hq-badge-info">Hidden from search</span>}
          </div>
          <p className="hq-client-summary">
            {summary.map((item, index) => (
              <span key={`${item.label}-${index}`} className={item.tone === "warning" ? "hq-client-fact-warning" : item.tone === "success" ? "hq-client-fact-success" : undefined}>
                {index > 0 && <i aria-hidden="true" />}
                {item.label}
              </span>
            ))}
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function ClientsWorkspace({ rows, initialSearch, initialFilter }: { rows: ClientRow[]; initialSearch: string; initialFilter?: string }) {
  const [query, setQuery] = useState(initialSearch)
  const [filter, setFilter] = useState(initialFilter || "clients")
  const filtered = useMemo(() => rows.filter((row) => {
    if (!`${row.name} ${row.slug} ${row.email ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false
    if (filter === "test") return row.account_kind === "test"
    if (filter === "all") return true
    // Every other tab (Clients, Attention, Onboarding, Active, Past due) is
    // scoped to real clients only - test accounts have their own dedicated
    // tab and shouldn't leak into state-based views (the exact bug Shawn
    // caught: throwaway accounts reading as if they were real business risk).
    if (row.account_kind !== "client") return false
    if (filter === "clients") return true
    if (filter === "attention") return row.issues.length > 0 || row.client_state === "past_due"
    return row.client_state === filter
  }), [rows, query, filter])
  return (
    <>
      <div className="hq-business-toolbar">
        <input className="hq-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients" />
        <label className="hq-compact-filter">
          <span>View</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="clients">All clients</option>
            <option value="attention">Needs attention</option>
            <option value="onboarding">Onboarding</option>
            <option value="active">Active</option>
            <option value="past_due">Past due</option>
            <option value="test">Test</option>
          </select>
        </label>
      </div>
      {query.trim() && (
        <div className="hq-filter-notice">
          <span>
            Showing {filtered.length} result{filtered.length === 1 ? "" : "s"} for <strong>{query}</strong>. Clear search to see all clients.
          </span>
          <button type="button" onClick={() => setQuery("")}>Clear search</button>
        </div>
      )}
      <div className="hq-business-list">
        {filtered.map((row) => <ClientItem key={row.id} row={row} />)}
        {!filtered.length && <div className="hq-business-empty">No clients in this view.</div>}
      </div>
      <p className="hq-page-footnote">Website quality tools are in <Link href="/admin/more">More</Link>.</p>
    </>
  )
}
