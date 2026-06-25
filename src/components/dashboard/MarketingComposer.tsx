"use client"

import { useState } from "react"
import { GREEN, BLACK, TYPE, TEXT_OPACITY } from "@/lib/dashboard/typography"

type Template = { slug: string; label: string; hint: string }

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function draftEmail(template: Template, companyName: string, industry: string | null): { subject: string; body: string } {
  const co = companyName
  switch (template.slug) {
    case "slow_week":
      return {
        subject: `A little something from ${co} this week`,
        body: `Hey {firstName},\n\nThings are a little slower this week and we wanted to pass the savings on to you.\n\nIf you've been thinking about booking with us, now's a great time — we have availability and we'd love to see you.\n\nReply to this email or give us a call to lock something in.\n\n— ${co}`,
      }
    case "new_service":
      return {
        subject: `Something new at ${co}`,
        body: `Hey {firstName},\n\nWe just added something new and wanted you to be the first to know.\n\n[Describe your new service here — what it is, what it costs, and why you love it.]\n\nReach out if you have questions — we're excited to share this with you.\n\n— ${co}`,
      }
    case "seasonal":
      return {
        subject: `Our seasonal offer — just for you`,
        body: `Hey {firstName},\n\nAs the season changes, we wanted to check in and share a little something special.\n\n[Describe your seasonal offer or promotion here.]\n\nThis offer is only available for a limited time. Reply or book directly to take advantage.\n\n— ${co}`,
      }
    case "holiday":
      return {
        subject: `Happy holidays from ${co}`,
        body: `Hey {firstName},\n\nWe just wanted to take a moment to say thank you. Whether you've been with us for years or just recently, we truly appreciate your support.\n\nWishing you and your family a wonderful holiday season.\n\n— ${co}`,
      }
    case "thank_you":
      return {
        subject: `Thank you from ${co}`,
        body: `Hey {firstName},\n\nWe just wanted to reach out and say thank you. Your support means everything to us and we never take it for granted.\n\nIf there's ever anything we can do better, we'd love to hear it. And if you've had a great experience, a quick review goes a long way for a small business like ours.\n\nSee you soon.\n\n— ${co}`,
      }
    case "re_engagement":
      return {
        subject: `It's been a while — we miss you`,
        body: `Hey {firstName},\n\nWe noticed it's been a little while since we've seen you and we wanted to reach out.\n\nIf there's anything that kept you away or something we can do better, just reply — we genuinely want to know.\n\nAnd if you're ready to come back, we'd love to have you. You can book online or just give us a call.\n\n— ${co}`,
      }
    case "announcement":
      return {
        subject: `An update from ${co}`,
        body: `Hey {firstName},\n\nWe have some news to share and wanted you to hear it first.\n\n[Write your announcement here — new hours, new location, new team member, etc.]\n\nThanks for being part of our community. We're excited about what's ahead.\n\n— ${co}`,
      }
    case "birthday":
      return {
        subject: `Happy birthday from ${co} 🎂`,
        body: `Hey {firstName},\n\nWe see your birthday is coming up and we didn't want to let it pass without saying something.\n\nHappy birthday! As a thank you for being a customer, we'd love to [describe your birthday perk — a discount, a free add-on, a special treat].\n\nReach out to redeem it before the end of your birthday month.\n\n— ${co}`,
      }
    case "follow_up":
      return {
        subject: `Following up — ${co}`,
        body: `Hey {firstName},\n\nJust wanted to follow up and see how everything went. We hope you were happy with the work and that everything is going smoothly.\n\nIf you have any questions or there's anything we can help with, don't hesitate to reach out.\n\nAnd if you have a moment, a quick review would mean the world to us.\n\n— ${co}`,
      }
    default:
      return {
        subject: `A message from ${co}`,
        body: `Hey {firstName},\n\n[Write your message here.]\n\n— ${co}`,
      }
  }
}

