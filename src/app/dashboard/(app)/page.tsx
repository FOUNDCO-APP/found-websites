import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from "next/link"
import HomeActions from "@/components/dashboard/HomeActions"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#080A09"

function formatTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "yesterday"
  return `${days} days ago`
}

export default async function HomePage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) redirect("/login")

  const admin = createAdminClient()
  const { data: leads } = await admin
    .from("leads")
    .select("id, name, email, phone, message, type, created_at, partial_answers")
    .eq("company_id", company.id)
    .neq("type", "onboarding_abandoned")
    .order("created_at", { ascending: false })
    .limit(50)

  const allLeads = leads ?? []
  const newLeadsCount = allLeads.filter(l => {
    if (!l.created_at) return false
    return Date.now() - new Date(l.created_at).getTime() < 7 * 86400000
  }).length
  const topLead = allLeads[0] ?? null
  const topLeadMessage = topLead
    ? (topLead.message || topLead.partial_answers?.message || topLead.partial_answers?.services || topLead.partial_answers?.description || "")
    : ""

  const firstName = company.name?.split(" ")[0] ?? "there"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const phoneHref = topLead?.phone ? `tel:${topLead.phone.replace(/\D/g, "")}` : null
  const emailHref = topLead?.email
    ? `mailto:${topLead.email}?subject=Re%3A%20Your%20inquiry&body=Hi%20${encodeURIComponent(topLead.name || "there")}%2C%0A%0AThanks%20for%20reaching%20out.%20`
    : null

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "0 0 32px" }}>

      {/* ── GREETING ── */}
      <div style={{ padding: "36px 28px 0" }}>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>
          {greeting}
        </p>
        <h1 style={{
          margin: "2px 0 0",
          fontSize: 34,
          fontWeight: 200,
          color: "white",
          letterSpacing: "-0.04em",
          lineHeight: 1.1,
        }}>
          {firstName}.
        </h1>
      </div>

      {/* ── PULSE ── enormous number, nothing else competing */}
      <div style={{
        padding: "48px 28px 40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}>
        <div style={{
          fontSize: 96,
          fontWeight: 100,
          lineHeight: 1,
          letterSpacing: "-0.06em",
          color: newLeadsCount > 0 ? "white" : "rgba(255,255,255,0.1)",
        }}>
          {newLeadsCount}
        </div>
        <div style={{
          marginTop: 8,
          fontSize: 13,
          color: newLeadsCount > 0 ? SIGNAL_GREEN : "rgba(255,255,255,0.2)",
          fontWeight: 500,
          letterSpacing: "0.01em",
        }}>
          {newLeadsCount === 1 ? "new lead this week" : "new leads this week"}
          {allLeads.length > 0 && (
            <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: 8 }}>
              · {allLeads.length} total
            </span>
          )}
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", margin: "0 28px" }} />

      {/* ── TOP LEAD NOTIFICATION — feels like a text, not a card ── */}
      <div style={{ padding: "24px 28px" }}>
        {topLead ? (
          <div>
            {/* Who + when — just text */}
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "white" }}>
                {topLead.name || "Someone"}
              </span>
              <span style={{ fontSize: 15, color: "rgba(255,255,255,0.35)" }}>
                {" "}reached out
              </span>
              {topLead.created_at && (
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", display: "block", marginTop: 2 }}>
                  {formatTimeAgo(topLead.created_at)}
                </span>
              )}
            </div>

            {/* Message preview — just text */}
            {topLeadMessage && (
              <p style={{
                margin: "0 0 20px",
                fontSize: 14,
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.6,
                fontStyle: "italic",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              } as React.CSSProperties}>
                &ldquo;{topLeadMessage}&rdquo;
              </p>
            )}

            {/* Pill action buttons — not cards */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {phoneHref && (
                <a href={phoneHref} style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "10px 20px", borderRadius: 100,
                  backgroundColor: SIGNAL_GREEN,
                  textDecoration: "none",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 700, color: FOUND_BLACK, letterSpacing: "0.03em" }}>Call</span>
                </a>
              )}
              {emailHref && (
                <a href={emailHref} style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "10px 20px", borderRadius: 100,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  textDecoration: "none",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.03em" }}>Reply</span>
                </a>
              )}
              <Link href="/leads" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 20px", borderRadius: 100,
                backgroundColor: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                textDecoration: "none",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.03em" }}>All leads</span>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                backgroundColor: SIGNAL_GREEN,
                boxShadow: `0 0 10px ${SIGNAL_GREEN}`,
              }}/>
              <span style={{ fontSize: 15, color: "white", fontWeight: 500 }}>You&apos;re caught up.</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
              Your site is live and working.<br/>New leads will appear here.
            </p>
          </div>
        )}
      </div>

      {/* ── DIVIDER ── */}
      <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", margin: "0 28px" }} />

      {/* ── QUICK ACTIONS ── */}
      <HomeActions siteUrl={`https://${company.slug}.foundco.app`} />

      {/* ── SITE STATUS ── */}
      <div style={{ padding: "28px 28px 0", marginTop: "auto" }}>
        <a
          href={`https://${company.slug}.foundco.app`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            textDecoration: "none",
          }}
        >
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            backgroundColor: SIGNAL_GREEN,
            boxShadow: `0 0 8px ${SIGNAL_GREEN}88`,
            flexShrink: 0,
          }}/>
          <span style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.01em",
          }}>
            {company.slug}.foundco.app
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>

    </main>
  )
}
