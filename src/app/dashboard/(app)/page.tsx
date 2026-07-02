import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import HomeClient from "@/components/dashboard/HomeClient"

function recommendedBusinessTool(industry: string | null): { name: string; path: string } {
  if (industry === "food" || industry === "home_based_food") return { name: "online ordering", path: "/leads?view=orders" }
  if (industry === "retail" || industry === "makers_crafts") return { name: "shopping cart", path: "/leads?view=orders" }
  if (["wellness", "beauty", "fitness", "pet_services", "education", "healthcare"].includes(industry ?? "")) return { name: "booking calendar", path: "/schedule" }
  return { name: "estimates", path: "/estimates" }
}
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

  // Deduplicate by phone → email → id (array is already ordered newest-first,
  // so first occurrence = most recent submission per unique person)
  const seen = new Set<string>()
  const allLeads = (allLeadsRaw ?? []).filter(l => {
    const key = l.phone?.replace(/\D/g, "") || l.email?.toLowerCase() || l.id
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

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
  const businessName = (company.name ?? "").trim() || "there"
  const isActive = company.subscription_status === "active" || company.subscription_status === "trialing"

  return (
    <HomeClient
      businessName={businessName}
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
      businessTool={company.plan === "found_business" ? recommendedBusinessTool(company.industry_category ?? null) : null}
    />
  )
}
