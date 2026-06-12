"use client"

import { useState } from "react"
import { connectDomain } from "./actions"

export default function ConnectDomainForm({
  slug,
  existingDomain,
}: {
  slug: string
  existingDomain: string | null
}) {
  const [domain, setDomain]   = useState(existingDomain ?? "")
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!domain.trim()) return
    setSaving(true)
    setError(null)
    setSaved(false)
    const res = await connectDomain(slug, domain)
    setSaving(false)
    if (res.success) {
      setSaved(true)
    } else {
      setError(res.error ?? "Something went wrong.")
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: "#ffffff", borderRadius: "14px", padding: "24px" }}>
      <p style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#111" }}>
        {existingDomain ? "Update your domain" : "Connect your domain"}
      </p>
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          type="text"
          value={domain}
          onChange={(e) => { setDomain(e.target.value); setSaved(false) }}
          placeholder="yourbusiness.com"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: 1,
            fontSize: "16px",
            fontWeight: 700,
            padding: "14px 16px",
            borderRadius: "10px",
            border: "1.5px solid #e0e0e0",
            outline: "none",
            color: "#111",
          }}
        />
        <button
          type="submit"
          disabled={saving || !domain.trim()}
          style={{
            background: saving ? "#ccc" : "#080A09",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 900,
            padding: "14px 22px",
            borderRadius: "10px",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
            letterSpacing: "0.03em",
          }}
        >
          {saving ? "Saving…" : "Connect →"}
        </button>
      </div>

      {error && (
        <p style={{ margin: "12px 0 0", fontSize: "13px", fontWeight: 700, color: "#e53935" }}>
          {error}
        </p>
      )}

      {saved && (
        <div style={{ margin: "12px 0 0", padding: "14px 16px", background: "#f0fdf4", borderRadius: "10px", border: "1.5px solid #32D074" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "#1a7a3a" }}>
            ✓ Domain saved. Now add the DNS records below at your registrar — your site will be live at <strong>{domain}</strong> within the hour.
          </p>
        </div>
      )}
    </form>
  )
}
