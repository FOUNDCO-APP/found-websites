import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAddonAccess } from "@/lib/featureAccess"
import ShopClient from "./ShopClient"
import type { Metadata } from "next"
import { getStripeConnectStatus } from "@/lib/stripe/connect"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) return { title: "Shop" }

  const title = `Shop | ${company.name}`
  const description = company.website_config?.hero_subtitle || `Shop products from ${company.name}, straight from their website.`
  const url = `https://${company.slug}.${ROOT_DOMAIN}/shop`
  const image = company.logo_url || undefined

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: company.name,
      title,
      description,
      ...(image && { images: [{ url: image, alt: company.name }] }),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(image && { images: [image] }),
    },
  }
}

export default async function ShopPage({ params, searchParams }: {
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
    .eq("addon_slug", "shopping_cart")
    .eq("active", true)
    .maybeSingle()

  if (!hasAddonAccess(company.plan, "shopping_cart", addon ? ["shopping_cart"] : [])) notFound()

  const stripeConnect = await getStripeConnectStatus(company.stripe_connect_account_id)

  return (
    <>
      {ordered === "1" && (
        <div className="px-6 py-4 text-center font-bold" style={{ backgroundColor: "#EAF8EF", color: "#14532D" }}>
          Payment received. Your order was sent.
        </div>
      )}
      <ShopClient
        companyId={company.id}
        companyName={company.name}
        slug={slug}
        primary={company.primary_color}
        categories={company.website_config?.menu_items ?? []}
        paymentsReady={stripeConnect.ready}
      />
    </>
  )
}
