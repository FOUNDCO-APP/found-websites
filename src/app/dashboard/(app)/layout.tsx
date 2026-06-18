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

      {/* ── Header — matches marketing site exactly ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        backgroundColor: "rgba(8,10,9,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        // Signature Found green top accent — same as the onboarding drawer
        boxShadow: "inset 0 2px 0 rgba(50,208,116,0.7)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          maxWidth: 680, margin: "0 auto",
          padding: "14px 20px",
        }}>
          {/* FOUND wordmark — same SVG as marketing site */}
          <Link href="/" style={{ textDecoration: "none" }}>
            <svg viewBox="0 0 420 72" style={{ height: 18, width: 98, color: "white" }} aria-label="Found">
              <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
            </svg>
          </Link>

          {/* Company switcher */}
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

      {/* Activation banner — shows if site not yet activated */}
      {company && !company.subscription_status && (
        <ActivationBanner
          slug={company.slug}
          setupIntentSecret={(company as Record<string, unknown>).pending_setup_intent_secret as string | null}
          companyName={company.name}
        />
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 120 }}>
        {children}
      </div>

      <DashboardNav />
    </div>
  )
}
