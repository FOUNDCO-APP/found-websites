import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import SiteEditor from "./SiteEditor"

export default async function SitePage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) redirect("/login")

  const admin = createAdminClient()

  const [{ data: config }, { data: photos }] = await Promise.all([
    admin.from("website_config").select("*").eq("company_id", company.id).single(),
    admin.from("company_photos").select("id, url, website_section").eq("company_id", company.id).eq("for_website", true).order("created_at", { ascending: false }),
  ])

  return (
    <SiteEditor
      company={{ id: company.id, name: company.name, slug: company.slug }}
      config={config}
      photos={photos ?? []}
    />
  )
}
