import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import DashboardNav from "@/components/dashboard/DashboardNav"

const FOUND_BLACK = "#080A09"

export const metadata = {
  title: "Found Dashboard",
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id, name, slug, plan")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: FOUND_BLACK }}>
      <header style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky",
        top: 0,
        backgroundColor: FOUND_BLACK,
        zIndex: 40,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 680,
          margin: "0 auto",
          padding: "16px 20px",
        }}>
          <svg viewBox="0 0 420 72" style={{ height: 20, width: 108, color: "white" }} aria-label="Found">
            <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
          </svg>
          {company?.name && (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              maxWidth: 180,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {company.name}
            </span>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 80 }}>
        {children}
      </div>

      <DashboardNav />
    </div>
  )
}
