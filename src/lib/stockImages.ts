import { fetchStockPhotos } from "./pexels"
import { getPhotoPool } from "./photoPool"
import { createClient } from "./supabase/server"
import type { Company } from "@/types/company"

// Priority order:
// 1. Client's own real photos (Phase 3 — heart flag → website_flag in media table)
// 2. Client's curated stock_images (already saved — shuffle and return)
// 3. Industry photo pool from Supabase Storage, matched by sub_industry when available
// 4. Pexels API with company photo_keywords or industry default
// 5. Empty array → gradient fallback in templates

export async function getStockImages(company: Company): Promise<string[]> {
  // Level 2: cached stock_images — shuffle for variety
  const existing = company.website_config?.stock_images || []
  if (existing.length >= 3) {
    return [...existing].sort(() => Math.random() - 0.5)
  }

  // Level 3: industry photo pool
  const pool = await getPhotoPool(company.industry_category, company.vibe || "bold", company.sub_industry ?? undefined)
  if (pool.length) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    // Cache to stock_images so future loads skip the DB query
    const supabase = await createClient()
    await supabase
      .from("website_config")
      .update({ stock_images: shuffled })
      .eq("company_id", company.id)
    return shuffled
  }

  // Level 4: Pexels with company keywords or industry default
  if (process.env.PEXELS_API_KEY) {
    const fetched = await fetchStockPhotos(
      company.industry_category,
      company.vibe || "bold",
      10,
      company.city,
      company.photo_keywords || company.sub_industry
    )
    if (fetched.length) {
      const supabase = await createClient()
      await supabase
        .from("website_config")
        .update({ stock_images: fetched })
        .eq("company_id", company.id)
      return fetched
    }
  }

  // Level 5: gradient fallback
  return []
}

export function pickImg(imgs: string[], i: number): string | null {
  if (!imgs.length) return null
  return imgs[i % imgs.length] || null
}
