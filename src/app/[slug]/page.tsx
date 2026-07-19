import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { getLayout } from "@/lib/layout"
import { heroGradient } from "@/lib/color"
import { getStockImages } from "@/lib/stockImages"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEffectiveAddons } from "@/lib/featureAccess"
import { getIndustryCTAs } from "@/lib/industryCTAs"
import { isVideoMedia } from "@/lib/mediaKind"
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
  const configuredHeroVideo = config?.hero_video_url ?? null

  const imgs = await getStockImages(company)
  const uploadedImgs = config?.hero_images?.length ? config.hero_images : config?.hero_image_url ? [config.hero_image_url] : []
  const fallbackHeroImage = uploadedImgs[0] ?? imgs[0] ?? null

  const admin = createAdminClient()
  const [{ data: addonRows }, { data: locRows }, { data: sectionPhotoRows }] = await Promise.all([
    admin
      .from("addon_subscriptions")
      .select("addon_slug")
      .eq("company_id", company.id)
      .eq("active", true),
    admin
      .from("company_locations")
      .select("id, name, address, phone, hours")
      .eq("company_id", company.id)
      .order("sort_order", { ascending: true }),
    admin
      .from("company_photos")
      .select("url, website_section")
      .eq("company_id", company.id)
      .eq("for_website", true)
      .in("website_section", ["hero", "about", "cta", "gallery"]),
  ])
  const activeAddons = getEffectiveAddons(company.plan, (addonRows ?? []).map((r: { addon_slug: string }) => r.addon_slug))
  const { supportingCTA } = getIndustryCTAs(company.industry_category, activeAddons, company.primary_intent)
  const locations: import("@/components/layouts/FindUsSection").PublicLocation[] = (locRows ?? []) as typeof locations
  const sectionRows = (sectionPhotoRows ?? []) as { url: string; website_section: string | null }[]
  const firstSectionImage = (section: string) => sectionRows.find(row => row.website_section === section)?.url ?? null
  const heroSectionMedia = firstSectionImage("hero")
  const heroVideo = heroSectionMedia && isVideoMedia(heroSectionMedia) ? heroSectionMedia : configuredHeroVideo
  const heroImage = heroSectionMedia && !isVideoMedia(heroSectionMedia) ? heroSectionMedia : fallbackHeroImage
  const sectionImages = {
    hero: heroImage,
    about: firstSectionImage("about") ?? uploadedImgs[1] ?? null,
    cta: firstSectionImage("cta") ?? uploadedImgs[2] ?? null,
    gallery: sectionRows.filter(row => row.website_section === "gallery").map(row => row.url),
  }

  const props: LayoutProps = { company, activeAddons, supportingCTA, imgs, gradient, heroImage, heroVideo, uploadedImgs, sectionImages, locations }

  // Route to the correct layout - falls back to Impact for unbuilt layouts
  switch (layout) {
    case "editorial": return <EditorialLayout {...props} />
    case "portrait":  return <PortraitLayout {...props} />
    case "cinematic": return <CinematicLayout {...props} />
    default:          return <ImpactLayout {...props} />
  }
}
