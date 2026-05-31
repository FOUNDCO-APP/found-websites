import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { getLayout } from "@/lib/layout"
import { heroGradient } from "@/lib/color"
import { fetchStockPhotos } from "@/lib/pexels"
import { createClient } from "@/lib/supabase/server"
import ImpactLayout from "@/components/layouts/ImpactLayout"
import EditorialLayout from "@/components/layouts/EditorialLayout"
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

  // Fetch 5 stock photos on first visit — saved to DB so all pages use the same pool
  let imgs: string[] = config?.stock_images || []
  if (imgs.length < 3 && !heroVideo && process.env.PEXELS_API_KEY) {
    const fetched = await fetchStockPhotos(company.industry_category, company.vibe, 5, company.city)
    if (fetched.length) {
      imgs = fetched
      const supabase = await createClient()
      await supabase
        .from("website_config")
        .update({ stock_images: fetched, hero_image_url: fetched[0] })
        .eq("company_id", company.id)
    }
  }

  const heroImage = config?.hero_image_url || imgs[0] || null

  const props: LayoutProps = { company, imgs, gradient, heroImage, heroVideo }

  // Route to the correct layout — falls back to Impact for unbuilt layouts
  switch (layout) {
    case "editorial": return <EditorialLayout {...props} />
    case "portrait":  return <ImpactLayout {...props} />   // Portrait coming next
    case "cinematic": return <ImpactLayout {...props} />   // Cinematic coming next
    default:          return <ImpactLayout {...props} />
  }
}
