"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { setViewAsCookie, toggleComp, saveNotes } from "./actions"

const SIGNAL_GREEN = "#32D074"
const AMBER = "#f5c842"
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

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

function statusLabel(status: string | null, isComp: boolean | null) {
  if (isComp) return { text: "Comp", color: SIGNAL_GREEN }
  if (status === "active" || status === "trialing") return { text: "Active", color: SIGNAL_GREEN }
  return { text: "Inactive", color: "rgba(255,255,255,0.35)" }
}

// Opens a new tab immediately (before any await) so the browser still
// treats it as a direct response to the click - waiting until after the
// server action resolves gets the popup silently blocked. The tab starts
// blank and only gets pointed at the dashboard once the admin cookie for
// this company is actually set.
async function openViewAs(companyId: string) {
  const tab = window.open("about:blank", "_blank")
  try {
    const result = await setViewAsCookie(companyId)
    if (result.success && tab) {
      tab.location.href = `https://my.${ROOT_DOMAIN}/?admin_view=1`
    } else {
      tab?.close()
    }
  } catch {
    tab?.close()
  }
}

function IssueChip({ issue }: { issue: string }) {
  const style = {
    fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 100,
    backgroundColor: "rgba(245,200,66,0.12)", color: AMBER,
    border: "1px solid rgba(245,200,66,0.25)", textDecoration: "none",
  }
  if (issue === "Fallback copy") {
    return <Link href="/admin/copy" style={style}>{issue} →</Link>
  }
  return <span style={style}>{issue}</span>
}

function BusinessRowItem({ row }: { row: BusinessRow }) {
  const [notes, setNotes] = useState(row.admin_notes ?? "")
  const [comp, setComp] = useState(Boolean(row.is_comp))
  const [savingNotes, setSavingNotes] = useState(false)
  const [pending, startTransition] = useTransition()
  const status = statusLabel(row.subscription_status, comp)

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
    <div style={{
      borderRadius: 16, padding: "18px 20px", marginBottom: 8,
      backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{row.name}</span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: status.color }}>
              {status.text}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            {row.slug}.foundco.app · {planLabel(row.plan)} · {row.industry_category ?? "—"}
            {row.email ? ` · ${row.email}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <a
            href={`https://${row.slug}.${ROOT_DOMAIN}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "8px 14px", borderRadius: 100, cursor: "pointer", textDecoration: "none",
              backgroundColor: "transparent", color: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.15)", fontSize: 12, fontWeight: 800,
            }}
          >
            View site ↗
          </a>
          <button
            type="button"
            onClick={() => openViewAs(row.id)}
            style={{
              padding: "8px 14px", borderRadius: 100, border: "none", cursor: "pointer",
              backgroundColor: SIGNAL_GREEN, color: "#080A09", fontSize: 12, fontWeight: 800,
            }}
          >
            View as →
          </button>
        </div>
      </div>

      {row.issues.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {row.issues.map(issue => <IssueChip key={issue} issue={issue} />)}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <button onClick={handleCompToggle} disabled={pending} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 100,
          border: `1px solid ${comp ? SIGNAL_GREEN : "rgba(255,255,255,0.15)"}`,
          backgroundColor: comp ? `${SIGNAL_GREEN}18` : "transparent",
          color: comp ? SIGNAL_GREEN : "rgba(255,255,255,0.4)",
          fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: comp ? SIGNAL_GREEN : "rgba(255,255,255,0.25)" }} />
          {comp ? "Comp account" : "Mark as comp"}
        </button>
      </div>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={handleNotesBlur}
        placeholder="Notes — how you met them, what this account is for..."
        rows={2}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 10,
          backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          color: "white", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
      {savingNotes && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Saving…</div>}
    </div>
  )
}

export default function BusinessesTable({ rows }: { rows: BusinessRow[] }) {
  const [search, setSearch] = useState("")
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false)
  const q = search.toLowerCase().trim()

  let filtered = q
    ? rows.filter(r => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q))
    : rows
  if (needsAttentionOnly) filtered = filtered.filter(r => r.issues.length > 0)

  const attentionCount = rows.filter(r => r.issues.length > 0).length

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, slug, or email…"
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 12,
            backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
            color: "white", fontSize: 14, outline: "none", boxSizing: "border-box", minWidth: 0,
          }}
        />
        <button
          type="button"
          onClick={() => setNeedsAttentionOnly(v => !v)}
          style={{
            padding: "0 14px", borderRadius: 12, whiteSpace: "nowrap", cursor: "pointer",
            border: `1px solid ${needsAttentionOnly ? AMBER : "rgba(255,255,255,0.08)"}`,
            backgroundColor: needsAttentionOnly ? "rgba(245,200,66,0.12)" : "rgba(255,255,255,0.05)",
            color: needsAttentionOnly ? AMBER : "rgba(255,255,255,0.5)",
            fontSize: 12, fontWeight: 800,
          }}
        >
          Needs attention{attentionCount > 0 ? ` (${attentionCount})` : ""}
        </button>
      </div>
      {filtered.map(row => <BusinessRowItem key={row.id} row={row} />)}
      {filtered.length === 0 && (
        <p style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
          {needsAttentionOnly ? "Nothing needs attention right now." : `No businesses match "${search}".`}
        </p>
      )}
    </div>
  )
}
