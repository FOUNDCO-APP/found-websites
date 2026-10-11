"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { StoredBillingSummary } from "@/lib/stripe/billingSummary"

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
  test_identity: boolean
  test_identity_reason: string | null
  last_activity: string | null
  last_customer_activity_at: string | null
  last_customer_surface: string | null
  customer_activity_count_90d: number
  customer_tool_activity_count_90d: number
  customer_activity_status: {
    label: string
    level: "using" | "quiet" | "outreach" | "stagnant"
    days: number | null
  }
  customer_activity_reason: string
  customer_activity_summary: string
  customer_top_tool_surface: string | null
  industry_category: string | null
  is_test: boolean | null
  included_addon_slug: string | null
  issues: string[]
  billing: StoredBillingSummary | null
  emails: { summary: string; created_at: string }[]
}

function planLabel(plan: string | null) {
  if (plan === "found_business") return "Business / $69"
  if (plan === "found_pro") return "Pro / $39"
  if (plan === "found") return "Starter / $29"
  return "No plan"
}

function recordedActivityLabel(value: string | null) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return "No client activity recorded"
  return `Last recorded client activity ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`
}

function ClientItem({ row }: { row: ClientRow }) {
  const isRecent = Date.now() - new Date(row.created_at).getTime() < 48 * 3600000
  const billingUncertain = !row.billing?.verifiedAt || row.billing.stale

  return (
    <Link href={`/admin/clients/${row.id}`} className="hq-business-row hq-business-row-link hq-client-list-row">
      <div className="hq-business-main">
        <div className="hq-business-copy">
          <div className="hq-business-name-line">
            <h2>{row.name}</h2>
            {row.test_identity && <span className="hq-badge hq-badge-info">Test account</span>}
            {isRecent && <span className="hq-badge hq-badge-success">New</span>}
            {row.is_test && <span className="hq-badge hq-badge-info">Hidden from search</span>}
          </div>
          <p className="hq-client-billing">
            <span className={row.billing?.needsAttention || billingUncertain ? "hq-client-fact-warning" : undefined}>
              {row.billing?.label ? row.billing.label.replace(/^Billing /, "Stored billing ") : "Stored billing not verified"}
            </span>
            {row.billing?.preserveAccess && <span className="hq-client-fact-info">Site access protected</span>}
          </p>
          <p className="hq-client-activity">
            <span>{planLabel(row.plan)}</span>
            <span>{recordedActivityLabel(row.last_customer_activity_at)}</span>
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
    if (filter === "test") return row.test_identity
    if (filter === "all") return true
    // Every other tab (Clients, Attention, Onboarding, Active, Past due) is
    // scoped to real clients only - test accounts have their own dedicated
    // tab and shouldn't leak into state-based views (the exact bug Shawn
    // caught: throwaway accounts reading as if they were real business risk).
    if (row.account_kind !== "client" || row.test_identity) return false
    if (filter === "clients") return true
    if (filter === "attention") return row.issues.length > 0 || row.client_state === "past_due" || row.customer_activity_status.level === "outreach" || row.customer_activity_status.level === "stagnant"
    if (filter === "quiet") return row.customer_activity_status.level === "quiet"
    if (filter === "stagnant") return row.customer_activity_status.level === "outreach" || row.customer_activity_status.level === "stagnant"
    return row.client_state === filter
  }), [rows, query, filter])
  return (
    <div className="hq-client-list">
      <div className="hq-business-toolbar">
        <input className="hq-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients" />
        <label className="hq-compact-filter">
          <span>View</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="clients">All clients</option>
            <option value="attention">Billing or client attention</option>
            <optgroup label="Recorded client activity">
              <option value="quiet">Quiet 8-14 days</option>
              <option value="stagnant">Stagnant 15+ days</option>
            </optgroup>
            <optgroup label="Client relationship (not billing)">
              <option value="onboarding">Onboarding relationship</option>
              <option value="active">Active relationship</option>
              <option value="past_due">Relationship past due</option>
            </optgroup>
            <option value="test">Test accounts only</option>
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
    </div>
  )
}