export default function MarketingComposer({
  companyId,
  companyName,
  companySlug,
  industry,
  subscriberCount,
  templates,
  rootDomain,
}: {
  companyId: string
  companyName: string
  companySlug: string
  industry: string | null
  subscriberCount: number
  templates: Template[]
  rootDomain: string
}) {
  const [step, setStep] = useState<"pick" | "compose" | "confirm" | "sent">("pick")
  const [selected, setSelected] = useState<Template | null>(null)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentCount, setSentCount] = useState(0)

  function pickTemplate(t: Template) {
    const draft = draftEmail(t, companyName, industry)
    setSelected(t)
    setSubject(draft.subject)
    setBody(draft.body)
    setStep("compose")
  }

  async function handleSend() {
    if (!selected || !subject.trim() || !body.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/marketing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, templateSlug: selected.slug, subject, body, companySlug, rootDomain }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Send failed."); return }
      setSentCount(data.sent ?? 0)
      setStep("sent")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSending(false)
    }
  }

  function reset() {
    setStep("pick")
    setSelected(null)
    setSubject("")
    setBody("")
    setError(null)
    setSentCount(0)
  }

  const cardStyle: React.CSSProperties = {
    borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
  }
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    backgroundColor: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, padding: "12px 14px",
    ...TYPE.footnote, color: "white",
    outline: "none", resize: "none" as const,
  }

  if (step === "sent") {
    return (
      <div style={{ ...cardStyle, padding: "28px 20px", textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}35`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p style={{ margin: "0 0 4px", ...TYPE.title, color: "white" }}>{sentCount} sent</p>
        <p style={{ margin: "0 0 20px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Your email is on its way to your subscribers.
        </p>
        <button onClick={reset} style={{ padding: "10px 22px", borderRadius: 999, backgroundColor: `${GREEN}18`, color: GREEN, border: `1px solid ${GREEN}35`, ...TYPE.footnote, fontWeight: 700, cursor: "pointer" }}>
          Send Another
        </button>
      </div>
    )
  }

  if (step === "pick") {
    return (
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        {templates.map((t, i) => (
          <button
            key={t.slug}
            onClick={() => pickTemplate(t)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              padding: "14px 18px", background: "none", border: "none",
              borderBottom: i < templates.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              cursor: "pointer", textAlign: "left" as const,
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", ...TYPE.subhead, fontWeight: 600, color: "white" }}>{t.label}</p>
              <p style={{ margin: 0, ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{t.hint}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,${TEXT_OPACITY.disabled})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ))}
      </div>
    )
  }

  if (step === "compose") {
    return (
      <div style={cardStyle}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={reset} style={{ background: "none", border: "none", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, cursor: "pointer", padding: 0, ...TYPE.footnote }}>
            ← Back
          </button>
          <span style={{ ...TYPE.subhead, fontWeight: 600, color: "white" }}>{selected?.label}</span>
        </div>
        <div style={{ padding: "18px" }}>
          <p style={{ margin: "0 0 6px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Subject</p>
          <input
            style={{ ...inputStyle, marginBottom: 16 }}
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Email subject"
          />
          <p style={{ margin: "0 0 6px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            Message <span style={{ color: `rgba(255,255,255,0.2)` }}>— use {"{firstName}"} to personalize</span>
          </p>
          <textarea
            style={{ ...inputStyle, minHeight: 220 }}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Your message..."
          />
          {error && <p style={{ margin: "8px 0 0", ...TYPE.caption, color: "#F43F5E", fontWeight: 700 }}>{error}</p>}
          <button
            onClick={() => setStep("confirm")}
            disabled={!subject.trim() || !body.trim()}
            style={{
              marginTop: 16, width: "100%", padding: "14px 0", borderRadius: 12,
              backgroundColor: GREEN, color: BLACK,
              ...TYPE.subhead, fontWeight: 900, border: "none",
              cursor: (!subject.trim() || !body.trim()) ? "default" : "pointer",
              opacity: (!subject.trim() || !body.trim()) ? 0.4 : 1,
            }}
          >
            Preview & Send
          </button>
        </div>
      </div>
    )
  }

  // confirm step
  return (
    <div style={cardStyle}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => setStep("compose")} style={{ background: "none", border: "none", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, cursor: "pointer", padding: 0, ...TYPE.footnote }}>
          ← Edit
        </button>
        <span style={{ ...TYPE.subhead, fontWeight: 600, color: "white" }}>Confirm Send</span>
      </div>
      <div style={{ padding: "18px" }}>
        <div style={{ marginBottom: 16, padding: "14px 16px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ margin: "0 0 4px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Subject</p>
          <p style={{ margin: "0 0 12px", ...TYPE.subhead, color: "white" }}>{subject}</p>
          <p style={{ margin: "0 0 4px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Preview</p>
          <p style={{ margin: 0, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
            {body.slice(0, 200)}{body.length > 200 ? "…" : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "12px 16px", borderRadius: 12, backgroundColor: `${GREEN}10`, border: `1px solid ${GREEN}25` }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, flexShrink: 0 }} />
          <p style={{ margin: 0, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
            Sending to <strong style={{ color: "white" }}>{subscriberCount} subscriber{subscriberCount !== 1 ? "s" : ""}</strong>
          </p>
        </div>
        {error && <p style={{ margin: "0 0 12px", ...TYPE.caption, color: "#F43F5E", fontWeight: 700 }}>{error}</p>}
        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 12,
            backgroundColor: GREEN, color: BLACK,
            ...TYPE.subhead, fontWeight: 900, border: "none",
            cursor: sending ? "default" : "pointer",
            opacity: sending ? 0.5 : 1,
          }}
        >
          {sending ? "Sending..." : `Send to ${subscriberCount} subscriber${subscriberCount !== 1 ? "s" : ""} →`}
        </button>
      </div>
    </div>
  )
}
