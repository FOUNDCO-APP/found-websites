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

export default async function LeadsPage() {
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
          Leads
        </h1>
        {leads.length > 0 && (
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            {leads.length} {leads.length === 1 ? "contact" : "contacts"}
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
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 300, color: "white" }}>
            Your site is live and listening.
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
            Your first lead will show up here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {leads.map((lead) => {
            const pa = lead.partial_answers
            const preview = lead.message || pa?.message || pa?.services || pa?.description || ""
            const initial = (lead.name || "?")[0].toUpperCase()
            return (
              <div key={lead.id} style={{
                borderRadius: 14,
                padding: "16px 18px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  backgroundColor: `${SIGNAL_GREEN}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 14, fontWeight: 700, color: SIGNAL_GREEN,
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
                    <p style={{ margin: "0 0 3px", fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lead.email}
                    </p>
                  ) : null}
                  {preview ? (
                    <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {preview}
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
