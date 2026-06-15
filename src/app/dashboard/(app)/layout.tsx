import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany, getAllCompanies } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import DashboardNav from "@/components/dashboard/DashboardNav"

const FOUND_BLACK = "#080A09"

export const metadata = { title: "Found Dashboard" }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const [company, allCompanies] = await Promise.all([
    getCompany(user.id, user.email ?? ""),
    getAllCompanies(user.id, user.email ?? ""),
  ])

  const hasMultiple = allCompanies.length > 1

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
            hasMultiple ? (
              <a href="/select" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  maxWidth: 160,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {company.name}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </a>
            ) : (
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
            )
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
