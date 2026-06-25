"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { GREEN, BLACK, TYPE, TEXT_OPACITY } from "@/lib/dashboard/typography"

type Contact = {
  id: string
  name: string | null
  email: string
  birthday_month: number | null
  birthday_day: number | null
  created_at: string
}

type Campaign = {
  id: string
  subject: string
  sent_at: string | null
  recipient_count: number | null
}

type FilterKey = "all" | "birthday_month" | "new_30" | "reengage"

type Vocab = {
  slowHint: string
  slowBody: string
  followHint: string
  followBody: string
  seasonalBody: string
  reengageBody: string
}

function getVocab(industry: string | null): Vocab {
  switch (industry) {
    case "food":
      return {
        slowHint: "Bring in more tables on a slow night.",
        slowBody: `Hey {firstName},\n\nThings are a little slower this week and we wanted to pass the savings on to you.\n\nIf you've been thinking about dining with us, now's a great time — we have open tables and we'd love to see you.\n\nReply to this email or give us a call to make a reservation.\n\n— `,
        followHint: "Check in after a customer's last visit.",
        followBody: `Hey {firstName},\n\nJust wanted to follow up and see how everything was during your last visit. We hope you enjoyed it!\n\nIf there's anything we can do better, we'd love to hear it. And if you had a great time, a quick review means the world to a small place like ours.\n\nCan't wait to see you again.\n\n— `,
        seasonalBody: `Hey {firstName},\n\nAs the season changes, we have something special on the menu — and we wanted you to know first.\n\n[Describe your seasonal dish or promotion here.]\n\nThis is only available for a limited time. Come in and see us.\n\n— `,
        reengageBody: `Hey {firstName},\n\nIt's been a little while and we miss seeing you. We wanted to reach out and say that your table is always ready for you.\n\nIf there's anything that kept you away or something we can do better, just reply — we genuinely want to know.\n\nWe'd love to have you back soon.\n\n— `,
      }
    case "pet_services":
      return {
        slowHint: "Fill a slow week with a time-limited offer.",
        slowBody: `Hey {firstName},\n\nWe have some openings this week and wanted to reach out to see if [Pet's name] is due for a visit.\n\nIf you've been meaning to come in, now's a great time — we'd love to see you both.\n\nReply to this email or give us a call to book an appointment.\n\n— `,
        followHint: "Check in after a pet's appointment.",
        followBody: `Hey {firstName},\n\nJust wanted to follow up and see how [Pet] is doing after their last appointment. We hope everything went smoothly!\n\nIf you have any questions or there's anything we can help with, don't hesitate to reach out.\n\nAnd if you have a moment, a quick review would mean a lot to us.\n\n— `,
        seasonalBody: `Hey {firstName},\n\nAs the season changes, we have a special offer for your pet — and we wanted you to hear about it first.\n\n[Describe your seasonal offer here.]\n\nThis is only available for a limited time. Book now to take advantage.\n\n— `,
        reengageBody: `Hey {firstName},\n\nIt's been a little while since we've seen you and [Pet], and we wanted to check in.\n\nIf it's time for an appointment or you have any questions about their care, we're always here.\n\nWe'd love to see you both again soon.\n\n— `,
      }
    case "wellness":
    case "beauty":
    case "fitness":
      return {
        slowHint: "Fill a slow week with a time-limited offer.",
        slowBody: `Hey {firstName},\n\nWe have some openings this week and wanted to pass a special offer on to you.\n\nIf you've been thinking about booking an appointment, now's a perfect time — we have availability and we'd love to take care of you.\n\nReply or give us a call to lock something in.\n\n— `,
        followHint: "Check in after a customer's last appointment.",
        followBody: `Hey {firstName},\n\nJust wanted to follow up and see how you're feeling after your last appointment. We hope you're doing great!\n\nIf there's anything we can do for you, don't hesitate to reach out. And if you loved your experience, a quick review goes a long way for us.\n\nSee you soon.\n\n— `,
        seasonalBody: `Hey {firstName},\n\nAs the season changes, we're offering something special — and we wanted you to know first.\n\n[Describe your seasonal offer here.]\n\nAvailable for a limited time. Reply or book directly to take advantage.\n\n— `,
        reengageBody: `Hey {firstName},\n\nWe noticed it's been a little while and we wanted to reach out.\n\nIf there's anything that kept you away or something we can do better, just reply — we'd genuinely love to hear it.\n\nWhenever you're ready, we're here for you.\n\n— `,
      }
    default:
      return {
        slowHint: "Fill a slow week with a time-limited offer.",
        slowBody: `Hey {firstName},\n\nThings are a little slower this week and we wanted to pass the savings on to you.\n\nIf you've been thinking about working with us, now's a great time — we have availability and we'd love to help.\n\nReply to this email or give us a call.\n\n— `,
        followHint: "Check in after a job or visit.",
        followBody: `Hey {firstName},\n\nJust wanted to follow up and see how everything went. We hope you were happy with the work!\n\nIf you have any questions or there's anything we can help with, don't hesitate to reach out. And a quick review would mean the world to us.\n\n— `,
        seasonalBody: `Hey {firstName},\n\nAs the season changes, we wanted to check in and share a little something special.\n\n[Describe your seasonal offer here.]\n\nThis offer is only available for a limited time. Reply or reach out to take advantage.\n\n— `,
        reengageBody: `Hey {firstName},\n\nIt's been a little while since we've connected and we wanted to reach out.\n\nIf there's ever anything we can help with or if you have questions, just reply — we're here.\n\nHope to hear from you soon.\n\n— `,
      }
  }
}

