import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

const SIGNAL_GREEN = "#32D074"
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

export default async function SitePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id, name, slug, primary_color")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()

  if (!company) {
    return (
      <main style={{ padding: "28px 20px" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>No site found for this account.</p>
      </main>
    )
  }

  const siteUrl = `https://${company.slug}.${ROOT_DOMAIN}`
  const displayUrl = siteUrl.replace("https://", "")

  return (
    <main style={{ padding: "28px 20px" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
        Your Site
      </h1>

      {/* URL card */}
      <div style={{
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        marginBottom: 12,
      }}>
        <div style={{ height: 2, backgroundColor: SIGNAL_GREEN }} />
        <div style={{ padding: "20px", backgroundColor: "rgba(255,255,255,0.04)" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: SIGNAL_GREEN }}>
            Live at
          </p>
          <p style={{ margin: "0 0 18px", fontSize: 16, color: "white", fontWeight: 300, wordBreak: "break-all" }}>
            {displayUrl}
          </p>
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              borderRadius: 10,
              padding: "11px 22px",
              fontSize: 12,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              backgroundColor: SIGNAL_GREEN,
              color: "#080A09",
              textDecoration: "none",
            }}>
            Open site →
          </a>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <a
          href={`/connect-domain?slug=${company.slug}`}
          style={{ textDecoration: "none" }}>
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

        <a href={siteUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
          <div style={{
            borderRadius: 14,
            padding: "16px 18px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 14, color: "white" }}>Share your link</span>
            <ChevronRight />
          </div>
        </a>

        <div style={{
          borderRadius: 14,
          padding: "16px 18px",
          backgroundColor: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>Edit your site</span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(255,255,255,0.25)",
            backgroundColor: "rgba(255,255,255,0.05)",
            padding: "3px 10px",
            borderRadius: 20,
          }}>
            Coming soon
          </span>
        </div>
      </div>
    </main>
  )
}
