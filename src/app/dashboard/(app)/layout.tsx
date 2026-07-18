import { requireDashboardAccess } from "@/lib/auth/getAuthUser"
import { getCompany, hasMultipleCompanies, isAdminOverrideActive } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import DashboardNav from "@/components/dashboard/DashboardNav"
import InstallPrompt from "@/components/dashboard/InstallPrompt"
import Link from "next/link"
import ActivationBanner from "@/components/dashboard/ActivationBanner"
import { getEffectiveAddons } from "@/lib/featureAccess"
import { exitAdminView } from "@/app/admin/businesses/actions"

import { BLACK } from "@/lib/dashboard/typography"
import FoundWordmark from "@/components/FoundWordmark"

export const metadata = { title: "Found" }
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDashboardAccess()

  const admin = createAdminClient()
  const since = new Date(Date.now() - 7 * 86400000).toISOString()

  const [company, hasMultiple, adminKeyValid] = await Promise.all([
    getCompany(user?.id ?? "", user?.email ?? ""),
    user ? hasMultipleCompanies(user.id, user.email ?? "") : Promise.resolve(false),
    isAdminOverrideActive(),
  ])

  if (!user && !company) redirect("/admin")

  const viewingAsAdmin = Boolean(adminKeyValid && company)

  const [leadCounts, paidAddonSlugs] = company?.id
    ? await Promise.all([
        admin
          .from("leads")
          .select("id, type, source, created_at")
          .eq("company_id", company.id)
          .gte("created_at", since)
          .then(({ data }) => {
            const rows = (data ?? []).filter(row => row.type !== "onboarding_abandoned")
            const isOrder = (lead: { type: string | null; source: string | null; created_at?: string | null }) =>
              lead.type === "online_order" ||
              lead.source === "online_ordering" ||
              lead.type === "shopping_order" ||
              lead.source === "shopping_cart"
            const isReservation = (lead: { type: string | null; source: string | null; created_at?: string | null }) =>
              lead.type === "reservation_request" ||
              lead.source === "reservation" ||
              lead.source === "reservations" ||
              lead.source === "booking_calendar"
            const latestAt = (items: { created_at?: string | null }[]) =>
              items.reduce<string | null>((latest, item) => {
                if (!item.created_at) return latest
                if (!latest) return item.created_at
                return new Date(item.created_at).getTime() > new Date(latest).getTime() ? item.created_at : latest
              }, null)
            const leadRows = rows.filter(row => !isOrder(row) && !isReservation(row))
            const orderRows = rows.filter(isOrder)
            const reservationRows = rows.filter(isReservation)
            return {
              leads: leadRows.length,
              orders: orderRows.length,
              reservations: reservationRows.length,
              leadLatestAt: latestAt(leadRows),
              orderLatestAt: latestAt(orderRows),
              reservationLatestAt: latestAt(reservationRows),
            }
          }),
        admin
          .from("addon_subscriptions")
          .select("addon_slug")
          .eq("company_id", company.id)
          .eq("active", true)
          .then(({ data }) => (data ?? []).map((row: { addon_slug: string }) => row.addon_slug)),
      ])
    : [{ leads: 0, orders: 0, reservations: 0, leadLatestAt: null, orderLatestAt: null, reservationLatestAt: null }, [] as string[]]

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BLACK, fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>

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
        newLeadCount={leadCounts.leads}
        newOrderCount={leadCounts.orders}
        newReservationCount={leadCounts.reservations}
        newLeadLatestAt={leadCounts.leadLatestAt}
        newOrderLatestAt={leadCounts.orderLatestAt}
        newReservationLatestAt={leadCounts.reservationLatestAt}
        industry={company?.industry_category ?? null}
        subIndustry={company?.sub_industry ?? null}
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
