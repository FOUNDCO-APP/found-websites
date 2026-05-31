import { fetchStockPhotos } from "./pexels"
import { createClient } from "./supabase/server"
import type { Company } from "@/types/company"

// Call this in any page that needs images.
// Returns the saved stock_images pool, or fetches+saves from Pexels if empty.
// Works regardless of which page the visitor hits first.
export async function getStockImages(company: Company): Promise<string[]> {
  const existing = company.website_config?.stock_images || []
  if (existing.length >= 3) return existing
  if (!process.env.PEXELS_API_KEY) return []

  const fetched = await fetchStockPhotos(company.industry_category, company.vibe, 5, company.city)
  if (fetched.length) {
    const supabase = await createClient()
    await supabase
      .from("website_config")
      .update({ stock_images: fetched, hero_image_url: fetched[0] })
      .eq("company_id", company.id)
  }
  return fetched
}

// Pick image at index, cycling through available pool
export function pickImg(imgs: string[], i: number): string | null {
  if (!imgs.length) return null
  return imgs[i % imgs.length] || null
}
