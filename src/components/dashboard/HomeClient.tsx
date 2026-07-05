"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { TYPE, TEXT_OPACITY, GREEN, BLACK, avatarColorFor } from "@/lib/dashboard/typography"

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 2)   return "just now"
  if (m < 60)  return `${m}m ago`
  if (h < 24)  return `${h}h ago`
  if (d === 1) return "yesterday"
  return `${d}d ago`
}

const AMBIENT: Record<string, string> = {
  morning:   "radial-gradient(ellipse 700px 500px at 10% -10%, rgba(255,184,107,0.09), transparent 60%)",
  afternoon: "radial-gradient(ellipse 700px 500px at 10% -10%, rgba(50,208,116,0.10), transparent 60%)",
  evening:   "radial-gradient(ellipse 700px 500px at 10% -10%, rgba(120,130,255,0.09), transparent 60%)",
}

type RecentLead = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  created_at: string | null
  source: string | null
}

type Props = {
  businessName: string
  greeting: string
  newCount: number
  totalCount: number
  topName: string | null
  topCreatedAt: string | null
  siteSlug: string
  isActive: boolean
  recentLeads: RecentLead[]
  lastPhotoAt: string | null
  industry: string | null
  businessTool: { name: string; path: string } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sourceLabel(source: string | null | undefined): string | null {
  if (!source) return null
  const map: Record<string, string> = {
    website:         "Website form",
    website_form:    "Website form",
    found_form:      "Website form",
    google:          "Google",
    google_maps:     "Google Maps",
    referral:        "Referral",
    instagram:       "Instagram",
    facebook:        "Facebook",
    yelp:            "Yelp",
    walk_in:         "Walk-in",
    phone:           "Phone call",
    direct:          "Direct",
    manual:          "Added manually",
    online_ordering: "Online order",
    shopping_cart:   "Shop order",
    reservation:     "Reservation form",
    reservations:    "Reservation form",
  }
  return map[source.toLowerCase()] ?? source
}

// ── Leads sheet ──────────────────────────────────────────────────────────────

function LeadsSheet({ leads, newCount, industry, onClose }: { leads: RecentLead[]; newCount: number; industry: string | null; onClose: () => void }) {
  const newLeads = leads.filter(l => l.created_at && Date.now() - new Date(l.created_at).getTime() < 7 * 86400000)
  const guestWordPl = industry === "food" ? "guests" : "leads"

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 80, backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", animation: "hFade 0.18s ease" }}
      />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90,
        backgroundColor: "#0D100E",
        borderRadius: "24px 24px 0 0",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        maxHeight: "80dvh",
        display: "flex", flexDirection: "column",
        animation: "hUp 0.22s cubic-bezier(0.32,0.72,0,1)",
      }}>
        {/* Handle + header */}
        <div style={{ padding: "16px 20px 14px", flexShrink: 0 }}>
          <div style={{ width: 32, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", margin: "0 auto 20px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 8px ${GREEN}`, animation: "breathe 2s ease-in-out infinite" }} />
              <span style={{ ...TYPE.headline, color: "white" }}>
                {newCount} new {newCount === 1 ? guestWordPl.replace(/s$/, "") : guestWordPl} this week
              </span>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", flexShrink: 0 }} />

        {/* Lead list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {newLeads.map((lead, i) => {
            const rawPhone  = lead.phone?.replace(/\D/g, "")
            const phoneHref = rawPhone ? `tel:${rawPhone}` : null
            const textHref  = rawPhone ? `sms:${rawPhone}` : null
            const color     = avatarColorFor(lead.name ?? "?")
            return (
              <div key={lead.id} style={{ padding: "14px 20px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 13, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, backgroundColor: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 700, color }}>
                    {(lead.name ?? "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                      <span style={{ ...TYPE.subhead, fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lead.name ?? "Unknown"}
                      </span>
                      <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, flexShrink: 0 }}>
                        {lead.created_at ? timeAgo(lead.created_at) : ""}
                      </span>
                    </div>
                    {sourceLabel(lead.source) && (
                      <p style={{ margin: "2px 0 0", ...TYPE.footnote, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        via {sourceLabel(lead.source)}
                      </p>
                    )}
                    {lead.message && (
                      <p style={{ margin: "4px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,0.5)`, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                        {lead.message}
                      </p>
                    )}
                  </div>
                </div>
                {(phoneHref || textHref) && (
                  <div style={{ display: "flex", gap: 8, paddingLeft: 53 }}>
                    {phoneHref && (
                      <a href={phoneHref} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 100, backgroundColor: GREEN, textDecoration: "none" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                        </svg>
                        <span style={{ fontSize: "0.8125rem", fontWeight: 800, color: BLACK }}>Call</span>
                      </a>
                    )}
                    {textHref && (
                      <a href={textHref} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 100, backgroundColor: "rgba(50,208,116,0.1)", border: "1px solid rgba(50,208,116,0.22)", textDecoration: "none" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                        <span style={{ fontSize: "0.8125rem", fontWeight: 800, color: GREEN }}>Text</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
          <Link href={industry === "food" ? "/people" : "/leads"} onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "14px 0", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}>
            <span style={{ ...TYPE.subhead, fontWeight: 700, color: "white" }}>View all {guestWordPl}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        </div>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HomeClient({
  businessName, greeting, newCount, totalCount,
  topName, topCreatedAt,
  siteSlug, isActive, recentLeads, lastPhotoAt, industry, businessTool,
}: Props) {
  const [showSheet, setShowSheet]   = useState(false)
  const [copied,    setCopied]      = useState(false)
  const [mounted,   setMounted]     = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  function openCamera() {
    window.dispatchEvent(new CustomEvent("found:open-camera"))
  }

  async function handleShare() {
    const url = `https://${siteSlug}.foundco.app`
    if (navigator.share) {
      await navigator.share({ title: "My site on Found", url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const hasNewLead    = newCount > 0 && topName
  const isWelcome     = isActive && totalCount === 0
  const photoThisWeek = lastPhotoAt && Date.now() - new Date(lastPhotoAt).getTime() < 7 * 86400000

  // Industry-aware guest word for the alert card
  const guestWord   = industry === "food" ? "guest"  : "lead"
  const guestWordPl = industry === "food" ? "guests" : "leads"

  // Context-aware second tile priority: Share → Add Photo → Edit My Site
  const tile2 = (!isActive || totalCount === 0)
    ? "share"
    : !photoThisWeek
      ? "photo"
      : "edit"

  const fade = (delay: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  })

  return (
    <main style={{
      display: "flex",
      flexDirection: "column",
      backgroundColor: BLACK,
      backgroundImage: AMBIENT[greeting] ?? AMBIENT.afternoon,
      // Fills the screen when content is short (the common case), but flows
      // and scrolls instead of clipping when a card pushes past one viewport.
      // Keep this as normal page flow. The dashboard wrapper and the trailing
      // spacer below provide clearance for the fixed tab bar and mobile browser
      // chrome; negative margins can make Safari trap the last row under the nav.
      minHeight: "calc(100dvh - 50px)",
    }}>

      {/* ── GREETING ── */}
      <div style={{ padding: "28px 24px 0", ...fade(0) }}>
        <h1 style={{ margin: 0, color: "white", ...TYPE.largeTitle }}>
          Good {greeting},<br />{businessName}.
        </h1>
      </div>

      {/* ── ALERT CARD — new leads ── */}
      {hasNewLead && (
        <div style={{ padding: "20px 20px 0", ...fade(0.06) }}>
          <button
            onClick={() => setShowSheet(true)}
            style={{
              width: "100%", textAlign: "left",
              background: "linear-gradient(160deg, rgba(50,208,116,0.14), rgba(50,208,116,0.04))",
              border: "1px solid rgba(50,208,116,0.28)",
              borderRadius: 24, padding: "20px 22px",
              cursor: "pointer",
              display: "flex", flexDirection: "column", gap: 6,
            }}
          >
            {/* Status line */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 10px ${GREEN}`, animation: "breathe 2s ease-in-out infinite", flexShrink: 0 }} />
                <span style={{ color: GREEN, ...TYPE.caption, fontWeight: 700 }}>
                  {newCount === 1 ? `1 new ${guestWord} this week` : `${newCount} new ${guestWordPl} this week`}
                </span>
              </div>
              <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
                {topCreatedAt ? timeAgo(topCreatedAt) : ""}
              </span>
            </div>

            {/* Name */}
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "white", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {topName}
            </div>

            {/* Tap prompt */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,0.45)` }}>
                {newCount > 1 ? `+${newCount - 1} more` : "Tap to respond"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: GREEN }}>See {guestWordPl}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* ── ALL CAUGHT UP ── */}
      {!hasNewLead && !isWelcome && totalCount > 0 && (
        <div style={{ padding: "20px 24px 0", ...fade(0.06) }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 100, backgroundColor: "rgba(50,208,116,0.08)", border: "1px solid rgba(50,208,116,0.15)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, animation: "breathe 2.4s ease-in-out infinite" }}/>
            <span style={{ ...TYPE.caption, color: GREEN, fontSize: "0.6875rem" }}>All caught up</span>
          </div>
          <div style={{ marginTop: 20, fontSize: "4rem", fontWeight: 300, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>
            {totalCount}
          </div>
          <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, marginTop: 4 }}>
            total {totalCount === 1 ? "lead" : "leads"}
          </div>
        </div>
      )}

      {/* ── WELCOME — no leads yet ──
          Quiet status only. The actual Share action lives in the quick-action
          tile below (tile2 === "share") — a big duplicate hero card here just
          repeats that tile and eats the vertical space it needs to breathe. */}
      {isWelcome && (
        <div style={{ padding: "20px 24px 0", ...fade(0.06) }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 100, backgroundColor: "rgba(50,208,116,0.08)", border: "1px solid rgba(50,208,116,0.15)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, animation: "breathe 2s ease-in-out infinite" }}/>
            <span style={{ ...TYPE.caption, color: GREEN, fontSize: "0.6875rem" }}>You&apos;re live</span>
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS — Camera + context tile ──
          Buttons sit right after status, close to the top. Only something
          urgent (the new-lead alert above) is allowed to outrank them. */}
      <div style={{ padding: "20px 20px 0", ...fade(0.12) }}>
        <div style={{ display: "flex", gap: 10 }}>

          {/* Camera — always */}
          <button
            onClick={openCamera}
            style={{
              flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
              padding: "20px 18px 18px", borderRadius: 24, minHeight: 118,
              background: GREEN, border: "none",
              cursor: "pointer", textAlign: "left",
              boxShadow: `0 4px 24px ${GREEN}55`,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 800, color: BLACK, marginBottom: 3 }}>Camera</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "rgba(0,0,0,0.5)", lineHeight: 1.4 }}>Shoot &amp; sort later</div>
            </div>
          </button>

          {/* Context tile */}
          {tile2 === "share" && (
            <button
              onClick={handleShare}
              style={{
                flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
                padding: "20px 18px 18px", borderRadius: 24, minHeight: 118,
                background: "linear-gradient(150deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer", textAlign: "left",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "white", marginBottom: 3 }}>
                  {copied ? "Link Copied ✓" : "Share My Site"}
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 400, color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>Get more leads</div>
              </div>
            </button>
          )}

          {tile2 === "photo" && (
            <Link
              href="/photos"
              style={{
                flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
                padding: "20px 18px 18px", borderRadius: 24, minHeight: 118,
                background: "linear-gradient(150deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                textDecoration: "none",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "white", marginBottom: 3 }}>My Photos</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 400, color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>Gallery &amp; uploads</div>
              </div>
            </Link>
          )}

          {tile2 === "edit" && (
            <Link
              href="/site"
              style={{
                flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
                padding: "20px 18px 18px", borderRadius: 24, minHeight: 118,
                background: "linear-gradient(150deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)",
                border: "1px solid rgba(255,255,255,0.1)",
                textDecoration: "none",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "white", marginBottom: 3 }}>Edit My Site</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 400, color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>Copy, photos, services</div>
              </div>
            </Link>
          )}

        </div>
      </div>

      {/* ── ROW 2 — My Contacts + Edit My Site ── */}
      <div style={{ padding: "12px 20px 0", ...fade(0.18) }}>
        <div style={{ display: "flex", gap: 10 }}>

          {/* My Contacts */}
          <Link
            href="/contacts"
            style={{
              flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
              padding: "20px 18px 18px", borderRadius: 24, minHeight: 118,
              background: "linear-gradient(150deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.09)",
              textDecoration: "none",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "white", marginBottom: 3 }}>My Contacts</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 400, color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>Vendors, staff &amp; suppliers</div>
            </div>
          </Link>

          {/* Edit My Site */}
          <Link
            href="/site"
            style={{
              flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
              padding: "20px 18px 18px", borderRadius: 24, minHeight: 118,
              background: "linear-gradient(150deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.09)",
              textDecoration: "none",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "white", marginBottom: 3 }}>Edit My Site</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 400, color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>Copy, photos, services</div>
            </div>
          </Link>

        </div>
      </div>

      {/* ── RESPONSIVE SPACER — distributes empty space between buttons and the nudge below ── */}
      <div style={{ flex: 1, minHeight: 16, maxHeight: "clamp(16px, 8dvh, 72px)" }} />

      {/* Business tools nudge — demoted below the buttons. Informational, not
          actionable, so it's the thing allowed to require a scroll, not the tools. */}
      {businessTool && !hasNewLead && (
        <div style={{ padding: "0 20px 0", ...fade(0.1) }}>
          <Link href="/more#business-tools" style={{ textDecoration: "none", display: "block" }}>
            <div style={{ borderRadius: 20, padding: "16px 18px", background: "linear-gradient(160deg, rgba(50,208,116,0.11), rgba(50,208,116,0.035))", border: "1px solid rgba(50,208,116,0.18)" }}>
              <p style={{ margin: "0 0 5px", ...TYPE.caption, color: GREEN }}>Business tools ready</p>
              <p style={{ margin: 0, ...TYPE.footnote, lineHeight: 1.45, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                We turned on {businessTool.name} for you. View all included tools.
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Trailing safe-area clearance above the bottom tab bar — always present,
          regardless of whether the business tools nudge renders above it. */}
      <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 132px)", flexShrink: 0 }} />

      {/* ── Leads sheet ── */}
      {showSheet && (
        <LeadsSheet
          leads={recentLeads}
          newCount={newCount}
          industry={industry}
          onClose={() => setShowSheet(false)}
        />
      )}

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.1); opacity: 0.65; }
        }
        @keyframes hUp   { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes hFade { from { opacity: 0; }                 to { opacity: 1; }               }
      `}</style>
    </main>
  )
}

