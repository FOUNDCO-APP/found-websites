"use client"

import { useState } from "react"

export default function BusinessNameEditor({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!name.trim() || name.trim() === initialName) { setEditing(false); return }
    setSaving(true)
    const res = await fetch("/api/company-slug", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <section style={{ marginBottom: 24, padding: "0 20px" }}>
      <div style={{
        borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)", padding: "18px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: editing ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>
              Business Display Name
            </div>
            {!editing && (
              <div style={{ fontSize: 17, fontWeight: 700, color: "white" }}>{name}</div>
            )}
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              {saved ? "Saved ✓" : "Edit"}
            </button>
          )}
        </div>
        {editing && (
          <>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              placeholder="e.g. Barrio Builders"
              style={{
                width: "100%", padding: "13px 15px", borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                color: "white", fontSize: 16, fontWeight: 600, outline: "none",
              }}
            />
            <p style={{ margin: "8px 0 14px", fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.5 }}>
              This name appears on estimates, emails, and your website. It doesn&apos;t change your URL.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setEditing(false); setName(initialName) }}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none", backgroundColor: "#30D158", color: "#000", fontSize: 14, fontWeight: 800, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Saving…" : "Save Name"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
