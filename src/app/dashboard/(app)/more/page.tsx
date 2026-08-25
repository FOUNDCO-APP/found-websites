import { requireDashboardAccess } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import DashboardPages from "@/components/dashboard/DashboardPages"
import { getEffectiveAddons } from "@/lib/featureAccess"
import { createAdminClient } from "@/lib/supabase/admin"
import { TYPE, TEXT_OPACITY } from "@/lib/dashboard/typography"
import { redirect } from "next/navigation"

export default async function MorePage() {
  const user = await requireDashboardAccess()

  const company = await getCompany(user?.id ?? "", user?.email ?? "")

  // Workers have a dedicated field-work home now. More is an owner-only
  // management surface, so do not show a stripped-down account page here.
  if (company && !(await requireOwnerAccess(user?.id ?? "", user?.email ?? "", company))) {
    redirect("/")
  }

  let activeAddonSlugs: string[] = []
  if (company?.id) {
    const admin = createAdminClient()
    const { data: addonRows } = await admin
      .from("addon_subscriptions")
      .select("addon_slug")
      .eq("company_id", company.id)
      .eq("active", true)
    activeAddonSlugs = (addonRows ?? []).map((r: { addon_slug: string }) => r.addon_slug)
  }
  const effectiveAddonSlugs = getEffectiveAddons(company?.plan, activeAddonSlugs, company?.included_addon_slug, company?.disabled_addons ?? [])

  return (
    <main style={{ padding: "28px 20px 60px" }}>
      <h1 style={{ margin: "0 0 6px", ...TYPE.largeTitle, color: "white" }}>
        Manage
      </h1>
      <p style={{ margin: "0 0 24px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, lineHeight: 1.55 }}>
        Choose what part of {company?.name ?? "your business"} you want to work on.
      </p>

      <DashboardPages
        companyName={company?.name ?? null}
        industry={company?.industry_category ?? null}
        subIndustry={company?.sub_industry ?? null}
        activeAddons={effectiveAddonSlugs}
        plan={company?.plan ?? null}
        primaryIntent={company?.primary_intent ?? null}
      />
    </main>
  )
}
