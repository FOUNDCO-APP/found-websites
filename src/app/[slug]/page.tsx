import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { getLayout } from "@/lib/layout"
import { heroGradient } from "@/lib/color"
import { getStockImages } from "@/lib/stockImages"
import { createAdminClient } from "@/lib/supabase/admin"
import { getIndustryCTAs } from "@/lib/industryCTAs"
import ImpactLayout from "@/components/layouts/ImpactLayout"
import EditorialLayout from "@/components/layouts/EditorialLayout"
import PortraitLayout from "@/components/layouts/PortraitLayout"
import CinematicLayout from "@/components/layouts/CinematicLayout"
import type { LayoutProps } from "@/types/layout"

export default async function HomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) notFound()

  const config = company.website_config
  const layout = getLayout(company.industry_category, company.vibe)
  const gradient = heroGradient(company.primary_color)
  const heroVideo = config?.hero_video_url ?? null

  const imgs = await getStockImages(company)
  const uploadedImgs = config?.hero_images?.length ? config.hero_images : config?.hero_image_url ? [config.hero_image_url] : []
  const heroImage = uploadedImgs[0] ?? imgs[0] ?? null

  const admin = createAdminClient()
  const { data: addonRows } = await admin
    .from("addon_subscriptions")
    .select("addon_slug")
    .eq("company_id", company.id)
    .eq("active", true)
  const activeAddons = (addonRows ?? []).map((r: { addon_slug: string }) => r.addon_slug)
  const { supportingCTA } = getIndustryCTAs(company.industry_category, activeAddons, company.primary_intent)

  let locations: import("@/components/layouts/FindUsSection").PublicLocation[] = []
  if (activeAddons.includes("second_location")) {
    const { data: locRows } = await admin
      .from("company_locations")
      .select("id, name, address, phone, hours")
      .eq("company_id", company.id)
      .order("sort_order", { ascending: true })
    locations = (locRows ?? []) as typeof locations
  }

  const props: LayoutProps = { company, activeAddons, supportingCTA, imgs, gradient, heroImage, heroVideo, uploadedImgs, locations }

  // Route to the correct layout — falls back to Impact for unbuilt layouts
  switch (layout) {
    case "editorial": return <EditorialLayout {...props} />
    case "portrait":  return <PortraitLayout {...props} />
    case "cinematic": return <CinematicLayout {...props} />
    default:          return <ImpactLayout {...props} />
  }
}
