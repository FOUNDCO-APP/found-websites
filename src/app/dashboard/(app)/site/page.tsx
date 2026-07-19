import { requireDashboardAccess } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import SiteEditor from "./SiteEditor"

export default async function SitePage() {
  const user = await requireDashboardAccess()
  const company = await getCompany(user?.id ?? "", user?.email ?? "")
  if (!company) redirect(user ? "/login" : "/admin")

  const admin = createAdminClient()

  const [{ data: config }, { data: photos }, { data: mediaPhotos }, { data: addonRows }] = await Promise.all([
    admin.from("website_config").select("*").eq("company_id", company.id).single(),
    admin.from("company_photos").select("id, url, website_section").eq("company_id", company.id).eq("for_website", true).order("created_at", { ascending: false }),
    admin.from("media").select("id, url").eq("company_id", company.id).eq("website_flag", true),
    admin.from("addon_subscriptions").select("addon_slug").eq("company_id", company.id).eq("active", true),
  ])

  const stockImages = (config?.stock_images as string[]) ?? []

  return (
    <SiteEditor
      company={{ id: company.id, name: company.name, slug: company.slug }}
      config={config}
      photos={photos ?? []}
      stockImages={stockImages}
      mediaPhotos={mediaPhotos ?? []}
      primaryIntent={company.primary_intent ?? 'visit'}
      industryCategory={company.industry_category ?? ''}
      activeAddons={(addonRows ?? []).map((row: { addon_slug: string }) => row.addon_slug)}
      plan={company.plan}
      subscriptionStatus={company.subscription_status}
    />
  )
}
