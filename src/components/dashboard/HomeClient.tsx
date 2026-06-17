"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const GREEN = "#32D074"
const BLACK = "#080A09"

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 2)  return "just now"
  if (m < 60) return `${m} minutes ago`
  if (h < 24) return `${h === 1 ? "an hour" : h + " hours"} ago`
  if (d === 1) return "yesterday"
  return `${d} days ago`
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
  const router = useRouter()

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

  return (
    <main style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      padding: "0 28px",
      backgroundColor: BLACK,
    }}>

      {/* ── GREETING ── loose, light */}
      <div style={{ paddingTop: 44 }}>
        <p style={{
          margin: 0,
          fontSize: 15,
          color: "rgba(255,255,255,0.25)",
          fontWeight: 400,
          letterSpacing: "0.01em",
        }}>
          Good {greeting}, {firstName}.
        </p>
      </div>

      {/* ── PULSE NUMBER ── the whole top third of the screen */}
      <div style={{ paddingTop: 20, paddingBottom: 8 }}>
        <div style={{
          fontSize: 120,
          fontWeight: 100,
          lineHeight: 1,
          letterSpacing: "-0.06em",
          color: newCount > 0 ? "white" : "rgba(255,255,255,0.07)",
          userSelect: "none",
        }}>
          {newCount}
        </div>
        <p style={{
          margin: "10px 0 0",
          fontSize: 14,
          color: newCount > 0 ? GREEN : "rgba(255,255,255,0.18)",
          fontWeight: 500,
          letterSpacing: "0.01em",
        }}>
          {newCount === 1 ? "new lead" : "new leads"} this week
          {totalCount > 0 && (
            <span style={{ color: "rgba(255,255,255,0.18)", marginLeft: 10 }}>
              · {totalCount} total
            </span>
          )}
        </p>
      </div>

      {/* ── THIN RULE ── */}
      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", margin: "28px 0" }} />

      {/* ── LATEST LEAD — pure text, zero card ── */}
      <div style={{ flex: 0 }}>
        {topName ? (
          <>
            {/* Just words. No box. No border. */}
            <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 300, color: "white", letterSpacing: "-0.02em", lineHeight: 1.3 }}>
              <span style={{ fontWeight: 600 }}>{topName}</span>
              {topCreatedAt && (
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.22)", fontWeight: 400, marginLeft: 10 }}>
                  {timeAgo(topCreatedAt)}
                </span>
              )}
            </p>
            {topMessage && (
              <p style={{
                margin: "8px 0 0",
                fontSize: 15,
                color: "rgba(255,255,255,0.38)",
                lineHeight: 1.6,
                fontStyle: "italic",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              } as React.CSSProperties}>
                &ldquo;{topMessage}&rdquo;
              </p>
            )}

            {/* Pill buttons — floating, no card around them */}
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              {phoneHref && (
                <a href={phoneHref} style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "11px 22px", borderRadius: 100,
                  backgroundColor: GREEN, textDecoration: "none",
                  boxShadow: `0 2px 12px ${GREEN}55`,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 700, color: BLACK }}>Call</span>
                </a>
              )}
              {emailHref && (
                <a href={emailHref} style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "11px 22px", borderRadius: 100,
                  backgroundColor: "rgba(255,255,255,0.09)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  textDecoration: "none",
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Reply</span>
                </a>
              )}
              <Link href="/leads" style={{
                display: "inline-flex", alignItems: "center",
                padding: "11px 18px", borderRadius: 100,
                backgroundColor: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                textDecoration: "none",
              }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.28)" }}>See all</span>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                backgroundColor: GREEN,
                boxShadow: `0 0 10px ${GREEN}`,
              }}/>
              <span style={{ fontSize: 17, color: "white", fontWeight: 400 }}>You&apos;re all caught up.</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.25)", lineHeight: 1.7 }}>
              Your site is live and collecting leads.<br />New ones will appear here.
            </p>
          </>
        )}
      </div>

      {/* ── THIN RULE ── */}
      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", margin: "32px 0" }} />

      {/* ── QUICK ACTIONS — app icon style ── */}
      <div>
        <p style={{
          margin: "0 0 16px",
          fontSize: 11, fontWeight: 700,
          color: "rgba(255,255,255,0.18)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>
          Quick Actions
        </p>

        {/* Add Lead — primary, full width, green */}
        <button
          onClick={() => router.push("/leads?add=1")}
          style={{
            width: "100%", padding: "18px 22px",
            borderRadius: 18, border: "none", cursor: "pointer",
            backgroundColor: GREEN,
            display: "flex", alignItems: "center", gap: 16,
            marginBottom: 10,
            boxShadow: `0 4px 20px ${GREEN}33`,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: "rgba(0,0,0,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: BLACK }}>Add a Lead</div>
            <div style={{ fontSize: 12, color: `${BLACK}88`, marginTop: 1 }}>Networking, referral, or walk-in</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.4 }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* Two secondary tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href="/photos" style={{
            padding: "18px 16px", borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
            textDecoration: "none",
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "white" }}>Add Photo</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 2 }}>Site · Social</div>
            </div>
          </Link>

          <button onClick={handleShare} style={{
            padding: "18px 16px", borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
            cursor: "pointer",
            display: "flex", flexDirection: "column", gap: 14,
            textAlign: "left",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "white" }}>
                {copied ? "Copied!" : "Share Site"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 2 }}>
                {copied ? "Link copied" : "Copy link"}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* ── SITE STATUS — bottom, subtle ── */}
      <div style={{ marginTop: "auto", paddingTop: 32, paddingBottom: 8 }}>
        <a
          href={`https://${siteSlug}.foundco.app`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            textDecoration: "none",
          }}
        >
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            backgroundColor: GREEN,
            boxShadow: `0 0 8px ${GREEN}`,
            flexShrink: 0,
          }}/>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            {siteSlug}.foundco.app · live
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: "auto" }}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>

    </main>
  )
}
