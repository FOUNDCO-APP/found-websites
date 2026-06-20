"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { TYPE, TEXT_OPACITY, GREEN, BLACK, avatarColorFor } from "@/lib/dashboard/typography"

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 2)  return "just now"
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
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
  created_at: string | null
  source: string | null
}

type Props = {
  firstName: string
  greeting: string
  newCount: number
  totalCount: number
  topName: string | null
  topEmail: string | null
  topPhone: string | null
  topMessage: string | null
  topCreatedAt: string | null
  siteSlug: string
  isActive: boolean
  recentLeads: RecentLead[]
}

export default function HomeClient({
  firstName, greeting, newCount, totalCount,
  topName, topEmail, topPhone, topMessage, topCreatedAt,
  siteSlug, isActive, recentLeads,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

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

  const rawPhone  = topPhone?.replace(/\D/g, "")
  const phoneHref = rawPhone ? `tel:${rawPhone}` : null
  const textHref  = rawPhone ? `sms:${rawPhone}` : null
  const emailHref = topEmail
    ? `mailto:${topEmail}?subject=Re%3A%20Your%20inquiry&body=Hi%20${encodeURIComponent(topName ?? "there")}%2C%0A%0A`
    : null

  const hasNewLead = newCount > 0 && topName
  const isWelcome  = isActive && totalCount === 0

  // In "caught up" state show all recent leads; exclude top lead if it's shown in hero
  const recentForStrip = hasNewLead ? recentLeads.slice(1) : recentLeads

  const fade = (delay: number) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  })

  return (
    <main style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: BLACK,
      backgroundImage: AMBIENT[greeting] ?? AMBIENT.afternoon,
    }}>

      {/* ── GREETING ── */}
      <div style={{ padding: "28px 24px 0", ...fade(0) }}>
        <h1 style={{ margin: 0, color: "white", ...TYPE.largeTitle }}>
          Good {greeting},<br />{firstName}.
        </h1>
      </div>

      {/* ── STATE 1: NEW LEAD ── */}
      {hasNewLead && (
        <div style={{ padding: "20px 20px 0", ...fade(0.06) }}>
          <div style={{
            borderRadius: 28,
            padding: "26px 24px",
            background: "linear-gradient(160deg, rgba(50,208,116,0.16), rgba(50,208,116,0.04))",
            border: "1px solid rgba(50,208,116,0.25)",
          }}>
            {/* Status line */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                backgroundColor: GREEN, boxShadow: `0 0 10px ${GREEN}`,
                animation: "breathe 2s ease-in-out infinite",
              }}/>
              <span style={{ color: GREEN, ...TYPE.caption }}>
                {newCount === 1 ? "New lead" : `${newCount} new leads`}
                {topCreatedAt && ` · ${timeAgo(topCreatedAt)}`}
              </span>
            </div>

            {/* Name */}
            <h2 style={{
              margin: "0 0 10px",
              fontSize: "1.875rem", fontWeight: 800,
              color: "white", letterSpacing: "-0.02em", lineHeight: 1.05,
            }}>
              {topName}
            </h2>

            {/* Message preview */}
            {topMessage && (
              <p style={{
                margin: "0 0 24px",
                fontSize: "0.9375rem",
                color: `rgba(255,255,255,0.6)`,
                lineHeight: 1.55,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              } as React.CSSProperties}>
                {topMessage}
              </p>
            )}

            {/* Primary action: Call */}
            {phoneHref && (
              <a href={phoneHref} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "17px 0", borderRadius: 100,
                backgroundColor: GREEN, textDecoration: "none",
                boxShadow: `0 0 32px rgba(50,208,116,0.35)`,
                marginBottom: 10,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                </svg>
                <span style={{ fontSize: "0.9375rem", fontWeight: 900, color: BLACK, letterSpacing: "0.02em" }}>
                  Call {topName?.split(" ")[0]}
                </span>
              </a>
            )}

            {/* Secondary action: Text */}
            {textHref && (
              <a href={textHref} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "15px 0", borderRadius: 100,
                backgroundColor: "rgba(50,208,116,0.1)",
                border: "1px solid rgba(50,208,116,0.22)",
                textDecoration: "none",
                marginBottom: emailHref ? 14 : 0,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: GREEN }}>
                  Text {topName?.split(" ")[0]}
                </span>
              </a>
            )}

            {/* Tertiary: email */}
            {emailHref && (
              <a href={emailHref} style={{ display: "flex", justifyContent: "center", textDecoration: "none", paddingTop: phoneHref ? 0 : 10 }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: `rgba(255,255,255,0.35)`, letterSpacing: "0.01em" }}>
                  or reply by email →
                </span>
              </a>
            )}
          </div>

          {/* More new leads link */}
          {newCount > 1 && (
            <Link href="/leads" style={{ display: "flex", justifyContent: "center", paddingTop: 14, textDecoration: "none" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, letterSpacing: "0.02em" }}>
                + {newCount - 1} more new {newCount - 1 === 1 ? "lead" : "leads"} →
              </span>
            </Link>
          )}
        </div>
      )}

      {/* ── STATE 2: ALL CAUGHT UP ── */}
      {!hasNewLead && !isWelcome && (
        <>
          {/* Status pill */}
          <div style={{ padding: "20px 24px 0", ...fade(0.06) }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 100, backgroundColor: "rgba(50,208,116,0.08)", border: "1px solid rgba(50,208,116,0.15)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, animation: "breathe 2.4s ease-in-out infinite" }}/>
              <span style={{ ...TYPE.caption, color: GREEN, fontSize: "0.6875rem" }}>All caught up</span>
            </div>
          </div>

          {/* Momentum number */}
          <div style={{ padding: "24px 24px 0", ...fade(0.1) }}>
            <div style={{
              fontSize: "5rem", fontWeight: 300,
              color: "white", letterSpacing: "-0.04em", lineHeight: 1,
              marginBottom: 4,
            }}>
              {totalCount}
            </div>
            <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
              total {totalCount === 1 ? "lead" : "leads"}
            </div>
          </div>

          {/* Recent leads list */}
          {recentForStrip.length > 0 && (
            <div style={{ padding: "28px 20px 0", ...fade(0.14) }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", marginBottom: 12 }}>
                <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Recent</span>
                <Link href="/leads" style={{ textDecoration: "none" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 900, color: GREEN, letterSpacing: "0.04em" }}>View all →</span>
                </Link>
              </div>
              <div style={{ borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
                {recentForStrip.map((lead, i) => (
                  <Link key={lead.id} href="/leads" style={{ textDecoration: "none" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 18px",
                      borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                        backgroundColor: `${avatarColorFor(lead.name ?? "?")}22`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.875rem", fontWeight: 700,
                        color: avatarColorFor(lead.name ?? "?"),
                      }}>
                        {(lead.name ?? "?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...TYPE.subhead, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {lead.name ?? "Unknown"}
                        </div>
                        {lead.source && (
                          <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, marginTop: 2 }}>
                            {lead.source}
                          </div>
                        )}
                      </div>
                      <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, flexShrink: 0 }}>
                        {lead.created_at ? timeAgo(lead.created_at) : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── STATE 3: WELCOME — no leads yet ── */}
      {isWelcome && (
        <div style={{ padding: "20px 20px 0", ...fade(0.06) }}>
          <div style={{
            borderRadius: 28, padding: "26px 24px",
            background: "linear-gradient(160deg, rgba(50,208,116,0.10), rgba(50,208,116,0.03))",
            border: "1px solid rgba(50,208,116,0.18)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 10px ${GREEN}`, animation: "breathe 2s ease-in-out infinite" }}/>
              <span style={{ color: GREEN, ...TYPE.caption }}>You&apos;re live</span>
            </div>
            <h2 style={{
              margin: "0 0 10px",
              fontSize: "1.875rem", fontWeight: 300,
              color: "white", letterSpacing: "-0.03em", lineHeight: 1.05,
            }}>
              Share your site.
            </h2>
            <p style={{ margin: "0 0 26px", ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,0.52)`, lineHeight: 1.65 }}>
              Your first lead could come from the next person you talk to. Send them your link.
            </p>
            <button onClick={handleShare} style={{
              width: "100%", padding: "17px 0", borderRadius: 100,
              backgroundColor: GREEN, border: "none", cursor: "pointer",
              fontSize: "0.875rem", fontWeight: 900, color: BLACK,
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
              boxShadow: `0 0 28px rgba(50,208,116,0.3)`,
            }}>
              {copied ? "Link Copied ✓" : "Share My Site →"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.1); opacity: 0.65; }
        }
      `}</style>
    </main>
  )
}
