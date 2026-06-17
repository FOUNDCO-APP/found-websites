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
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d === 1) return "yesterday"
  return `${d}d ago`
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
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", backgroundColor: BLACK }}>

      {/* ── GREETING — Found voice: direct, light ── */}
      <div style={{ padding: "44px 24px 0" }}>
        {/* Eyebrow — matches marketing site eyebrow style */}
        <p style={{
          margin: "0 0 8px",
          fontSize: 10, fontWeight: 900,
          color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase",
          letterSpacing: "0.22em",
        }}>
          {greeting}
        </p>
        {/* Headline — light weight, tight leading, like the hero */}
        <h1 style={{
          margin: 0,
          fontSize: 42,
          fontWeight: 300,
          color: "white",
          letterSpacing: "-0.04em",
          lineHeight: 0.95,
        }}>
          {firstName}.
        </h1>
      </div>

      {/* ── PULSE — the number that matters ── */}
      <div style={{ padding: "36px 24px 0" }}>
        <div style={{
          fontSize: 108,
          fontWeight: 300,
          lineHeight: 1,
          letterSpacing: "-0.06em",
          color: newCount > 0 ? "white" : "rgba(255,255,255,0.06)",
          userSelect: "none",
        }}>
          {newCount}
        </div>
        {/* Green eyebrow under the number */}
        <p style={{
          margin: "10px 0 0",
          fontSize: 10, fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.22em",
          color: newCount > 0 ? GREEN : "rgba(255,255,255,0.15)",
        }}>
          {newCount === 1 ? "new lead this week" : "new leads this week"}
          {totalCount > 0 && (
            <span style={{ color: "rgba(255,255,255,0.15)", marginLeft: 12 }}>
              · {totalCount} total
            </span>
          )}
        </p>
      </div>

      {/* ── RULE ── */}
      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", margin: "32px 24px" }}/>

      {/* ── TOP LEAD — pure type, no card ── */}
      <div style={{ padding: "0 24px" }}>
        {topName ? (
          <>
            <p style={{
              margin: "0 0 6px",
              fontSize: 24,
              fontWeight: 300,
              color: "white",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}>
              <span style={{ fontWeight: 700 }}>{topName}</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 300 }}> reached out</span>
            </p>
            {topCreatedAt && (
              <p style={{
                margin: "0 0 14px",
                fontSize: 10, fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.2)",
              }}>
                {timeAgo(topCreatedAt)}
              </p>
            )}
            {topMessage && (
              <p style={{
                margin: "0 0 22px",
                fontSize: 15,
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.65,
                fontStyle: "italic",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              } as React.CSSProperties}>
                &ldquo;{topMessage}&rdquo;
              </p>
            )}

            {/* Action pills — Found button style: rounded-full, font-black, uppercase, tracking-widest */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {phoneHref && (
                <a href={phoneHref} style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "12px 22px", borderRadius: 100,
                  backgroundColor: GREEN, textDecoration: "none",
                  boxShadow: `0 0 28px rgba(50,208,116,0.25)`,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                  </svg>
                  <span style={{ fontSize: 10, fontWeight: 900, color: BLACK, letterSpacing: "0.18em", textTransform: "uppercase" }}>Call</span>
                </a>
              )}
              {emailHref && (
                <a href={emailHref} style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "12px 22px", borderRadius: 100,
                  backgroundColor: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  textDecoration: "none",
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.6)", letterSpacing: "0.18em", textTransform: "uppercase" }}>Reply</span>
                </a>
              )}
              <Link href="/leads" style={{
                display: "inline-flex", alignItems: "center",
                padding: "12px 18px", borderRadius: 100,
                border: "1px solid rgba(255,255,255,0.08)",
                textDecoration: "none",
              }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.25)", letterSpacing: "0.18em", textTransform: "uppercase" }}>All leads</span>
              </Link>
            </div>
          </>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 12px ${GREEN}` }}/>
              <span style={{ fontSize: 18, fontWeight: 300, color: "white", letterSpacing: "-0.01em" }}>
                You&apos;re all caught up.
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.25)", lineHeight: 1.7, letterSpacing: "0.01em" }}>
              Your site is live and collecting leads.<br/>New ones will appear here.
            </p>
          </div>
        )}
      </div>

      {/* ── RULE ── */}
      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", margin: "32px 24px" }}/>

      {/* ── QUICK ACTIONS — Found button language ── */}
      <div style={{ padding: "0 24px" }}>
        <p style={{
          margin: "0 0 16px",
          fontSize: 10, fontWeight: 900,
          color: "rgba(255,255,255,0.15)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}>
          Quick Actions
        </p>

        {/* Primary CTA — green, full width, glow */}
        <button
          onClick={() => router.push("/leads?add=1")}
          style={{
            width: "100%", padding: "18px 22px",
            borderRadius: 100, border: "none", cursor: "pointer",
            backgroundColor: GREEN,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 10,
            boxShadow: `0 0 34px rgba(50,208,116,0.22)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <span style={{ fontSize: 11, fontWeight: 900, color: BLACK, letterSpacing: "0.18em", textTransform: "uppercase" }}>
              Add a Lead
            </span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.5 }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* Secondary tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Link href="/photos" style={{
            padding: "18px 16px", borderRadius: 24,
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            textDecoration: "none",
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "white", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>Add Photo</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>Site · Social</div>
            </div>
          </Link>

          <button onClick={handleShare} style={{
            padding: "18px 16px", borderRadius: 24,
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            cursor: "pointer", textAlign: "left",
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "white", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>
                {copied ? "Copied!" : "Share Site"}
              </div>
              <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>Copy link</div>
            </div>
          </button>
        </div>
      </div>

      {/* ── SITE STATUS ── */}
      <div style={{ marginTop: "auto", padding: "32px 24px 8px" }}>
        <a
          href={`https://${siteSlug}.foundco.app`}
          target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 8px ${GREEN}`, flexShrink: 0 }}/>
          <span style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.18)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            {siteSlug}.foundco.app
          </span>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: "auto" }}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>

    </main>
  )
}