type TemplateSlug =
  | "slow_week" | "new_service" | "seasonal" | "holiday"
  | "thank_you" | "re_engagement" | "announcement" | "birthday" | "follow_up"

type Template = { slug: TemplateSlug; label: string; hint: string; color: string }

function getTemplates(industry: string | null, vocab: Vocab): Template[] {
  return [
    { slug: "slow_week",     label: "Slow Week Special",  hint: vocab.slowHint,   color: "#F59E0B" },
    { slug: "new_service",   label: "New Service",        hint: "Announce something new you're now offering.", color: "#3B82F6" },
    { slug: "seasonal",      label: "Seasonal Promotion", hint: "Tie an offer to the current season or holiday.", color: "#10B981" },
    { slug: "holiday",       label: "Holiday Greeting",   hint: "A warm note to your list — no sales pitch needed.", color: "#F97316" },
    { slug: "thank_you",     label: "Thank You",          hint: "Show appreciation to your customers.", color: "#EC4899" },
    { slug: "re_engagement", label: "Re-engagement",      hint: "Reach out to customers you haven't heard from in a while.", color: "#8B5CF6" },
    { slug: "announcement",  label: "Announcement",       hint: "Share news — new hours, new location, new team member.", color: "#6B7280" },
    { slug: "birthday",      label: "Birthday",           hint: "Send to contacts whose birthday is this month.", color: "#F43F5E" },
    { slug: "follow_up",     label: "Follow-Up",          hint: vocab.followHint, color: "#14B8A6" },
  ]
}

function draftEmail(slug: TemplateSlug, companyName: string, vocab: Vocab): { subject: string; body: string } {
  const co = companyName
  switch (slug) {
    case "slow_week":
      return { subject: `A little something from ${co} this week`, body: vocab.slowBody + co }
    case "new_service":
      return {
        subject: `Something new at ${co}`,
        body: `Hey {firstName},\n\nWe just added something new and wanted you to be the first to know.\n\n[Describe your new service here — what it is, what it costs, and why you love it.]\n\nReach out if you have questions — we're excited to share this with you.\n\n— ${co}`,
      }
    case "seasonal":
      return { subject: `Our seasonal offer — just for you`, body: vocab.seasonalBody + co }
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
      return { subject: `It's been a while — we miss you`, body: vocab.reengageBody + co }
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
      return { subject: `Following up — ${co}`, body: vocab.followBody + co }
    default:
      return { subject: `A message from ${co}`, body: `Hey {firstName},\n\n[Write your message here.]\n\n— ${co}` }
  }
}

