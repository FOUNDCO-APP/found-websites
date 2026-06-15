import { createClient } from "@/lib/supabase/server"
import { getCompany } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"

const SIGNAL_GREEN = "#32D074"

type LeadRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  type: string | null
  created_at: string | null
  partial_answers: Record<string, string> | null
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const msDay = 86400000
  if (diff < msDay)     return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  if (diff < 7 * msDay) return d.toLocaleDateString("en-US", { weekday: "short" })
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { createAdminClient } = await import("@/lib/supabase/admin")
  const admin = createAdminClient()

  const company = await getCompany(user.id, user.email ?? "")

  const leads: LeadRow[] = company
    ? (((await admin
        .from("leads")
        .select("id, name, email, phone, message, type, created_at, partial_answers")
        .eq("company_id", company.id)
        .neq("type", "onboarding_abandoned")
        .order("created_at", { ascending: false })
        .limit(100)
      ).data ?? []) as LeadRow[])
    : []

  return (
    <main style={{ padding: "28px 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
          Inbox
        </h1>
        {leads.length > 0 && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            {leads.length} {leads.length === 1 ? "conversation" : "conversations"}
          </p>
        )}
      </div>

      {leads.length === 0 ? (
        <div style={{ paddingTop: 60, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            backgroundColor: "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 300, color: "white" }}>
            No messages yet.
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
            When someone contacts you, you can reply here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {leads.map((lead) => {
            const pa = lead.partial_answers
            const message = lead.message || pa?.message || pa?.services || pa?.description || ""
            const initial = (lead.name || "?")[0].toUpperCase()
            const emailHref = lead.email
              ? `mailto:${lead.email}?subject=Re%3A%20Your%20inquiry&body=Hi%20${encodeURIComponent(lead.name || "there")}%2C%0A%0AThanks%20for%20reaching%20out.%20`
              : null
            const phoneHref = lead.phone ? `tel:${lead.phone.replace(/\D/g, "")}` : null

            return (
              <div key={lead.id} style={{
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                overflow: "hidden",
              }}>
                {/* Lead info */}
                <div style={{ padding: "16px 18px 14px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    backgroundColor: `${SIGNAL_GREEN}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontSize: 15, fontWeight: 700, color: SIGNAL_GREEN,
                  }}>
                    {initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
                        {lead.name || "Unknown"}
                      </span>
                      {lead.created_at ? (
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0, marginLeft: 12 }}>
                          {formatDate(lead.created_at)}
                        </span>
                      ) : null}
                    </div>
                    {lead.email ? (
                      <p style={{ margin: "0 0 4px", fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lead.email}
                      </p>
                    ) : null}
                    {message ? (
                      <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                        {message}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Action row */}
                {(emailHref || phoneHref) && (
                  <div style={{
                    display: "flex",
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    {phoneHref && (
                      <a href={phoneHref} style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                        padding: "12px 0",
                        textDecoration: "none",
                        borderRight: emailHref ? "1px solid rgba(255,255,255,0.05)" : "none",
                      }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                          stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                        </svg>
                        <span style={{ fontSize: 12, fontWeight: 700, color: SIGNAL_GREEN, letterSpacing: "0.04em" }}>Call</span>
                      </a>
                    )}
                    {emailHref && (
                      <a href={emailHref} style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                        padding: "12px 0",
                        textDecoration: "none",
                      }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                          stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        <span style={{ fontSize: 12, fontWeight: 700, color: SIGNAL_GREEN, letterSpacing: "0.04em" }}>Reply</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
