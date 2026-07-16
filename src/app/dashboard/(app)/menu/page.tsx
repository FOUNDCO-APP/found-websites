import { requireDashboardAccess } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import CatalogManager from "@/components/dashboard/CatalogManager"

export default async function MenuPage() {
  const user = await requireDashboardAccess()
  const company = await getCompany(user?.id ?? "", user?.email ?? "")
  if (!company) redirect(user ? "/login" : "/admin")

  const { data: config } = await createAdminClient()
    .from("website_config")
    .select("menu_items")
    .eq("company_id", company.id)
    .single()

  return (
    <CatalogManager
      mode="menu"
      companyName={company.name}
      slug={company.slug}
      initialCategories={config?.menu_items ?? []}
    />
  )
}