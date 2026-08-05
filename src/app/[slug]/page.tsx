import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { getLayout } from "@/lib/layout"
import { heroGradient } from "@/lib/color"
import { getStockImages } from "@/lib/stockImages"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEffectiveAddons } from "@/lib/featureAccess"
import { getSiteCTAs } from "@/lib/industryCTAs"
import { isVideoMedia } from "@/lib/mediaKind"
import ImpactLayout from "@/components/layouts/ImpactLayout"
import EditorialLayout from "@/components/layouts/EditorialLayout"
import PortraitLayout from "@/components/layouts/PortraitLayout"
import CinematicLayout from "@/components/layouts/CinematicLayout"
import WellnessLuxeLayout from "@/components/layouts/WellnessLuxeLayout"
import WellnessCinematicLayout from "@/components/layouts/WellnessCinematicLayout"
import type { LayoutProps } from "@/types/layout"

export default async function HomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) notFound()

  const config = company.website_config
  const layout = getLayout(company.industry_category, company.vibe, company.layout_override)
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
      .select("url, website_section, in_gallery")
      .eq("company_id", company.id)
      .eq("for_website", true)
      .or("in_gallery.eq.true,website_section.in.(hero,about,cta,announcement)"),
  ])
  const activeAddons = getEffectiveAddons(company.plan, (addonRows ?? []).map((r: { addon_slug: string }) => r.addon_slug), company.included_addon_slug, company.disabled_addons ?? [])
  const { primary: primaryCTA, secondary: secondaryCTA } = getSiteCTAs(company, activeAddons)
  const locations: import("@/components/layouts/FindUsSection").PublicLocation[] = (locRows ?? []) as typeof locations
  const sectionRows = (sectionPhotoRows ?? []) as { url: string; website_section: string | null; in_gallery: boolean }[]
  const firstSectionImage = (section: string) => sectionRows.find(row => row.website_section === section)?.url ?? null
  const heroSectionMedia = firstSectionImage("hero")
  const heroVideo = heroSectionMedia && isVideoMedia(heroSectionMedia) ? heroSectionMedia : configuredHeroVideo
  const heroImage = heroSectionMedia && !isVideoMedia(heroSectionMedia) ? heroSectionMedia : fallbackHeroImage
  const sectionImages = {
    hero: heroImage,
    about: firstSectionImage("about") ?? uploadedImgs[1] ?? null,
    cta: firstSectionImage("cta") ?? uploadedImgs[2] ?? null,
    // Independent of website_section - a photo can be in the gallery strip
    // AND a primary slot (hero/about/etc.) at the same time.
    gallery: sectionRows.filter(row => row.in_gallery).map(row => row.url),
    announcement: firstSectionImage("announcement"),
  }

  const props: LayoutProps = { company, activeAddons, primaryCTA, secondaryCTA, imgs, gradient, heroImage, heroVideo, uploadedImgs, sectionImages, locations }

  // Route to the correct layout - falls back to Impact for unbuilt layouts
  switch (layout) {
    case "editorial": return <EditorialLayout {...props} />
    case "portrait":  return <PortraitLayout {...props} />
    case "cinematic": return <CinematicLayout {...props} />
    case "wellness_luxe": return <WellnessLuxeLayout {...props} />
    case "wellness_cinematic": return <WellnessCinematicLayout {...props} />
    default:          return <ImpactLayout {...props} />
  }
}
