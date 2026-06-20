"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  photoCount: number
  recentLeads: RecentLead[]
}

export default function HomeClient({
  firstName, greeting, newCount, totalCount,
  topName, topEmail, topPhone, topMessage, topCreatedAt,
  siteSlug, isActive, photoCount, recentLeads,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

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

  const phoneHref = topPhone ? `tel:${topPhone.replace(/\D/g, "")}` : null
  const emailHref = topEmail
    ? `mailto:${topEmail}?subject=Re%3A%20Your%20inquiry&body=Hi%20${encodeURIComponent(topName ?? "there")}%2C%0A%0A`
    : null
  const hasNewLead = newCount > 0 && topName
  const isWelcome = isActive && totalCount === 0 && !hasNewLead

  // Recent leads to show in the strip: skip the top lead if it's showing in the card
  const stripLeads = hasNewLead ? recentLeads.slice(1, 4) : recentLeads.slice(0, 3)
  const showRecentStrip = !hasNewLead && !isWelcome && stripLeads.length > 0

  return (
    <main style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      backgroundColor: BLACK,
      backgroundImage: AMBIENT[greeting] ?? AMBIENT.afternoon,
      position: "relative",
    }}>

      {/* ── GREETING ── */}
      <div style={{
        padding: "28px 24px 0",
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}>
        <h1 style={{ margin: 0, color: "white", ...TYPE.largeTitle }}>
          Good {greeting},<br/>{firstName}.
        </h1>
      </div>

      {/* ── MAIN CARD ── */}
      <div style={{
        padding: "20px 20px 0",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.5s ease 0.05s, transform 0.5s ease 0.05s",
      }}>
        {hasNewLead ? (
          <div style={{
            borderRadius: 28, padding: "26px 24px",
            background: "linear-gradient(160deg, rgba(50,208,116,0.16), rgba(50,208,116,0.04))",
            border: `1px solid rgba(50,208,116,0.25)`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 10px ${GREEN}`, animation: "breathe 2s ease-in-out infinite" }}/>
              <span style={{ color: GREEN, ...TYPE.caption }}>
                {newCount === 1 ? "New lead" : `${newCount} new leads`} {topCreatedAt && `· ${timeAgo(topCreatedAt)}`}
              </span>
            </div>
            <h2 style={{ margin: "0 0 10px", fontSize: "1.875rem", fontWeight: 800, color: "white", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
              {topName}
            </h2>
            {topMessage && (
              <p style={{ margin: "0 0 22px", fontSize: "0.9375rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                {topMessage}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {phoneHref && (
                <a href={phoneHref} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "18px 0", borderRadius: 100, backgroundColor: GREEN, textDecoration: "none", boxShadow: `0 0 32px rgba(50,208,116,0.4)` }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                  </svg>
                  <span style={{ fontSize: "0.9375rem", fontWeight: 900, color: BLACK, letterSpacing: "0.02em" }}>
                    Call {topName?.split(" ")[0]}
                  </span>
                </a>
              )}
              {emailHref && (
                <a href={emailHref} style={{ display: "flex", justifyContent: "center", textDecoration: "none" }}>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.38)", letterSpacing: "0.02em" }}>
                    or reply by email →
                  </span>
                </a>
              )}
            </div>
          </div>
        ) : isWelcome ? (
          <div style={{ borderRadius: 28, padding: "26px 24px", background: "linear-gradient(160deg, rgba(50,208,116,0.10), rgba(50,208,116,0.03))", border: `1px solid rgba(50,208,116,0.18)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 10px ${GREEN}`, animation: "breathe 2s ease-in-out infinite" }}/>
              <span style={{ color: GREEN, ...TYPE.caption }}>You&apos;re live</span>
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.875rem", fontWeight: 300, color: "white", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
              Share your site.
            </h2>
            <p style={{ margin: "0 0 22px", ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,0.55)`, lineHeight: 1.6 }}>
              Your first lead could come from the next person you talk to. Send them your link.
            </p>
            <button onClick={handleShare} style={{ width: "100%", padding: "15px 0", borderRadius: 100, backgroundColor: GREEN, border: "none", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 900, color: BLACK, letterSpacing: "0.1em", textTransform: "uppercase" as const, boxShadow: `0 0 24px rgba(50,208,116,0.3)` }}>
              {copied ? "Link Copied ✓" : "Share My Site →"}
            </button>
          </div>
        ) : (
          <div style={{ borderRadius: 28, padding: "30px 24px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 12px ${GREEN}`, animation: "breathe 2.4s ease-in-out infinite" }}/>
              <span style={{ ...TYPE.title, color: "white" }}>All caught up</span>
            </div>
            <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 400, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              {totalCount > 0 ? `${totalCount} ${totalCount === 1 ? "lead" : "leads"} so far. New ones land here.` : "New leads land right here."}
            </p>
            {totalCount > 0 && (
              <Link href="/leads" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 14, textDecoration: "none" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 900, color: GREEN, letterSpacing: "0.04em" }}>View all →</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── STATS ROW ── */}
      <div style={{
        padding: "12px 20px 0",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.5s ease 0.10s, transform 0.5s ease 0.10s",
        display: "flex", gap: 8,
      }}>
        <StatChip value={newCount} label="this week" />
        <StatChip value={totalCount} label="total leads" />
        <StatChip value={photoCount} label="photos" />
      </div>

      {/* ── RECENT LEADS STRIP ── */}
      {showRecentStrip && (
        <div style={{
          padding: "16px 20px 0",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.5s ease 0.14s, transform 0.5s ease 0.14s",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Recent</span>
            <Link href="/leads" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 900, color: GREEN, letterSpacing: "0.04em" }}>View all →</span>
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {stripLeads.map(lead => (
              <Link key={lead.id} href="/leads" style={{ textDecoration: "none" }}>
                <div style={{ padding: "12px 16px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    backgroundColor: `${avatarColorFor(lead.name ?? "?")}26`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontSize: "0.8125rem", fontWeight: 700,
                    color: avatarColorFor(lead.name ?? "?"),
                  }}>
                    {(lead.name ?? "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...TYPE.subhead, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lead.name ?? "Unknown"}
                    </div>
                    <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
                      {lead.source ?? "Lead"}
                    </div>
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

      {/* ── QUICK ACTIONS ── */}
      <div style={{
        padding: "16px 20px 0",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.5s ease 0.18s, transform 0.5s ease 0.18s",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: hasNewLead ? "1fr" : "1fr 1fr", gap: 8 }}>
          {!hasNewLead && (
            <button onClick={() => router.push("/leads?add=1")} style={{ padding: "16px 14px", borderRadius: 20, border: "none", cursor: "pointer", backgroundColor: GREEN, textAlign: "left", display: "flex", flexDirection: "column", gap: 14, boxShadow: `0 0 22px rgba(50,208,116,0.2)` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              <span style={{ fontSize: "0.8125rem", fontWeight: 900, color: BLACK }}>Add Lead</span>
            </button>
          )}
          <Link href="/photos" style={{ padding: "16px 14px", borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none", display: "flex", flexDirection: "column", gap: 14 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span style={{ fontSize: "0.8125rem", fontWeight: 900, color: "white" }}>Add Photo</span>
          </Link>
        </div>

        <button onClick={handleShare} style={{ width: "100%", marginTop: 8, padding: "14px 18px", borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            {copied ? "Link copied ✓" : "Share your site"}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.7; }
        }
      `}</style>
    </main>
  )
}

function StatChip({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ flex: 1, padding: "14px 12px", borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
      <div style={{ fontSize: "1.5rem", fontWeight: 300, color: "white", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, marginTop: 5 }}>{label}</div>
    </div>
  )
}
