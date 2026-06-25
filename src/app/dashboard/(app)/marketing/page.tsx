import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import MarketingClient from "@/components/dashboard/MarketingClient"

export default async function MarketingPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) redirect("/login")

  const admin = createAdminClient()

  const [{ data: contacts }, { data: campaigns }] = await Promise.all([
    admin.from("contacts")
      .select("id, name, email, birthday_month, birthday_day, created_at")
      .eq("company_id", company.id)
      .eq("email_subscribed", true)
      .not("email", "is", null),
    admin.from("email_campaigns")
      .select("id, subject, sent_at, recipient_count, status")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

  return (
    <MarketingClient
      companyId={company.id}
      companyName={company.name ?? ""}
      companySlug={company.slug}
      industry={company.industry_category ?? null}
      contacts={(contacts ?? []) as { id: string; name: string | null; email: string; birthday_month: number | null; birthday_day: number | null; created_at: string }[]}
      campaigns={(campaigns ?? []).filter(c => c.status === "sent") as { id: string; subject: string; sent_at: string | null; recipient_count: number | null }[]}
      rootDomain={ROOT_DOMAIN}
    />
  )
}
