"use client"

import { useEffect, useMemo, useState } from "react"

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function looksLikeSlug(name: string, slug: string) {
  const cleanName = normalized(name)
  const cleanSlug = normalized(slug)
  if (!cleanName || !cleanSlug) return false
  return cleanName === cleanSlug || (!name.includes(" ") && name === name.toLowerCase())
}

function titleFromSlug(slug: string) {
  if (!slug.includes("-")) return ""
  return slug
    .split("-")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default function BusinessDisplayNamePrompt({ initialName, slug }: { initialName: string; slug: string }) {
  const storageKey = `found-display-name-prompt:${slug}`
  const shouldAsk = useMemo(() => looksLikeSlug(initialName, slug), [initialName, slug])
  const suggestion = useMemo(() => titleFromSlug(slug), [slug])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(suggestion || initialName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shouldAsk) return
    if (window.sessionStorage.getItem(storageKey) === "dismissed") return
    setOpen(true)
  }, [shouldAsk, storageKey])

  if (!open) return null

  async function saveName() {
    const nextName = name.trim()
    if (!nextName) return
    setSaving(true)
    setError(null)
    const res = await fetch("/api/company-slug", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    })
    setSaving(false)
    if (!res.ok) {
      setError("Could not save the name. Try again.")
      return
    }
    window.location.reload()
  }

  function keepCurrent() {
    window.sessionStorage.setItem(storageKey, "dismissed")
    setOpen(false)
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.58)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "20px", paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
      <section style={{ width: "100%", maxWidth: 440, borderRadius: 28, border: "1px solid rgba(255,255,255,0.12)", background: "#101411", boxShadow: "0 24px 80px rgba(0,0,0,0.45)", padding: 22 }}>
        <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#32D074" }}>
          Business name
        </p>
        <h2 style={{ margin: "0 0 10px", fontSize: 28, lineHeight: 1.05, fontWeight: 400, letterSpacing: 0, color: "white" }}>
          How should your business name appear?
        </h2>
        <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.55, color: "rgba(255,255,255,0.62)" }}>
          Your URL can stay <strong style={{ color: "white" }}>{slug}</strong>. This is the name clients see on emails, estimates, and your website.
        </p>
        <input
          value={name}
          onChange={event => setName(event.target.value)}
          autoFocus
          placeholder="Spa Mambo"
          style={{ width: "100%", boxSizing: "border-box", borderRadius: 16, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.07)", color: "white", padding: "15px 16px", fontSize: 18, fontWeight: 700, outline: "none" }}
        />
        {error && <p style={{ margin: "10px 0 0", fontSize: 13, color: "#FF453A" }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            type="button"
            onClick={keepCurrent}
            style={{ flex: 1, minHeight: 50, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.58)", fontSize: 14, fontWeight: 800 }}
          >
            Keep current
          </button>
          <button
            type="button"
            onClick={saveName}
            disabled={saving || !name.trim()}
            style={{ flex: 1.45, minHeight: 50, borderRadius: 999, border: "none", background: "#32D074", color: "#080A09", fontSize: 14, fontWeight: 900, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving..." : "Save display name"}
          </button>
        </div>
      </section>
    </div>
  )
}