"use client"

import { useState } from "react"
import { GREEN, BLACK, TYPE, TEXT_OPACITY } from "@/lib/dashboard/typography"
import { inviteWorker, revokeWorker, getTeamMembers, type TeamMember } from "@/app/dashboard/(app)/team/actions"

export default function TeamClient({ initialMembers }: { initialMembers: TeamMember[] }) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [email, setEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleInvite() {
    setError(null)
    setInviting(true)
    try {
      const result = await inviteWorker(email)
      if ("error" in result) {
        setError(result.error)
        return
      }
      setEmail("")
      showToast("Invite sent")
      const fresh = await getTeamMembers()
      setMembers(fresh)
    } finally {
      setInviting(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Remove this person's access?")) return
    const result = await revokeWorker(id)
    if ("error" in result) {
      setError(result.error)
      return
    }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: "revoked" } : m))
    showToast("Access removed")
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box" as const,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12, padding: "12px 14px",
    color: "white", fontSize: 15, outline: "none",
    fontFamily: "inherit",
  }
  const card = {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: "18px 18px",
  }

  const activeMembers = members.filter(m => m.status === "active")

  return (
    <main style={{ padding: "28px 20px 60px" }}>
      <h1 style={{ margin: "0 0 6px", ...TYPE.largeTitle, color: "white" }}>Team</h1>
      <p style={{ margin: "0 0 28px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
        Add crew members who can capture job photos. They can't see your leads, contacts, estimates, or edit your website.
      </p>

      <div style={{ ...card, marginBottom: 20 }}>
        <p style={{ margin: "0 0 10px", ...TYPE.subhead, fontWeight: 600, color: "white" }}>Invite someone</p>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="their@email.com"
            type="email"
            style={inputStyle}
            onKeyDown={e => { if (e.key === "Enter" && email.trim() && !inviting) handleInvite() }}
          />
          <button
            onClick={handleInvite}
            disabled={!email.trim() || inviting}
            style={{
              flexShrink: 0, padding: "0 22px", borderRadius: 12, border: "none",
              backgroundColor: email.trim() ? GREEN : "rgba(255,255,255,0.07)",
              color: email.trim() ? BLACK : "rgba(255,255,255,0.3)",
              ...TYPE.subhead, fontWeight: 800, cursor: email.trim() ? "pointer" : "default",
            }}
          >
            {inviting ? "Sending…" : "Invite"}
          </button>
        </div>
        {error && (
          <p style={{ margin: "10px 0 0", ...TYPE.caption, color: "#FF3B30" }}>{error}</p>
        )}
        <p style={{ margin: "10px 0 0", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
          They'll get an email with a one-tap link straight to the camera - no password needed.
        </p>
      </div>

      <p style={{ margin: "0 0 8px", ...TYPE.caption, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
        On your team
      </p>

      {activeMembers.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "32px 20px" }}>
          <p style={{ margin: 0, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            Nobody added yet.
          </p>
        </div>
      ) : (
        activeMembers.map(m => (
          <div key={m.id} style={{ ...card, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 600, color: "white" }}>{m.email}</p>
              <p style={{ margin: "2px 0 0", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Camera &amp; job photos only</p>
            </div>
            <button
              onClick={() => handleRevoke(m.id)}
              style={{ background: "none", border: "1px solid rgba(255,59,48,0.25)", borderRadius: 9, padding: "6px 14px", color: "#FF3B30", ...TYPE.caption, fontWeight: 700, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}
            >
              Remove
            </button>
          </div>
        ))
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          zIndex: 200, backgroundColor: "rgba(8,10,9,0.92)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100,
          padding: "10px 20px", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span style={{ ...TYPE.footnote, fontWeight: 600, color: "white" }}>{toast}</span>
        </div>
      )}
    </main>
  )
}
