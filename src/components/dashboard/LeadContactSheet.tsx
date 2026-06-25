"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { GREEN, BLACK } from "@/lib/dashboard/typography"

type Channel = "email" | "sms"
type Step = "templates" | "compose" | "saving"

type BuiltInTemplate = {
  name: string
  subject: string
  body: string
  smsBody: string
}

type SavedTemplate = {
  id: string
  name: string
  subject: string | null
  body: string
  channel: string
  context: string
}

// ─── Industry-aware built-in templates ───────────────────────────

function getBuiltInTemplates(
  context: "order" | "booking" | "lead",
  industry: string | null
): BuiltInTemplate[] {
  const isFood    = industry === "food"
  const isPet     = industry === "pet_services"
  const isHome    = ["home_services", "cleaning", "landscaping"].includes(industry ?? "")
  const isWellness = ["wellness", "beauty", "fitness"].includes(industry ?? "")

  if (context === "order") {
    if (isFood) return [
      {
        name: "Question about your order",
        subject: "Quick question about your order",
        body: "Hi {firstName},\n\nI wanted to reach out about your recent order from {companyName}.\n\n[Your question here]\n\nThanks for choosing us — we want to make sure everything is right.\n\n{companyName}",
        smsBody: "Hi {firstName}, quick question about your recent order from {companyName} — [your question]. Reply anytime.",
      },
      {
        name: "Issue with your order",
        subject: "Regarding your recent order",
        body: "Hi {firstName},\n\nI wanted to reach out about a small issue with your recent order.\n\n[Describe the issue]\n\nWe want to make it right — please reply or give us a call anytime.\n\n{companyName}",
        smsBody: "Hi {firstName}, there's a small issue with your recent order from {companyName}. Call or text us back and we'll make it right.",
      },
      {
        name: "Thank you for ordering",
        subject: "Thank you!",
        body: "Hi {firstName},\n\nJust wanted to say thank you for your order. We truly appreciate your business and hope you enjoyed everything!\n\nWe'd love to see you again soon.\n\n{companyName}",
        smsBody: "Hi {firstName}, thank you for ordering from {companyName}! We hope you loved it. See you again soon!",
      },
    ]
    // General / retail order
    return [
      {
        name: "Question about your order",
        subject: "A question about your order",
        body: "Hi {firstName},\n\nI had a quick question about your recent order.\n\n[Your question here]\n\nFeel free to reply to this email or give us a call.\n\n{companyName}",
        smsBody: "Hi {firstName}, quick question about your order from {companyName} — [question]. Reply anytime.",
      },
      {
        name: "Issue with your order",
        subject: "Update on your order",
        body: "Hi {firstName},\n\nI wanted to reach out about your order. There's a small issue I'd like to address.\n\n[Describe the issue]\n\nWe're here to help — please don't hesitate to reply or call us.\n\n{companyName}",
        smsBody: "Hi {firstName}, there's an update on your order from {companyName}. Can we connect? Call or text us back.",
      },
      {
        name: "Thank you for your purchase",
        subject: "Thank you!",
        body: "Hi {firstName},\n\nThank you for your recent order — we truly appreciate your business.\n\nIf you have any questions at all, just reply to this email. We're here to help.\n\n{companyName}",
        smsBody: "Hi {firstName}, thanks for your order from {companyName}! Let us know if you need anything.",
      },
    ]
  }

  if (context === "booking") {
    if (isFood) return [
      {
        name: "Question about your reservation",
        subject: "Quick question about your reservation",
        body: "Hi {firstName},\n\nWe're looking forward to seeing you! I just had a quick question about your upcoming reservation.\n\n[Your question here]\n\nFeel free to reply or give us a call.\n\n{companyName}",
        smsBody: "Hi {firstName}, quick question about your reservation at {companyName} — [question]. Reply anytime!",
      },
      {
        name: "Need more info",
        subject: "A couple things before your visit",
        body: "Hi {firstName},\n\nWe're excited to have you in. Before your reservation, I wanted to check on a couple things.\n\n[What you need to know]\n\nLooking forward to seeing you!\n\n{companyName}",
        smsBody: "Hi {firstName}, we have a quick question before your reservation at {companyName}. Can you reply when you get a chance?",
      },
      {
        name: "Looking forward to seeing you",
        subject: "See you soon!",
        body: "Hi {firstName},\n\nJust a friendly note to let you know we're looking forward to your visit!\n\nIf there's anything special we can do to make your experience great, just let us know.\n\n{companyName}",
        smsBody: "Hi {firstName}, we're looking forward to seeing you at {companyName}! Let us know if you need anything.",
      },
    ]
    if (isPet) return [
      {
        name: "Info before your pet's visit",
        subject: "A few things before your pet's visit",
        body: "Hi {firstName},\n\nWe're looking forward to seeing your pet! Before the appointment, I had a quick question.\n\n[Your question here]\n\nFeel free to reply or give us a call.\n\n{companyName}",
        smsBody: "Hi {firstName}, quick question before your pet's visit at {companyName} — [question]. Reply anytime!",
      },
      {
        name: "Need to reschedule",
        subject: "Rescheduling your pet's appointment",
        body: "Hi {firstName},\n\nI wanted to reach out about your upcoming appointment. We need to make a small change.\n\n[Explain the reschedule reason]\n\nWhen would work best for you? Just reply and we'll get you set up.\n\n{companyName}",
        smsBody: "Hi {firstName}, we need to reschedule your pet's appointment at {companyName}. When works for you? Reply anytime.",
      },
      {
        name: "Checking in after the visit",
        subject: "How is your pet doing?",
        body: "Hi {firstName},\n\nWe just wanted to check in and see how your pet is doing after their visit. We hope everything went smoothly!\n\nDon't hesitate to reach out if you have any questions.\n\n{companyName}",
        smsBody: "Hi {firstName}, just checking in — how is your pet doing after their visit to {companyName}? Let us know if you need anything!",
      },
    ]
    if (isWellness) return [
      {
        name: "Questions before your appointment",
        subject: "A few things before your appointment",
        body: "Hi {firstName},\n\nWe're looking forward to seeing you! I had a couple quick questions before your appointment.\n\n[Your questions here]\n\nFeel free to reply or give us a call.\n\n{companyName}",
        smsBody: "Hi {firstName}, quick question before your appointment at {companyName} — [question]. Reply anytime!",
      },
      {
        name: "Need to reschedule",
        subject: "Rescheduling your appointment",
        body: "Hi {firstName},\n\nI wanted to reach out about your upcoming appointment. We need to make a change.\n\n[Explain the reason]\n\nWhen would work best for you? Just reply and we'll get it sorted right away.\n\n{companyName}",
        smsBody: "Hi {firstName}, we need to reschedule your appointment at {companyName}. When works for you? Reply anytime.",
      },
      {
        name: "Thank you for coming in",
        subject: "Thank you!",
        body: "Hi {firstName},\n\nThank you so much for coming in. We hope you felt amazing and we're grateful for your trust in us.\n\nWe'd love to see you again — and if you have a moment, a quick review means a lot to us.\n\n{companyName}",
        smsBody: "Hi {firstName}, thank you for coming in to {companyName}! We hope you feel great. See you next time!",
      },
    ]
    if (isHome) return [
      {
        name: "Question before the job",
        subject: "Quick question before we arrive",
        body: "Hi {firstName},\n\nWe're scheduled to come out soon and I wanted to reach out with a quick question first.\n\n[Your question here]\n\nFeel free to reply or give us a call. We want to make sure everything goes smoothly.\n\n{companyName}",
        smsBody: "Hi {firstName}, quick question before your job at {companyName} — [question]. Reply anytime!",
      },
      {
        name: "Schedule update",
        subject: "Update on your scheduled job",
        body: "Hi {firstName},\n\nI wanted to reach out with a quick update about your scheduled appointment.\n\n[Your update here]\n\nThank you for your patience. Don't hesitate to call or reply with any questions.\n\n{companyName}",
        smsBody: "Hi {firstName}, quick update on your job from {companyName}: [update]. Call or text us back if needed.",
      },
      {
        name: "Follow-up after the job",
        subject: "Following up on the work",
        body: "Hi {firstName},\n\nJust wanted to follow up and make sure everything looks great from the work we did.\n\nIf there's anything at all that isn't right, please don't hesitate to reach out. We stand behind our work.\n\n{companyName}",
        smsBody: "Hi {firstName}, following up from {companyName} — how did everything look after the job? Let us know if anything needs attention!",
      },
    ]
    // Generic booking
    return [
      {
        name: "Question about your appointment",
        subject: "Quick question before your appointment",
        body: "Hi {firstName},\n\nLooking forward to seeing you! I had a quick question before your appointment.\n\n[Your question here]\n\n{companyName}",
        smsBody: "Hi {firstName}, quick question before your appointment at {companyName} — [question]. Reply anytime!",
      },
      {
        name: "Need to reschedule",
        subject: "Rescheduling your appointment",
        body: "Hi {firstName},\n\nI need to reach out about your upcoming appointment. We need to make a change.\n\n[Reason here]\n\nWhen would work best for you?\n\n{companyName}",
        smsBody: "Hi {firstName}, we need to reschedule your appointment at {companyName}. When works for you?",
      },
      {
        name: "Thank you",
        subject: "Thank you!",
        body: "Hi {firstName},\n\nThank you for choosing us. It was great working with you and we hope to see you again soon!\n\n{companyName}",
        smsBody: "Hi {firstName}, thanks for coming to {companyName}! Hope everything was great. See you next time!",
      },
    ]
  }

  // context === "lead" — general inquiry follow-up
  return [
    {
      name: "Following up",
      subject: "Following up on your inquiry",
      body: "Hi {firstName},\n\nJust wanted to follow up on your recent inquiry. We'd love to help and answer any questions you might have.\n\nFeel free to reply to this email or give us a call anytime.\n\n{companyName}",
      smsBody: "Hi {firstName}, following up from {companyName} — do you have any questions? Happy to help. Reply anytime!",
    },
    {
      name: "More information",
      subject: "More about what we offer",
      body: "Hi {firstName},\n\nThank you for reaching out! I wanted to share a little more about what we offer.\n\n[Add your services/details here]\n\nWould you like to schedule a time to talk or get started?\n\n{companyName}",
      smsBody: "Hi {firstName}, thanks for reaching out to {companyName}! Happy to share more about what we do. Reply anytime.",
    },
    {
      name: "Ready to get started?",
      subject: "Ready to get started?",
      body: "Hi {firstName},\n\nJust checking in to see if you're ready to move forward. We'd love to work with you!\n\nIf you have any questions or need more information, just reply.\n\n{companyName}",
      smsBody: "Hi {firstName}, just checking in from {companyName} — are you ready to get started? Reply and let's go!",
    },
  ]
}

