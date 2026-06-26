import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import HomeClient from "@/components/dashboard/HomeClient"

export default async function HomePage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) redirect("/login")

  const admin = createAdminClient()

  const { data: allLeadsRaw } = await admin
    .from("leads")
    .select("id, name, email, phone, message, created_at, partial_answers, temperature, source, type")
    .eq("company_id", company.id)
    .neq("type", "onboarding_abandoned")
    .order("created_at", { ascending: false })
    .limit(20)

  const allLeads = allLeadsRaw ?? []

  const newCount = allLeads.filter(l => {
    if (!l.created_at) return false
    return Date.now() - new Date(l.created_at).getTime() < 7 * 86400000
  }).length

  const top = allLeads[0] ?? null

  const recentLeads = allLeads.slice(0, 8).map(l => ({
    id: l.id,
    name: l.name ?? null,
    email: l.email ?? null,
    phone: l.phone ?? null,
    message: l.message || l.partial_answers?.message || l.partial_answers?.services || l.partial_answers?.description || null,
    created_at: l.created_at ?? null,
    source: l.source ?? l.type ?? null,
  }))

  const { data: lastPhotoRow } = await admin
    .from("photos")
    .select("created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
  const firstName = (company.name ?? "").split(" ")[0] || "there"
  const isActive = company.subscription_status === "active" || company.subscription_status === "trialing"

  return (
    <HomeClient
      firstName={firstName}
      greeting={greeting}
      newCount={newCount}
      totalCount={allLeads.length}
      topName={top?.name ?? null}
      topCreatedAt={top?.created_at ?? null}
      siteSlug={company.slug}
      isActive={isActive}
      recentLeads={recentLeads}
      lastPhotoAt={lastPhotoRow?.created_at ?? null}
      industry={company.industry_category ?? null}
    />
  )
}
