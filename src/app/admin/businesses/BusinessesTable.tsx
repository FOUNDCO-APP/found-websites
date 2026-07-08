"use client"

import { useState, useTransition } from "react"
import { viewAsCompany, toggleComp, saveNotes } from "./actions"

const SIGNAL_GREEN = "#32D074"

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
        <form action={() => viewAsCompany(row.id)} style={{ flexShrink: 0 }}>
          <button type="submit" style={{
            padding: "8px 14px", borderRadius: 100, border: "none", cursor: "pointer",
            backgroundColor: SIGNAL_GREEN, color: "#080A09", fontSize: 12, fontWeight: 800,
          }}>
            View as →
          </button>
        </form>
      </div>

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
  const q = search.toLowerCase().trim()
  const filtered = q
    ? rows.filter(r => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q))
    : rows

  return (
    <div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, slug, or email…"
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 12, marginBottom: 16,
          backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
          color: "white", fontSize: 14, outline: "none", boxSizing: "border-box",
        }}
      />
      {filtered.map(row => <BusinessRowItem key={row.id} row={row} />)}
      {filtered.length === 0 && (
        <p style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
          No businesses match &quot;{search}&quot;.
        </p>
      )}
    </div>
  )
}
