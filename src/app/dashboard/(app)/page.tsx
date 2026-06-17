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
  if (mins < 2) return "Just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
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

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

      {/* Greeting */}
      <div style={{ padding: "32px 24px 0" }}>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.3)", letterSpacing: "0.02em" }}>
          {greeting}
        </p>
        <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 300, color: "white", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
          {firstName}.
        </h1>
      </div>

      {/* Pulse — the one number that matters */}
      <div style={{ padding: "32px 24px 0", textAlign: "center" }}>
        <div style={{
          display: "inline-flex", flexDirection: "column", alignItems: "center",
          padding: "36px 48px",
          borderRadius: 32,
          background: newLeadsCount > 0
            ? `radial-gradient(ellipse at 50% 0%, ${SIGNAL_GREEN}14 0%, transparent 70%)`
            : "rgba(255,255,255,0.02)",
          border: `1px solid ${newLeadsCount > 0 ? SIGNAL_GREEN + "22" : "rgba(255,255,255,0.05)"}`,
          width: "100%",
          boxSizing: "border-box" as const,
        }}>
          <div style={{
            fontSize: 88,
            fontWeight: 200,
            color: newLeadsCount > 0 ? "white" : "rgba(255,255,255,0.2)",
            letterSpacing: "-0.05em",
            lineHeight: 1,
          }}>
            {newLeadsCount}
          </div>
          <div style={{
            marginTop: 10,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: newLeadsCount > 0 ? SIGNAL_GREEN : "rgba(255,255,255,0.2)",
          }}>
            {newLeadsCount === 1 ? "new lead this week" : "new leads this week"}
          </div>
          {allLeads.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.15)" }}>
              {allLeads.length} total
            </div>
          )}
        </div>
      </div>

      {/* Top lead — the action that matters most */}
      <div style={{ padding: "20px 24px 0" }}>
        {topLead ? (
          <div style={{
            borderRadius: 24,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "rgba(255,255,255,0.04)",
          }}>
            {/* Lead info */}
            <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{
                width: 46, height: 46, borderRadius: "50%",
                background: `radial-gradient(circle, ${SIGNAL_GREEN}33, ${SIGNAL_GREEN}11)`,
                border: `1px solid ${SIGNAL_GREEN}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: 18, fontWeight: 700, color: SIGNAL_GREEN,
              }}>
                {(topLead.name || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "white" }}>
                    {topLead.name || "Someone new"}
                  </span>
                  {topLead.created_at && (
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
                      {formatTimeAgo(topLead.created_at)}
                    </span>
                  )}
                </div>
                {topLeadMessage ? (
                  <p style={{
                    margin: "6px 0 0", fontSize: 14,
                    color: "rgba(255,255,255,0.5)", lineHeight: 1.5,
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  } as React.CSSProperties}>
                    {topLeadMessage}
                  </p>
                ) : (
                  <p style={{ margin: "6px 0 0", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
                    Reached out from your site
                  </p>
                )}
              </div>
            </div>

            {/* Action row */}
            <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {topLead.phone && (
                <a href={`tel:${topLead.phone.replace(/\D/g, "")}`} style={{
                  flex: 1, display: "flex", flexDirection: "column" as const,
                  alignItems: "center", justifyContent: "center",
                  gap: 5, padding: "14px 0", textDecoration: "none",
                  borderRight: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, color: SIGNAL_GREEN, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Call</span>
                </a>
              )}
              {topLead.email && (
                <a href={`mailto:${topLead.email}?subject=Re%3A%20Your%20inquiry&body=Hi%20${encodeURIComponent(topLead.name || "there")}%2C%0A%0AThanks%20for%20reaching%20out.%20`} style={{
                  flex: 1, display: "flex", flexDirection: "column" as const,
                  alignItems: "center", justifyContent: "center",
                  gap: 5, padding: "14px 0", textDecoration: "none",
                  borderRight: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 700, color: SIGNAL_GREEN, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Reply</span>
                </a>
              )}
              <Link href="/leads" style={{
                flex: 1, display: "flex", flexDirection: "column" as const,
                alignItems: "center", justifyContent: "center",
                gap: 5, padding: "14px 0", textDecoration: "none",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                  <path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>All</span>
              </Link>
            </div>
          </div>
        ) : (
          <div style={{
            borderRadius: 24, padding: "32px 24px", textAlign: "center",
            border: `1px solid ${SIGNAL_GREEN}18`,
            background: `radial-gradient(ellipse at 50% 100%, ${SIGNAL_GREEN}08, transparent 70%)`,
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              backgroundColor: SIGNAL_GREEN,
              margin: "0 auto 16px",
              boxShadow: `0 0 12px ${SIGNAL_GREEN}88`,
            }}/>
            <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 300, color: "white" }}>
              You&apos;re caught up.
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
              Your site is live and working.<br/>New leads will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Quick actions — big, thumb-friendly */}
      <HomeActions siteUrl={`https://${company.slug}.foundco.app`} />

      {/* Site live indicator */}
      <div style={{ padding: "0 24px 32px", marginTop: "auto" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px 0",
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            backgroundColor: SIGNAL_GREEN,
            boxShadow: `0 0 8px ${SIGNAL_GREEN}`,
          }}/>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>
            {company.slug}.foundco.app · live
          </span>
        </div>
      </div>

    </main>
  )
}
