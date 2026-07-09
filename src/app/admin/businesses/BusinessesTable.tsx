"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { setViewAsCookie, toggleComp, saveNotes } from "./actions"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
export type BusinessFilter = "all" | "attention" | "inactive" | "logo" | "payments"

export type BusinessRow = {
  id: string
  name: string
  slug: string
  industry_category: string | null
  plan: string | null
  subscription_status: string | null
  email: string | null
  is_comp: boolean | null
  admin_notes: string | null
  created_at: string | null
  issues: string[]
}

function planLabel(plan: string | null) {
  if (plan === "found_pro") return "Pro"
  if (plan === "found_business") return "Business"
  if (plan === "found") return "Starter"
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

function IssueBadge({ issue }: { issue: string }) {
  const className = issue === "Not active" ? "hq-badge hq-badge-warning" : issue === "Fallback copy" ? "hq-badge hq-badge-warning" : "hq-badge hq-badge-info"
  if (issue === "Fallback copy") return <Link href="/admin/copy" className={className} style={{ textDecoration: "none" }}>{issue}</Link>
  return <span className={className}>{issue}</span>
}

function BusinessItem({ row }: { row: BusinessRow }) {
  const [notes, setNotes] = useState(row.admin_notes ?? "")
  const [comp, setComp] = useState(Boolean(row.is_comp))
  const [savingNotes, setSavingNotes] = useState(false)
  const [pending, startTransition] = useTransition()
  const active = row.subscription_status === "active" || row.subscription_status === "trialing" || comp

  function handleCompToggle() {
    const next = !comp
    setComp(next)
    startTransition(() => { toggleComp(row.id, next) })
  }

  async function handleNotesBlur() {
    if (notes === (row.admin_notes ?? "")) return
    setSavingNotes(true)
    await saveNotes(row.id, notes)
    setSavingNotes(false)
  }

  return (
    <div className="hq-business-row">
      <div className="hq-business-main">
        <div className="hq-business-copy">
          <div className="hq-business-name-line">
            <h2>{row.name}</h2>
            <span className={`hq-badge ${active ? "hq-badge-success" : "hq-badge-warning"}`}>{comp ? "Comp" : active ? "Active" : "Setup"}</span>
          </div>
          <p>{row.slug}.foundco.app ? {planLabel(row.plan)} ? {row.industry_category ?? "Uncategorized"}</p>
          {row.email && <p>{row.email}</p>}
          {row.issues.length > 0 && <div className="hq-business-issues">{row.issues.map((issue) => <IssueBadge key={issue} issue={issue} />)}</div>}
        </div>
        <div className="hq-business-actions">
          <a className="hq-button hq-button-secondary" href={`https://${row.slug}.${ROOT_DOMAIN}`} target="_blank" rel="noopener noreferrer">Site</a>
          <button className="hq-button hq-button-primary" type="button" onClick={() => openViewAs(row.id)}>View as</button>
        </div>
      </div>
      <details className="hq-business-manage">
        <summary>Manage</summary>
        <div className="hq-business-manage-body">
          <label className="hq-business-note-label" htmlFor={`notes-${row.id}`}>Private note</label>
          <textarea id={`notes-${row.id}`} value={notes} onChange={(event) => setNotes(event.target.value)} onBlur={handleNotesBlur} rows={2} placeholder="How you know them, account purpose, or follow-up details" />
          <div className="hq-business-manage-footer">
            <button type="button" onClick={handleCompToggle} disabled={pending} className="hq-button hq-button-secondary">{comp ? "Remove comp" : "Activate as comp"}</button>
            <span>{savingNotes ? "Saving..." : "Notes save automatically"}</span>
          </div>
        </div>
      </details>
    </div>
  )
}

const FILTERS: Array<{ id: BusinessFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "attention", label: "Attention" },
  { id: "inactive", label: "Setup" },
  { id: "logo", label: "No logo" },
  { id: "payments", label: "Payments" },
]

export default function BusinessesTable({ rows, initialSearch = "", initialFilter = "all" }: { rows: BusinessRow[]; initialSearch?: string; initialFilter?: BusinessFilter }) {
  const [search, setSearch] = useState(initialSearch)
  const [filter, setFilter] = useState<BusinessFilter>(initialFilter)
  const q = search.toLowerCase().trim()
  const filtered = rows.filter((row) => {
    const matchesSearch = !q || row.name.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q) || (row.email ?? "").toLowerCase().includes(q)
    if (!matchesSearch) return false
    if (filter === "attention") return row.issues.length > 0
    if (filter === "inactive") return row.issues.includes("Not active")
    if (filter === "logo") return row.issues.includes("No logo")
    if (filter === "payments") return row.issues.includes("No payment setup")
    return true
  })

  return (
    <div>
      <div className="hq-business-toolbar">
        <input className="hq-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, site, or email" aria-label="Search businesses" />
        <div className="hq-filter-row" aria-label="Filter businesses">
          {FILTERS.map((item) => <button key={item.id} type="button" data-active={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
        </div>
      </div>
      <div className="hq-business-list">
        {filtered.map((row) => <BusinessItem key={row.id} row={row} />)}
        {filtered.length === 0 && <div className="hq-business-empty">No businesses match this view.</div>}
      </div>
    </div>
  )
}
