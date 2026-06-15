import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/dashboard/SignOutButton"

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

export default async function MorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id, name, slug, email")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()

  return (
    <main style={{ padding: "28px 20px" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
        More
      </h1>

      {/* Account */}
      <section style={{ marginBottom: 20 }}>
        <p style={{
          margin: "0 0 8px",
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.28)",
        }}>
          Account
        </p>
        <div style={{
          borderRadius: 14,
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}>
          {company?.name && (
            <div style={{
              padding: "14px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Business</p>
              <p style={{ margin: 0, fontSize: 14, color: "white" }}>{company.name}</p>
            </div>
          )}
          <div style={{ padding: "14px 18px" }}>
            <p style={{ margin: "0 0 2px", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Email</p>
            <p style={{ margin: 0, fontSize: 14, color: "white" }}>{user.email}</p>
          </div>
        </div>
      </section>

      {/* Settings */}
      <section style={{ marginBottom: 20 }}>
        <p style={{
          margin: "0 0 8px",
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.28)",
        }}>
          Settings
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {company?.slug && (
            <a href={`/connect-domain?slug=${company.slug}`} style={{ textDecoration: "none" }}>
              <div style={{
                borderRadius: 14,
                padding: "16px 18px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 14, color: "white" }}>Connect your domain</span>
                <ChevronRight />
              </div>
            </a>
          )}
          <a href="mailto:hello@foundco.app" style={{ textDecoration: "none" }}>
            <div style={{
              borderRadius: 14,
              padding: "16px 18px",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 14, color: "white" }}>Get help</span>
              <ChevronRight />
            </div>
          </a>
        </div>
      </section>

      {/* Sign out */}
      <SignOutButton />
    </main>
  )
}
