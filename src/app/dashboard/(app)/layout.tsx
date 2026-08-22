import { requireDashboardAccess } from "@/lib/auth/getAuthUser"
import { getCompany, hasMultipleCompanies, isAdminOverrideActive, getCompanyRole } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import DashboardNav from "@/components/dashboard/DashboardNav"
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState"
import UploadStatusProvider from "@/components/dashboard/UploadStatusProvider"
import AccountMenu from "@/components/dashboard/AccountMenu"
import CustomerActivityTracker from "@/components/dashboard/CustomerActivityTracker"
import InstallPrompt from "@/components/dashboard/InstallPrompt"
import Link from "next/link"
import ActivationBanner from "@/components/dashboard/ActivationBanner"
import { getEffectiveAddons } from "@/lib/featureAccess"
import { exitAdminView } from "@/app/admin/businesses/actions"
import { Suspense } from "react"

import { BLACK } from "@/lib/dashboard/typography"
import FoundWordmark from "@/components/FoundWordmark"

export const metadata = { title: "Found" }
export const dynamic = "force-dynamic"
export const revalidate = 0

function DashboardShellFallback() {
  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BLACK, fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>
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
          <FoundWordmark height={18} color="white" />
          <span style={{
            width: 78,
            height: 12,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.08)",
          }} />
        </div>
      </header>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 120px" }}>
        <DashboardLoadingState />
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardShellFallback />}>
      <DashboardChrome>{children}</DashboardChrome>
    </Suspense>
  )
}

async function DashboardChrome({ children }: { children: React.ReactNode }) {
  const user = await requireDashboardAccess()
  const admin = createAdminClient()

  const [company, hasMultiple, adminKeyValid] = await Promise.all([
    getCompany(user?.id ?? "", user?.email ?? ""),
    user ? hasMultipleCompanies(user.id, user.email ?? "") : Promise.resolve(false),
    isAdminOverrideActive(),
  ])

  if (!user && !company) redirect("/admin")

  const [memberRole, paidAddonSlugs] = company
    ? await Promise.all([
        getCompanyRole(user?.id ?? "", user?.email ?? "", company),
        admin
          .from("addon_subscriptions")
          .select("addon_slug")
          .eq("company_id", company.id)
          .eq("active", true)
          .then(({ data }) => (data ?? []).map((row: { addon_slug: string }) => row.addon_slug)),
      ])
    : [null, [] as string[]]

  const viewingAsAdmin = Boolean(adminKeyValid && company)
  const effectiveAddons = getEffectiveAddons(company?.plan, paidAddonSlugs, company?.included_addon_slug, company?.disabled_addons ?? [])

  return (
    <UploadStatusProvider>
    <div style={{ minHeight: "100dvh", backgroundColor: BLACK, fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>
      <CustomerActivityTracker disabled={viewingAsAdmin || !user || !company} />

      {/* Main content shifts right of sidebar on desktop */}
      <div className="found-dashboard-main">

        {/* Header hidden on desktop; sidebar carries wordmark and company name */}
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
            {/* FOUND wordmark hidden on desktop; sidebar has it */}
            <Link href="/" className="found-header-wordmark" style={{ textDecoration: "none" }}>
              <FoundWordmark height={18} color="white" />
            </Link>

            {/* Company name + account menu. Business switching (when
                relevant) and everything else account-level - Team, Business
                Info, Billing, Sign Out - now lives behind this one icon
                instead of a page-nav destination or a plain text link. */}
            {company?.name && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: "rgba(255,255,255,0.75)",
                  maxWidth: 150,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {company.name}
                </span>
                {memberRole === "owner" && (
                  <AccountMenu hasMultiple={hasMultiple} />
                )}
              </div>
            )}
          </div>
        </header>


        {/* Viewing-as-admin banner - always visible while active, never silent */}
        {viewingAsAdmin && company && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "10px 20px", backgroundColor: "#FF9500", color: "#080A09",
          }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>
              Viewing as {company.name} (Admin)
            </span>
            <form action={exitAdminView}>
              <button type="submit" style={{
                border: "none", background: "rgba(8,10,9,0.15)", color: "#080A09",
                fontSize: 11, fontWeight: 800, padding: "5px 10px", borderRadius: 100, cursor: "pointer",
              }}>
                Exit
              </button>
            </form>
          </div>
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
        newLeadCount={0}
        newOrderCount={0}
        newReservationCount={0}
        newLeadLatestAt={null}
        newOrderLatestAt={null}
        newReservationLatestAt={null}
        industry={company?.industry_category ?? null}
        subIndustry={company?.sub_industry ?? null}
        activeAddons={effectiveAddons}
        plan={company?.plan ?? null}
        primaryIntent={company?.primary_intent ?? null}
        role={memberRole === "worker" ? "worker" : "owner"}
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
    </UploadStatusProvider>
  )
}
