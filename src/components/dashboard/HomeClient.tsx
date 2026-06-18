"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"

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
}

export default function HomeClient({
  firstName, greeting, newCount, totalCount,
  topName, topEmail, topPhone, topMessage, topCreatedAt, siteSlug,
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

  return (
    <main style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      backgroundColor: BLACK,
      backgroundImage: AMBIENT[greeting] ?? AMBIENT.afternoon,
      position: "relative",
    }}>

      {/* ── HEADER: greeting, small and out of the way ── */}
      <div style={{
        padding: "20px 24px 0",
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}>
        <p style={{
          margin: 0, color: "white", opacity: TEXT_OPACITY.tertiary, ...TYPE.subhead,
        }}>
          Good {greeting}, {firstName}
        </p>
      </div>

      {/* ── THE ONE THING THAT MATTERS ── */}
      <div style={{
        padding: "20px 20px 0",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.5s ease 0.05s, transform 0.5s ease 0.05s",
      }}>
        {hasNewLead ? (
          // ── STATE: NEW LEAD — this IS the screen ──
          <div style={{
            borderRadius: 28,
            padding: "26px 24px",
            background: "linear-gradient(160deg, rgba(50,208,116,0.16), rgba(50,208,116,0.04))",
            border: `1px solid rgba(50,208,116,0.25)`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%", backgroundColor: GREEN,
                boxShadow: `0 0 10px ${GREEN}`, animation: "breathe 2s ease-in-out infinite",
              }}/>
              <span style={{ color: GREEN, ...TYPE.caption }}>
                {newCount === 1 ? "New lead" : `${newCount} new leads`} {topCreatedAt && `· ${timeAgo(topCreatedAt)}`}
              </span>
            </div>

            <h1 style={{
              margin: "0 0 10px", fontSize: 30, fontWeight: 800, color: "white",
              letterSpacing: "-0.02em", lineHeight: 1.05,
            }}>
              {topName}
            </h1>

            {topMessage && (
              <p style={{
                margin: "0 0 22px", fontSize: 15, color: "rgba(255,255,255,0.65)",
                lineHeight: 1.55,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              } as React.CSSProperties}>
                {topMessage}
              </p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              {phoneHref && (
                <a href={phoneHref} style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "15px 0", borderRadius: 100,
                  backgroundColor: GREEN, textDecoration: "none",
                  boxShadow: `0 0 24px rgba(50,208,116,0.3)`,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 900, color: BLACK }}>Call</span>
                </a>
              )}
              {emailHref && (
                <a href={emailHref} style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "15px 0", borderRadius: 100,
                  backgroundColor: "rgba(255,255,255,0.1)", textDecoration: "none",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "white" }}>Reply</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          // ── STATE: CAUGHT UP — short, high-contrast, confident ──
          <div style={{
            borderRadius: 28,
            padding: "30px 24px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 9, height: 9, borderRadius: "50%", backgroundColor: GREEN,
                boxShadow: `0 0 12px ${GREEN}`, animation: "breathe 2.4s ease-in-out infinite",
              }}/>
              <span style={{ fontSize: 22, fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>
                All caught up
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              {totalCount > 0
                ? `${totalCount} ${totalCount === 1 ? "lead" : "leads"} so far. New ones land right here.`
                : "Your site is live. New leads will land right here."}
            </p>
          </div>
        )}
      </div>

      {/* ── QUICK ACTIONS — immediately below, no dead air ── */}
      <div style={{
        padding: "16px 20px 0",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.5s ease 0.12s, transform 0.5s ease 0.12s",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            onClick={() => router.push("/leads?add=1")}
            style={{
              padding: "16px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              backgroundColor: GREEN, textAlign: "left",
              display: "flex", flexDirection: "column", gap: 14,
              boxShadow: `0 0 22px rgba(50,208,116,0.2)`,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 900, color: BLACK }}>Add Lead</span>
          </button>

          <Link href="/photos" style={{
            padding: "16px 14px", borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            textDecoration: "none", display: "flex", flexDirection: "column", gap: 14,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 900, color: "white" }}>Add Photo</span>
          </Link>
        </div>

        <button onClick={handleShare} style={{
          width: "100%", marginTop: 8, padding: "14px 18px", borderRadius: 20,
          backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            {copied ? "Link copied ✓" : "Share your site"}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>

      {/* ── STAT STRIP — compact, scannable, not decorative ── */}
      {totalCount > 0 && (
        <div style={{
          padding: "20px 20px 0",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.5s ease 0.18s",
        }}>
          <Link href="/leads" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px", borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.025)",
            textDecoration: "none",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>
              <strong style={{ color: "white", fontWeight: 800 }}>{totalCount}</strong> total {totalCount === 1 ? "lead" : "leads"}
            </span>
            <span style={{ fontSize: 12, fontWeight: 900, color: GREEN, letterSpacing: "0.04em" }}>
              View all →
            </span>
          </Link>
        </div>
      )}

      {/* ── SITE LINK — bottom anchor ── */}
      <div style={{ marginTop: "auto", padding: "32px 20px 8px" }}>
        <a href={`https://${siteSlug}.foundco.app`} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 8px ${GREEN}`, flexShrink: 0 }}/>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>
            {siteSlug}.foundco.app
          </span>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: "auto" }}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
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