// ─── Sheet wrapper ────────────────────────────────────────────────
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

// ─── Main component ───────────────────────────────────────────────
export default function LeadContactSheet({
  lead, industry, companyName, defaultChannel, onClose,
}: {
  lead: { name: string | null; email: string | null; phone: string | null; type: string | null; source: string | null }
  industry: string | null
  companyName: string
  defaultChannel?: Channel
  onClose: () => void
}) {
  const hasEmail = !!lead.email
  const hasPhone = !!lead.phone

  const [channel, setChannel]             = useState<Channel>(defaultChannel ?? (hasEmail ? "email" : "sms"))
  const [step, setStep]                   = useState<Step>("templates")
  const [subject, setSubject]             = useState("")
  const [body, setBody]                   = useState("")
  const [smsBody, setSmsBody]             = useState("")
  const [sending, setSending]             = useState(false)
  const [sent, setSent]                   = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName]           = useState("")
  const [saving, setSaving]               = useState(false)

  // Derive context from lead type/source
  const context: "order" | "booking" | "lead" = (() => {
    const t = lead.type ?? ""; const s = lead.source ?? ""
    if (t === "online_order" || s === "online_ordering") return "order"
    if (t === "reservation_request" || s === "reservation" || s === "reservations" || t === "booking") return "booking"
    return "lead"
  })()

  const builtIns = getBuiltInTemplates(context, industry)

  useEffect(() => {
    fetch(`/api/leads/templates?context=${context}&channel=${channel}`)
      .then(r => r.json())
      .then(d => setSavedTemplates(d.templates ?? []))
      .catch(() => {})
  }, [context, channel])

  function personalizePreview(text: string) {
    const firstName = (lead.name || "there").split(" ")[0]
    return text.replace(/\{firstName\}/gi, firstName).replace(/\{companyName\}/gi, companyName)
  }

  function pickBuiltIn(t: BuiltInTemplate) {
    if (channel === "email") {
      setSubject(t.subject)
      setBody(t.body)
    } else {
      setSmsBody(t.smsBody)
    }
    setStep("compose")
  }

  function pickSaved(t: SavedTemplate) {
    if (channel === "email") {
      setSubject(t.subject ?? "")
      setBody(t.body)
    } else {
      setSmsBody(t.body)
    }
    setStep("compose")
  }

  async function handleDeleteSaved(id: string) {
    await fetch(`/api/leads/templates?id=${id}`, { method: "DELETE" })
    setSavedTemplates(prev => prev.filter(t => t.id !== id))
  }

  async function handleSendEmail() {
    if (!lead.email || !subject.trim() || !body.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/leads/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: lead.email, recipientName: lead.name, subject, body }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Send failed"); return }
      setSent(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSending(false)
    }
  }

  async function handleSaveTemplate() {
    if (!saveName.trim()) return
    setSaving(true)
    const payload = channel === "email"
      ? { name: saveName, subject, body, context, channel }
      : { name: saveName, body: smsBody, context, channel }
    try {
      const res = await fetch("/api/leads/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.template) {
        setSavedTemplates(prev => [data.template, ...prev])
        setShowSaveModal(false)
        setSaveName("")
      }
    } finally {
      setSaving(false)
    }
  }

  // Styles
  const dim = "rgba(255,255,255,0.45)"
  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "13px 14px", fontSize: 14, color: "white", outline: "none", resize: "none" as const, fontFamily: "inherit" }

  return (
    <Portal>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end" }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxHeight: "88vh", display: "flex", flexDirection: "column", backgroundColor: "#1C1C1E", borderRadius: "20px 20px 0 0", paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>

          {/* Drag handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)" }} />
          </div>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px 14px" }}>
            <div>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "white" }}>{lead.name || "Contact"}</p>
              <p style={{ margin: 0, fontSize: 12, color: dim }}>{channel === "email" ? lead.email : lead.phone}</p>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Channel tabs — only show if both exist */}
          {hasEmail && hasPhone && (
            <div style={{ display: "flex", gap: 8, padding: "0 20px 14px" }}>
              {(["email", "sms"] as Channel[]).map(ch => (
                <button key={ch} onClick={() => { setChannel(ch); setStep("templates"); setError(null); setSent(false) }}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, backgroundColor: channel === ch ? GREEN : "rgba(255,255,255,0.07)", color: channel === ch ? BLACK : dim }}>
                  {ch === "email" ? "Email" : "Text"}
                </button>
              ))}
            </div>
          )}

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>

            {/* SENT state */}
            {sent && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}35`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "white" }}>Email sent</p>
                <p style={{ margin: "0 0 24px", fontSize: 14, color: dim }}>Your message is on its way to {lead.name || "them"}.</p>
                <button onClick={onClose} style={{ padding: "11px 28px", borderRadius: 999, backgroundColor: `${GREEN}18`, color: GREEN, border: `1px solid ${GREEN}35`, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Done</button>
              </div>
            )}

            {/* TEMPLATES step */}
            {!sent && step === "templates" && (
              <div style={{ paddingBottom: 24 }}>
                {/* Saved templates */}
                {savedTemplates.length > 0 && (
                  <>
                    <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: dim }}>Saved Templates</p>
                    <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
                      {savedTemplates.map((t, i) => (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", borderBottom: i < savedTemplates.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                          <button onClick={() => pickSaved(t)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const }}>
                            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: GREEN, flexShrink: 0 }} />
                            <span style={{ fontSize: 14, fontWeight: 600, color: "white" }}>{t.name}</span>
                          </button>
                          <button onClick={() => handleDeleteSaved(t.id)} style={{ padding: "13px 14px", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Built-in templates */}
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: dim }}>Templates</p>
                <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {builtIns.map((t, i) => (
                    <button key={t.name} onClick={() => pickBuiltIn(t)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 14px", background: "none", border: "none", borderBottom: i < builtIns.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", cursor: "pointer", textAlign: "left" as const }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "white" }}>{t.name}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>

                {/* Write from scratch */}
                <button onClick={() => { setSubject(""); setBody(""); setSmsBody(""); setStep("compose") }}
                  style={{ width: "100%", marginTop: 10, padding: "13px 0", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: dim, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Write from scratch
                </button>
              </div>
            )}

            {/* COMPOSE step */}
            {!sent && step === "compose" && (
              <div style={{ paddingBottom: 24 }}>
                <button onClick={() => setStep("templates")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: dim, fontSize: 13, cursor: "pointer", padding: "0 0 14px", marginLeft: -2 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Templates
                </button>

                {channel === "email" ? (
                  <>
                    <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: dim }}>Subject</p>
                    <input style={{ ...inputStyle, marginBottom: 14 }} type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject" />
                    <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: dim }}>
                      Message <span style={{ color: "rgba(255,255,255,0.2)", textTransform: "none" as const }}>— tap to edit</span>
                    </p>
                    <textarea style={{ ...inputStyle, minHeight: 200 }} value={body} onChange={e => setBody(e.target.value)} placeholder="Your message…" />
                    {error && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#F43F5E", fontWeight: 700 }}>{error}</p>}
                    <button onClick={handleSendEmail} disabled={sending || !subject.trim() || !body.trim()}
                      style={{ marginTop: 14, width: "100%", padding: "15px 0", borderRadius: 14, backgroundColor: GREEN, color: BLACK, fontSize: 15, fontWeight: 900, border: "none", cursor: "pointer", opacity: (sending || !subject.trim() || !body.trim()) ? 0.4 : 1 }}>
                      {sending ? "Sending…" : `Send to ${lead.name || "them"} →`}
                    </button>
                    <button onClick={() => setShowSaveModal(true)}
                      style={{ marginTop: 10, width: "100%", padding: "11px 0", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: dim, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Save as template
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: dim }}>
                      Text Message <span style={{ color: "rgba(255,255,255,0.2)", textTransform: "none" as const }}>— tap to edit</span>
                    </p>
                    <textarea style={{ ...inputStyle, minHeight: 140 }} value={smsBody} onChange={e => setSmsBody(e.target.value)} placeholder="Your text message…" />
                    <p style={{ margin: "6px 0 14px", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{personalizePreview(smsBody).length} chars</p>
                    <a href={`sms:${lead.phone?.replace(/\D/g, "")}?body=${encodeURIComponent(personalizePreview(smsBody))}`}
                      style={{ display: "block", textAlign: "center", padding: "15px 0", borderRadius: 14, backgroundColor: GREEN, color: BLACK, fontSize: 15, fontWeight: 900, textDecoration: "none", opacity: smsBody.trim() ? 1 : 0.4 }}>
                      Open Text App →
                    </a>
                    <button onClick={() => setShowSaveModal(true)}
                      style={{ marginTop: 10, width: "100%", padding: "11px 0", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: dim, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Save as template
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save template modal */}
      {showSaveModal && (
        <div onClick={() => setShowSaveModal(false)} style={{ position: "fixed", inset: 0, zIndex: 10000, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 340, backgroundColor: "#2C2C2E", borderRadius: 16, padding: "24px 20px" }}>
            <p style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "white" }}>Save template</p>
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Template name…"
              autoFocus
              style={{ width: "100%", boxSizing: "border-box", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "white", outline: "none", marginBottom: 14, fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowSaveModal(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)", border: "none", color: dim, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSaveTemplate} disabled={saving || !saveName.trim()} style={{ flex: 1, padding: "11px 0", borderRadius: 10, backgroundColor: GREEN, color: BLACK, border: "none", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: (!saveName.trim() || saving) ? 0.4 : 1 }}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Portal>
  )
}
