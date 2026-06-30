import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAddonAccess } from "@/lib/featureAccess"
import OnlineOrderClient from "./OnlineOrderClient"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  return { title: company ? `Order Online | ${company.name}` : "Order Online" }
}

export default async function OnlineOrderPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ordered?: string }>
}) {
  const { slug } = await params
  const { ordered } = await searchParams
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const admin = createAdminClient()
  const { data: addon } = await admin
    .from("addon_subscriptions")
    .select("id")
    .eq("company_id", company.id)
    .eq("addon_slug", "online_ordering")
    .eq("active", true)
    .maybeSingle()

  if (!hasAddonAccess(company.plan, "online_ordering", addon ? ["online_ordering"] : [])) notFound()

  return (
    <>
      {ordered === "1" && (
        <div className="px-6 py-4 text-center font-bold" style={{ backgroundColor: "#EAF8EF", color: "#14532D" }}>
          Payment received. Your order was sent.
        </div>
      )}
      <OnlineOrderClient
        companyId={company.id}
        companyName={company.name}
        slug={slug}
        primary={company.primary_color}
        categories={company.website_config?.menu_items ?? []}
        paymentsReady={Boolean(company.stripe_connect_account_id)}
      />
    </>
  )
}