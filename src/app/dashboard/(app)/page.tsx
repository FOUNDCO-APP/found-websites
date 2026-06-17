import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from "next/link"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#080A09"

function formatDate(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const msDay = 86400000
  if (diff < msDay)     return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  if (diff < 7 * msDay) return d.toLocaleDateString("en-US", { weekday: "short" })
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function HomePage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) redirect("/login")

  const admin = createAdminClient()

  // Fetch leads
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

  // Top unactioned lead = most recent
  const topLead = allLeads[0] ?? null
  const topLeadMessage = topLead
    ? (topLead.message || topLead.partial_answers?.message || topLead.partial_answers?.services || topLead.partial_answers?.description || "")
    : ""

  const siteUrl = `https://${company.slug}.foundco.app`

  return (
    <main style={{ padding: "28px 20px", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Pulse */}
      <div style={{
        borderRadius: 20,
        padding: "28px 24px",
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 72, fontWeight: 200, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>
          {newLeadsCount}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {newLeadsCount === 1 ? "new lead this week" : "new leads this week"}
        </div>
        {allLeads.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            {allLeads.length} total
          </div>
        )}
      </div>

      {/* Top unactioned lead */}
      {topLead ? (
        <div style={{
          borderRadius: 20,
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "16px 18px 14px", display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: "50%",
              backgroundColor: `${SIGNAL_GREEN}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: 16, fontWeight: 700, color: SIGNAL_GREEN,
            }}>
              {(topLead.name || "?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>
                  {topLead.name || "Someone new"}
                </span>
                {topLead.created_at && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0, marginLeft: 12 }}>
                    {formatDate(topLead.created_at)}
                  </span>
                )}
              </div>
              {topLeadMessage ? (
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                  {topLeadMessage}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                  Contacted you from your site
                </p>
              )}
            </div>
          </div>
          {/* Actions */}
          <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            {topLead.phone && (
              <a href={`tel:${topLead.phone.replace(/\D/g, "")}`} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 7, padding: "13px 0", textDecoration: "none",
                borderRight: topLead.email ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: SIGNAL_GREEN, letterSpacing: "0.04em" }}>Call</span>
              </a>
            )}
            {topLead.email && (
              <a href={`mailto:${topLead.email}?subject=Re%3A%20Your%20inquiry&body=Hi%20${encodeURIComponent(topLead.name || "there")}%2C%0A%0AThanks%20for%20reaching%20out.%20`} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 7, padding: "13px 0", textDecoration: "none",
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: SIGNAL_GREEN, letterSpacing: "0.04em" }}>Reply</span>
              </a>
            )}
            <Link href="/leads" style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 7, padding: "13px 0", textDecoration: "none",
              borderLeft: "1px solid rgba(255,255,255,0.05)",
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>All Leads</span>
            </Link>
          </div>
        </div>
      ) : (
        <div style={{
          borderRadius: 20,
          padding: "28px 24px",
          backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 13, color: SIGNAL_GREEN, fontWeight: 700, letterSpacing: "0.04em", marginBottom: 6 }}>
            You&apos;re caught up.
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
            Your site is live and listening.<br/>New leads will show up here.
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 12 }}>
          Quick Actions
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

          {/* Add Lead */}
          <Link href="/leads?add=1" style={{
            borderRadius: 16, padding: "18px 16px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            textDecoration: "none", display: "flex", flexDirection: "column", gap: 10,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>Add Lead</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Networking, referral</div>
            </div>
          </Link>

          {/* Add Photo */}
          <Link href="/photos" style={{
            borderRadius: 16, padding: "18px 16px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            textDecoration: "none", display: "flex", flexDirection: "column", gap: 10,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>Add Photo</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Website or social</div>
            </div>
          </Link>

          {/* Share Site */}
          <a href={siteUrl} target="_blank" rel="noopener noreferrer" style={{
            borderRadius: 16, padding: "18px 16px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            textDecoration: "none", display: "flex", flexDirection: "column", gap: 10,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>Share Site</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{company.slug}.foundco.app</div>
            </div>
          </a>

          {/* View Site */}
          <Link href="/more" style={{
            borderRadius: 16, padding: "18px 16px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            textDecoration: "none", display: "flex", flexDirection: "column", gap: 10,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>My Site</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Edit & manage</div>
            </div>
          </Link>

        </div>
      </div>

      {/* Weekly snapshot */}
      <div style={{
        borderRadius: 16, padding: "16px 18px",
        backgroundColor: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.04)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 200, color: "white" }}>{allLeads.length}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>Total Leads</div>
        </div>
        <div style={{ width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.07)" }}/>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 200, color: SIGNAL_GREEN }}>●</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>Site Live</div>
        </div>
        <div style={{ width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.07)" }}/>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 200, color: "white" }}>{newLeadsCount}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>This Week</div>
        </div>
      </div>

    </main>
  )
}