// ─── Slide-up sheet ───────────────────────────────────────────────
function Sheet({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || !open) return null

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9998, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxHeight: "82vh", overflowY: "auto",
          backgroundColor: "#1C1C1E", borderRadius: "20px 20px 0 0",
          paddingBottom: "env(safe-area-inset-bottom, 20px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)" }} />
        </div>
        <div style={{ padding: "8px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ ...TYPE.title, fontWeight: 700, color: "white" }}>{title}</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

// ─── Template icons ──────────────────────────────────────────────
function TemplateIcon({ slug, color }: { slug: string; color: string }) {
  const s = { stroke: color, fill: "none", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (slug) {
    case "slow_week":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    case "new_service":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
    case "seasonal":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    case "holiday":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s}><path d="M20 12v10H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
    case "thank_you":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    case "re_engagement":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
    case "announcement":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s}><path d="M18 8a2 2 0 0 1 0 4"/><path d="M10 8v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-5"/><path d="M12 8H4l-2 4 2 4h8l6-4-6-4z"/></svg>
    case "birthday":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s}><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><line x1="2" y1="21" x2="22" y2="21"/><path d="M7 8v1"/><path d="M12 8v1"/><path d="M17 8v1"/><path d="M7 4a1 1 0 0 1 1-1 1 1 0 0 1 1 1c0 2-2 3-2 3s-2-1-2-3a1 1 0 0 1 1-1 1 1 0 0 1 1 1"/><path d="M12 4a1 1 0 0 1 1-1 1 1 0 0 1 1 1c0 2-2 3-2 3s-2-1-2-3a1 1 0 0 1 1-1 1 1 0 0 1 1 1"/><path d="M17 4a1 1 0 0 1 1-1 1 1 0 0 1 1 1c0 2-2 3-2 3s-2-1-2-3a1 1 0 0 1 1-1 1 1 0 0 1 1 1"/></svg>
    case "follow_up":
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    default:
      return <svg width="16" height="16" viewBox="0 0 24 24" {...s}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  }
}

// ─── QR download / share ─────────────────────────────────────────
async function downloadQR(subscribeUrl: string, companySlug: string) {
  const res = await fetch(`/api/qr?data=${encodeURIComponent(subscribeUrl)}`)
  const blob = await res.blob()
  const file = new File([blob], `${companySlug}-subscribe-qr.png`, { type: "image/png" })
  // On iOS this opens the share sheet — user can tap "Save to Photos"
  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: "Subscribe QR Code" })
  } else {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = file.name
    a.click()
    URL.revokeObjectURL(a.href)
  }
}

