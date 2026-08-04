"use client"
import { useState, useTransition } from "react"
import { cancelTestSubscription } from "./actions"

export type BillingRow = {
  id: string
  name: string
  slug: string
  email: string | null
  plan: string
  monthly: number
  subscriptionCount: number
}

export default function BillingTable({ rows: initialRows }: { rows: BillingRow[] }) {
  const [rows, setRows] = useState(initialRows)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [canceling, setCanceling] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(prev => prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id)))
  }

  async function cancelOne(id: string) {
    setCanceling(prev => new Set(prev).add(id))
    setError(null)
    const result = await cancelTestSubscription(id)
    setCanceling(prev => { const next = new Set(prev); next.delete(id); return next })
    if (!result.success) {
      setError(result.error ?? "Couldn't cancel that subscription.")
      return
    }
    setRows(prev => prev.filter(r => r.id !== id))
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  function cancelSelected() {
    if (selected.size === 0) return
    if (!window.confirm(`Cancel ${selected.size} test subscription${selected.size === 1 ? "" : "s"}? This stops the next charge immediately - it can't be undone from here.`)) return
    startTransition(async () => {
      for (const id of Array.from(selected)) {
        await cancelOne(id)
      }
    })
  }

  if (rows.length === 0) {
    return <p className="hq-row-meta">No test accounts with an active Stripe subscription right now.</p>
  }

  return (
    <div>
      {error && <p className="hq-row-meta" style={{ color: "var(--hq-red)", marginBottom: 10 }}>{error}</p>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={selected.size === rows.length} onChange={toggleAll} />
          Select all ({rows.length})
        </label>
        <button
          className="hq-button"
          style={{ color: "var(--hq-red)", borderColor: "var(--hq-red)" }}
          disabled={selected.size === 0 || isPending}
          onClick={cancelSelected}
        >
          {isPending ? "Canceling…" : `Cancel selected (${selected.size})`}
        </button>
      </div>
      <div className="hq-panel">
        {rows.map(row => (
          <div key={row.id} className="hq-row" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="hq-row-title">{row.name} <span className="hq-row-meta" style={{ display: "inline" }}>· {row.slug}</span></p>
              <p className="hq-row-meta">{row.plan} · {row.email ?? "no email"} · {row.subscriptionCount} subscription{row.subscriptionCount === 1 ? "" : "s"}</p>
            </div>
            <span className="hq-badge hq-badge-info">${row.monthly.toFixed(2)}/mo</span>
            <button
              className="hq-button"
              style={{ color: "var(--hq-red)", borderColor: "var(--hq-red)" }}
              disabled={canceling.has(row.id)}
              onClick={() => {
                if (!window.confirm(`Cancel ${row.name}'s subscription? This stops the next charge immediately.`)) return
                cancelOne(row.id)
              }}
            >
              {canceling.has(row.id) ? "Canceling…" : "Cancel"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
