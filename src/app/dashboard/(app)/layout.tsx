import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany, getAllCompanies } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import DashboardNav from "@/components/dashboard/DashboardNav"
import Link from "next/link"
import ActivationBanner from "@/components/dashboard/ActivationBanner"

const BLACK = "#080A09"
const GREEN = "#32D074"

export const metadata = { title: "Found" }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const [company, allCompanies] = await Promise.all([
    getCompany(user.id, user.email ?? ""),
    getAllCompanies(user.id, user.email ?? ""),
  ])

  const hasMultiple = allCompanies.length > 1

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BLACK, fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>

      {/* Main content — shifts right of sidebar on desktop */}
      <div className="found-dashboard-main">

        {/* ── Header ── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 40,
          backgroundColor: "rgba(8,10,9,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "inset 0 2px 0 rgba(50,208,116,0.7)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            maxWidth: 760, margin: "0 auto",
            padding: "14px 20px",
          }}>
            {/* FOUND wordmark — hidden on desktop (sidebar has it) */}
            <Link href="/" className="found-header-wordmark" style={{ textDecoration: "none" }}>
              <svg viewBox="0 0 420 72" style={{ height: 18, width: 98, color: "white" }} aria-label="Found">
                <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
              </svg>
            </Link>

            {/* Company name / switcher */}
            {company?.name && (
              hasMultiple ? (
                <Link href="/select" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 900,
                    color: "rgba(255,255,255,0.35)",
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    maxWidth: 160,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {company.name}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </Link>
              ) : (
                <span style={{
                  fontSize: 10, fontWeight: 900,
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  maxWidth: 180,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {company.name}
                </span>
              )
            )}
          </div>
        </header>

        {/* Activation banner */}
        {company && !company.subscription_status && (
          <ActivationBanner
            slug={company.slug}
            setupIntentSecret={(company as Record<string, unknown>).pending_setup_intent_secret as string | null}
            companyName={company.name}
          />
        )}

        <div className="found-dashboard-content" style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 120 }}>
          {children}
        </div>

      </div>

      <DashboardNav />

      <style>{`
        @media (min-width: 768px) {
          .found-dashboard-main {
            margin-left: 220px;
          }
          .found-dashboard-content {
            padding-bottom: 48px !important;
          }
          .found-header-wordmark {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
