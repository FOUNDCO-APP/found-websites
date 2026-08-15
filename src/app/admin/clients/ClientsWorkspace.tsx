"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { setViewAsCookie } from "../businesses/actions"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

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

async function openViewAs(companyId: string) {
  const tab = window.open("about:blank", "_blank")
  try {
    const result = await setViewAsCookie(companyId)
    if (result.success && tab) tab.location.href = `https://my.${ROOT_DOMAIN}/?admin_view=1`
    else tab?.close()
  } catch { tab?.close() }
}

function stateTone(state: string) {
  if (state === "active" || state === "comp") return "success"
  if (state === "past_due" || state === "cancelled") return "warning"
  return "info"
}

function ClientItem({ row }: { row: ClientRow }) {
  const isRecent = Date.now() - new Date(row.created_at).getTime() < 48 * 3600000

  return (
    <article className="hq-business-row">
      <div className="hq-business-main">
        <div className="hq-business-copy">
          <div className="hq-business-name-line">
            <Link href={`/admin/clients/${row.id}`}><h2>{row.name}</h2></Link>
            <span className={`hq-badge hq-badge-${stateTone(row.client_state)}`}>{row.account_kind === "test" ? "Test" : row.client_state.replace("_", " ")}</span>
            {isRecent && <span className="hq-badge hq-badge-success">New</span>}
            {row.is_test && <span className="hq-badge hq-badge-info">Hidden from search</span>}
          </div>
          <p>{planLabel(row.plan)} / Billing: {row.subscription_status ?? "not active"}</p>
          {row.issues.length > 0 && <div className="hq-business-issues">{row.issues.map((issue) => <span key={issue} className="hq-badge hq-badge-warning">{issue}</span>)}</div>}
        </div>
        <div className="hq-business-actions">
          <a className="hq-button hq-button-secondary" href={`https://${row.slug}.${ROOT_DOMAIN}`} target="_blank" rel="noopener noreferrer">Site</a>
          <button className="hq-button hq-button-primary" type="button" onClick={() => openViewAs(row.id)}>View as</button>
        </div>
      </div>
    </article>
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
        <div className="hq-filter-row">
          {[["clients", "Clients"], ["attention", "Attention"], ["onboarding", "Onboarding"], ["active", "Active"], ["past_due", "Past due"], ["test", "Test"]].map(([key, label]) => <button key={key} type="button" data-active={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
        </div>
      </div>
      <div className="hq-business-list">
        {filtered.map((row) => <ClientItem key={row.id} row={row} />)}
        {!filtered.length && <div className="hq-business-empty">No clients in this view.</div>}
      </div>
      <p className="hq-page-footnote">Website quality tools are in <Link href="/admin/more">More</Link>.</p>
    </>
  )
}
