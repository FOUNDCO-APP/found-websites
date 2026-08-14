"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { setViewAsCookie, toggleTest, setIncludedAddon } from "../businesses/actions"
import { getAllAddonsRanked } from "@/lib/featureAccess"
import { addClientNote, updateClientRecord } from "./actions"

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
  const [state, setState] = useState(row.client_state)
  const isRecent = Date.now() - new Date(row.created_at).getTime() < 48 * 3600000
  const [isTest, setIsTest] = useState(Boolean(row.is_test))
  const [testPending, startTestTransition] = useTransition()
  const [includedAddon, setIncludedAddonState] = useState(row.included_addon_slug)
  const [addonPending, startAddonTransition] = useTransition()
  const relevantAddons = row.plan === "found_pro" ? getAllAddonsRanked(row.industry_category ?? "") : []

  function handleTestToggle() {
    const next = !isTest
    setIsTest(next)
    startTestTransition(() => { toggleTest(row.id, next) })
  }

  function handleAddonChange(slug: string | null) {
    if (slug === includedAddon) return
    setIncludedAddonState(slug)
    startAddonTransition(() => { setIncludedAddon(row.id, slug) })
  }

  return (
    <article className="hq-business-row">
      <div className="hq-business-main">
        <div className="hq-business-copy">
          <div className="hq-business-name-line">
            <h2>{row.name}</h2>
            <span className={`hq-badge hq-badge-${stateTone(row.client_state)}`}>{row.account_kind === "test" ? "Test" : row.client_state.replace("_", " ")}</span>
            {isRecent && <span className="hq-badge hq-badge-success">New</span>}
            {isTest && <span className="hq-badge hq-badge-info">Hidden from search</span>}
          </div>
          <p>{planLabel(row.plan)} / Billing: {row.subscription_status ?? "not active"}</p>
          <p>{row.email ?? "No email"}{row.phone ? ` / ${row.phone}` : ""}</p>
          {row.issues.length > 0 && <div className="hq-business-issues">{row.issues.map((issue) => <span key={issue} className="hq-badge hq-badge-warning">{issue}</span>)}</div>}
        </div>
        <div className="hq-business-actions">
          <a className="hq-button hq-button-secondary" href={`https://${row.slug}.${ROOT_DOMAIN}`} target="_blank" rel="noopener noreferrer">Site</a>
          <button className="hq-button hq-button-primary" type="button" onClick={() => openViewAs(row.id)}>View as</button>
        </div>
      </div>
      <details className="hq-business-manage">
        <summary>Manage relationship</summary>
        <div className="hq-business-manage-body hq-sales-forms">
          <form action={updateClientRecord} className="hq-inline-form">
            <input type="hidden" name="id" value={row.id} />
            <label>Client state<select name="client_state" value={state} onChange={(event) => setState(event.target.value)}><option value="onboarding">Onboarding</option><option value="active">Active</option><option value="comp">Comp</option><option value="past_due">Past due</option><option value="cancelled">Cancelled</option></select></label>
            <label>Account type<select name="account_kind" defaultValue={row.account_kind}><option value="client">Client</option><option value="test">Test</option></select></label>
            {state === "comp" && <label>Comp reason<input name="comp_reason" required defaultValue={row.comp_reason ?? ""} /></label>}
            <label className="hq-form-grow">Optional note<input name="activity_note" placeholder="Why this changed" /></label>
            <button className="hq-button hq-button-primary" type="submit">Save</button>
          </form>
          {row.plan === "found_pro" && relevantAddons.length > 0 && (
            <div className="hq-inline-form">
              <label className="hq-form-grow">Included add-on (Pro plan, one pick, free)
                <div className="hq-filter-row">
                  <button type="button" data-active={!includedAddon} disabled={addonPending} onClick={() => handleAddonChange(null)}>None</button>
                  {relevantAddons.map((addon) => (
                    <button key={addon.slug} type="button" data-active={includedAddon === addon.slug} disabled={addonPending} onClick={() => handleAddonChange(addon.slug)}>{addon.label}</button>
                  ))}
                </div>
              </label>
            </div>
          )}
          <div className="hq-inline-form">
            <button type="button" onClick={handleTestToggle} disabled={testPending} className="hq-button hq-button-secondary">{isTest ? "Show in search" : "Hide from search"}</button>
          </div>
          <form action={addClientNote} className="hq-inline-form">
            <input type="hidden" name="id" value={row.id} />
            <label className="hq-form-grow">Dated note<input name="note" required placeholder="Conversation, promise, or context" /></label>
            <button className="hq-button hq-button-secondary" type="submit">Add note</button>
          </form>
          {row.last_activity && <p className="hq-form-note">Latest: {row.last_activity}</p>}
          {row.emails.length > 0 && (
            <div className="hq-form-note">
              <strong>Emails sent</strong>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {row.emails.map((email, i) => (
                  <li key={i}>{new Date(email.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {email.summary}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
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