// ─── Main component ───────────────────────────────────────────────
export default function MarketingClient({
  companyId,
  companyName,
  companySlug,
  industry,
  contacts,
  campaigns,
  rootDomain,
}: {
  companyId: string
  companyName: string
  companySlug: string
  industry: string | null
  contacts: Contact[]
  campaigns: Campaign[]
  rootDomain: string
}) {
  const [step, setStep] = useState<"home" | "compose" | "confirm" | "sent">("home")
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAudience, setShowAudience] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState<TemplateSlug | null>(null)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [filter, setFilter] = useState<FilterKey>("all")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentCount, setSentCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const vocab = getVocab(industry)
  const templates = getTemplates(industry, vocab)
  const subscribeUrl = `https://${companySlug}.${rootDomain}/subscribe`

  // ── Audience segments ──────────────────────────────────────────
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const d30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const d90ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const segments: Record<FilterKey, { label: string; count: number; description: string }> = {
    all:            { label: "Everyone",            count: contacts.length,                                                     description: "All subscribed contacts" },
    birthday_month: { label: "Birthday this month", count: contacts.filter(c => c.birthday_month === currentMonth).length,      description: `Birthday in ${now.toLocaleString("en-US", { month: "long" })}` },
    new_30:         { label: "New subscribers",     count: contacts.filter(c => new Date(c.created_at) >= d30ago).length,       description: "Joined in the last 30 days" },
    reengage:       { label: "Re-engage",           count: contacts.filter(c => new Date(c.created_at) < d90ago).length,        description: "Subscribed 90+ days ago" },
  }

  const recipientCount = segments[filter].count

  // ── Actions ────────────────────────────────────────────────────
  function pickTemplate(t: Template) {
    const draft = draftEmail(t.slug, companyName, vocab)
    setSelectedSlug(t.slug)
    setSubject(draft.subject)
    setBody(draft.body)
    setFilter("all")
    setShowTemplates(false)
    setStep("compose")
  }

  async function handleSend() {
    if (!selectedSlug || !subject.trim() || !body.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch("/api/marketing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, templateSlug: selectedSlug, subject, body, companySlug, rootDomain, filter }),
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
    setStep("home")
    setSelectedSlug(null)
    setSubject("")
    setBody("")
    setFilter("all")
    setError(null)
    setSentCount(0)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(subscribeUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDownloadQR() {
    setDownloading(true)
    try { await downloadQR(subscribeUrl, companySlug) } finally { setDownloading(false) }
  }

  const selectedTemplate = templates.find(t => t.slug === selectedSlug)

  // ── Shared styles ──────────────────────────────────────────────
  const card: React.CSSProperties = {
    borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.07)",
  }
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    backgroundColor: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12, padding: "13px 14px",
    ...TYPE.footnote, color: "white", outline: "none", resize: "none" as const,
  }
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(subscribeUrl)}&margin=16`

  // ═══════════════════════════════════════════════════════════════
  // SENT VIEW
  // ═══════════════════════════════════════════════════════════════
  if (step === "sent") {
    return (
      <main style={{ padding: "40px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}35`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p style={{ margin: "0 0 6px", ...TYPE.largeTitle, color: "white" }}>{sentCount} sent</p>
        <p style={{ margin: "0 0 28px", ...TYPE.body, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Your email is on its way.
        </p>
        <button onClick={reset} style={{ padding: "12px 28px", borderRadius: 999, backgroundColor: `${GREEN}18`, color: GREEN, border: `1px solid ${GREEN}35`, ...TYPE.subhead, fontWeight: 700, cursor: "pointer" }}>
          Write Another
        </button>
      </main>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // CONFIRM VIEW
  // ═══════════════════════════════════════════════════════════════
  if (step === "confirm") {
    // Personalize preview with "there" as placeholder first name
    const previewBody = body
      .replace(/\{firstName\}/gi, "there")
      .replace(/\{first_name\}/gi, "there")

    return (
      <main style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setStep("compose")} style={{ background: "none", border: "none", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, cursor: "pointer", padding: 0, ...TYPE.footnote, display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Edit
          </button>
          <span style={{ ...TYPE.subhead, fontWeight: 700, color: "white" }}>Review & Send</span>
        </div>

        {/* To: at top */}
        <button
          onClick={() => setShowAudience(true)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", marginBottom: 14, borderRadius: 12, backgroundColor: `${GREEN}0D`, border: `1px solid ${GREEN}25`, cursor: "pointer" }}
        >
          <span style={{ ...TYPE.caption, fontWeight: 700, color: `${GREEN}CC`, flexShrink: 0, letterSpacing: "0.08em" }}>TO</span>
          <span style={{ flex: 1, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, textAlign: "left" as const }}>
            <strong style={{ color: "white" }}>{recipientCount} {recipientCount === 1 ? "person" : "people"}</strong>
            <span style={{ color: `rgba(255,255,255,0.35)` }}> · {segments[filter].label}</span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`${GREEN}80`} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Email preview — white card so it looks like a real inbox */}
        <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
          {/* Email header bar */}
          <div style={{ backgroundColor: "#f2f2f7", padding: "12px 16px", borderBottom: "1px solid #e5e5ea" }}>
            <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#8e8e93" }}>{companyName}</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#1c1c1e", lineHeight: 1.3 }}>{subject}</p>
          </div>
          {/* Email body */}
          <div style={{ backgroundColor: "#ffffff", padding: "18px 16px" }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: "#333333", whiteSpace: "pre-wrap" as const }}>
              {previewBody.length > 320 ? previewBody.slice(0, 320) + "…" : previewBody}
            </p>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #eeeeee" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#aaaaaa" }}>
                You're receiving this because you subscribed to {companyName}. &nbsp;·&nbsp;
                <span style={{ color: "#aaaaaa", textDecoration: "underline" }}>Unsubscribe</span>
              </p>
            </div>
          </div>
        </div>

        {error && <p style={{ margin: "0 0 12px", ...TYPE.caption, color: "#F43F5E", fontWeight: 700 }}>{error}</p>}

        <button
          onClick={handleSend}
          disabled={sending || recipientCount === 0}
          style={{ width: "100%", padding: "16px 0", borderRadius: 14, backgroundColor: GREEN, color: BLACK, ...TYPE.subhead, fontWeight: 900, border: "none", cursor: (sending || recipientCount === 0) ? "default" : "pointer", opacity: (sending || recipientCount === 0) ? 0.5 : 1 }}
        >
          {sending ? "Sending…" : recipientCount === 0 ? "No recipients in this segment" : `Send to ${recipientCount} ${recipientCount === 1 ? "person" : "people"} →`}
        </button>

        {/* Audience filter sheet */}
        <Sheet open={showAudience} onClose={() => setShowAudience(false)} title="Who are you sending to?">
          <div style={{ padding: "0 20px 24px" }}>
            {(Object.entries(segments) as [FilterKey, { label: string; count: number; description: string }][]).map(([key, seg]) => (
              <button
                key={key}
                onClick={() => { setFilter(key); setShowAudience(false) }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 0", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", textAlign: "left" as const }}
              >
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${filter === key ? GREEN : "rgba(255,255,255,0.2)"}`, backgroundColor: filter === key ? GREEN : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {filter === key && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 2px", ...TYPE.subhead, fontWeight: 600, color: "white" }}>{seg.label}</p>
                  <p style={{ margin: 0, ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{seg.description}</p>
                </div>
                <span style={{ ...TYPE.title, fontWeight: 700, color: seg.count > 0 ? "white" : `rgba(255,255,255,0.25)` }}>{seg.count}</span>
              </button>
            ))}
          </div>
        </Sheet>
      </main>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPOSE VIEW
  // ═══════════════════════════════════════════════════════════════
  if (step === "compose") {
    return (
      <main style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={reset} style={{ background: "none", border: "none", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, cursor: "pointer", padding: 0, ...TYPE.footnote, display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          {selectedTemplate && (
            <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
              {selectedTemplate.label}
            </span>
          )}
        </div>

        {/* To: row — at top like a real email */}
        <button
          onClick={() => setShowAudience(true)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", marginBottom: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}
        >
          <span style={{ ...TYPE.caption, fontWeight: 700, color: `rgba(255,255,255,0.35)`, flexShrink: 0, letterSpacing: "0.08em" }}>TO</span>
          <span style={{ flex: 1, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, textAlign: "left" as const }}>
            <strong style={{ color: "white" }}>{recipientCount} {recipientCount === 1 ? "person" : "people"}</strong>
            <span style={{ color: `rgba(255,255,255,0.35)` }}> · {segments[filter].label}</span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,0.25)`} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <p style={{ margin: "0 0 6px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Subject</p>
        <input
          style={{ ...inputStyle, marginBottom: 16 }}
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Email subject"
        />

        <p style={{ margin: "0 0 6px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Message &nbsp;
          <span style={{ color: `rgba(255,255,255,0.22)` }}>— use {"{firstName}"} to personalize</span>
        </p>
        <textarea
          style={{ ...inputStyle, minHeight: 240 }}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Your message…"
        />

        <button
          onClick={() => setStep("confirm")}
          disabled={!subject.trim() || !body.trim()}
          style={{ marginTop: 16, width: "100%", padding: "15px 0", borderRadius: 14, backgroundColor: GREEN, color: BLACK, ...TYPE.subhead, fontWeight: 900, border: "none", cursor: (!subject.trim() || !body.trim()) ? "default" : "pointer", opacity: (!subject.trim() || !body.trim()) ? 0.4 : 1 }}
        >
          Preview & Send
        </button>

        {/* Audience filter sheet */}
        <Sheet open={showAudience} onClose={() => setShowAudience(false)} title="Who are you sending to?">
          <div style={{ padding: "0 20px 24px" }}>
            {(Object.entries(segments) as [FilterKey, { label: string; count: number; description: string }][]).map(([key, seg]) => (
              <button
                key={key}
                onClick={() => { setFilter(key); setShowAudience(false) }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 0", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", textAlign: "left" as const }}
              >
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${filter === key ? GREEN : "rgba(255,255,255,0.2)"}`, backgroundColor: filter === key ? GREEN : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {filter === key && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 2px", ...TYPE.subhead, fontWeight: 600, color: "white" }}>{seg.label}</p>
                  <p style={{ margin: 0, ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{seg.description}</p>
                </div>
                <span style={{ ...TYPE.title, fontWeight: 700, color: seg.count > 0 ? "white" : `rgba(255,255,255,0.25)` }}>{seg.count}</span>
              </button>
            ))}
          </div>
        </Sheet>
      </main>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // HOME VIEW
  // ═══════════════════════════════════════════════════════════════
  return (
    <main style={{ padding: "24px 20px 40px" }}>

      {/* Tiny stats row */}
      <p style={{ margin: "0 0 20px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
        <span style={{ color: "white", fontWeight: 700 }}>{contacts.length}</span> subscribers
        &nbsp;·&nbsp;
        <span style={{ color: "white", fontWeight: 700 }}>{campaigns.length}</span> campaigns sent
      </p>

      {/* Hero action card */}
      <div style={{ ...card, padding: "24px 22px", marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <p style={{ margin: "0 0 4px", ...TYPE.title, fontWeight: 800, color: "white" }}>Email your customers</p>
        <p style={{ margin: "0 0 20px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Choose a template and send to your list in under a minute.
        </p>
        <button
          onClick={() => setShowTemplates(true)}
          style={{ width: "100%", padding: "15px 0", borderRadius: 14, backgroundColor: GREEN, color: BLACK, ...TYPE.subhead, fontWeight: 900, border: "none", cursor: "pointer" }}
        >
          Write an Email →
        </button>
      </div>

      {/* Grow your list — QR card */}
      <div style={{ ...card, padding: "22px 22px 20px", marginBottom: 16 }}>
        <p style={{ margin: "0 0 16px", ...TYPE.footnote, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Grow Your List
        </p>

        {/* QR code */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={{ backgroundColor: "white", borderRadius: 14, padding: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="Subscribe QR code"
              width={160}
              height={160}
              style={{ display: "block" }}
            />
          </div>
        </div>

        <p style={{ margin: "0 0 16px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, textAlign: "center" as const }}>
          Customers scan this to join your list
        </p>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleDownloadQR}
            disabled={downloading}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", ...TYPE.footnote, fontWeight: 700, cursor: "pointer", opacity: downloading ? 0.5 : 1 }}
          >
            {downloading ? "Downloading…" : "Download QR"}
          </button>
          <button
            onClick={handleCopy}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, backgroundColor: copied ? `${GREEN}18` : "rgba(255,255,255,0.07)", border: `1px solid ${copied ? `${GREEN}35` : "rgba(255,255,255,0.1)"}`, color: copied ? GREEN : "white", ...TYPE.footnote, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>

        <p style={{ margin: "12px 0 0", ...TYPE.caption, color: `rgba(255,255,255,0.18)`, textAlign: "center" as const, wordBreak: "break-all" as const }}>
          {subscribeUrl}
        </p>
      </div>

      {/* Past campaigns */}
      {campaigns.length > 0 && (
        <div>
          <p style={{ margin: "0 0 8px", ...TYPE.caption, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
            Sent
          </p>
          <div style={{ ...card, overflow: "hidden" }}>
            {campaigns.slice(0, 5).map((c, i) => (
              <div key={c.id} style={{ padding: "13px 16px", borderBottom: i < Math.min(campaigns.length, 5) - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 2px", ...TYPE.footnote, fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    {c.subject}
                  </p>
                  <p style={{ margin: 0, ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
                    {c.sent_at ? new Date(c.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                    {c.recipient_count ? ` · ${c.recipient_count} sent` : ""}
                  </p>
                </div>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, marginTop: 7, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template picker sheet */}
      <Sheet open={showTemplates} onClose={() => setShowTemplates(false)} title="Pick a template">
        <div style={{ padding: "0 20px 24px" }}>
          {templates.map((t, i) => (
            <button
              key={t.slug}
              onClick={() => pickTemplate(t)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 0", background: "none", border: "none", borderBottom: i < templates.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", cursor: "pointer", textAlign: "left" as const }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: `${t.color}18`, border: `1px solid ${t.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TemplateIcon slug={t.slug} color={t.color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 2px", ...TYPE.subhead, fontWeight: 600, color: "white" }}>{t.label}</p>
                <p style={{ margin: 0, ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{t.hint}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,0.2)`} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>
      </Sheet>
    </main>
  )
}
