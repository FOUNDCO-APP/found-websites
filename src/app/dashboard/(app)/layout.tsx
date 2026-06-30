import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany, hasMultipleCompanies } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import DashboardNav from "@/components/dashboard/DashboardNav"
import InstallPrompt from "@/components/dashboard/InstallPrompt"
import Link from "next/link"
import ActivationBanner from "@/components/dashboard/ActivationBanner"
import BusinessDisplayNamePrompt from "@/components/dashboard/BusinessDisplayNamePrompt"
import { getEffectiveAddons } from "@/lib/featureAccess"

import { BLACK } from "@/lib/dashboard/typography"

export const metadata = { title: "Found" }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()
  const since = new Date(Date.now() - 7 * 86400000).toISOString()

  const [company, hasMultiple] = await Promise.all([
    getCompany(user.id, user.email ?? ""),
    hasMultipleCompanies(user.id, user.email ?? ""),
  ])

  const newLeadCount = company?.id
    ? await admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .neq("type", "onboarding_abandoned")
        .gte("created_at", since)
        .then(({ count }) => count ?? 0)
    : 0

  const paidAddonSlugs = company?.id
    ? await admin
        .from("addon_subscriptions")
        .select("addon_slug")
        .eq("company_id", company.id)
        .eq("active", true)
        .then(({ data }) => (data ?? []).map((row: { addon_slug: string }) => row.addon_slug))
    : []

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BLACK, fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>

      {/* Main content — shifts right of sidebar on desktop */}
      <div className="found-dashboard-main">

        {/* ── Header — hidden on desktop (sidebar carries wordmark + company name) ── */}
        <header className="found-dashboard-header" style={{
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
            paddingTop: "max(env(safe-area-inset-top), 14px)",
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
                <Link href="/select" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 100, backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: "rgba(255,255,255,0.85)",
                    maxWidth: 160,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {company.name}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </Link>
              ) : (
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: "rgba(255,255,255,0.75)",
                  maxWidth: 180,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {company.name}
                </span>
              )
            )}
          </div>
        </header>

        {company && (
          <BusinessDisplayNamePrompt initialName={company.name} slug={company.slug} />
        )}

        {/* Activation banner */}
        {company && company.subscription_status !== "active" && company.subscription_status !== "trialing" && (
          <ActivationBanner
            slug={company.slug}
            companyName={company.name}
          />
        )}

        <div className="found-dashboard-content" style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 120 }}>
          {children}
        </div>

      </div>

      <InstallPrompt trigger="auto" />

      <DashboardNav
        companyName={company?.name ?? null}
        newLeadCount={newLeadCount}
        industry={company?.industry_category ?? null}
        activeAddons={getEffectiveAddons(company?.plan, paidAddonSlugs)}
      />

      <style>{`
        @media (min-width: 768px) {
          .found-dashboard-main {
            margin-left: 220px;
          }
          .found-dashboard-header {
            display: none !important;
          }
          .found-dashboard-content {
            padding-top: 28px;
            padding-bottom: 48px !important;
          }
        }
      `}</style>
    </div>
  )
}


