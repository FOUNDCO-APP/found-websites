import { fetchStockPhotos } from "./pexels"
import { getPhotoPool } from "./photoPool"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import type { Company } from "@/types/company"

function getAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function cacheStockImages(companyId: string, images: string[]) {
  try {
    await getAdmin()
      .from("website_config")
      .update({ stock_images: images })
      .eq("company_id", companyId)
  } catch {
    // Non-fatal
  }
}

export async function getStockImages(company: Company): Promise<string[]> {
  // Level 2: cached stock_images
  const existing = company.website_config?.stock_images || []
  if (existing.length >= 3) {
    return [...existing].sort(() => Math.random() - 0.5)
  }

  // Level 3: industry photo pool — only trust it outright when photos are
  // actually tagged for this sub-industry, or there's no sub-industry to
  // match against. A pool falling back to untagged/general photos can be a
  // bad fit for a specific sub-vertical (e.g. a bike shop under "retail"
  // landing on generic boutique/apparel stock) — try a live keyword search
  // first in that case instead of trusting the mismatch.
  const subType = company.sub_industry ?? undefined
  const { urls: pool, matchedTag } = await getPhotoPool(company.industry_category, company.vibe || "bold", subType)
  if (pool.length && matchedTag) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    void cacheStockImages(company.id, shuffled)
    return shuffled
  }

  // Level 4: Pexels, keyword-driven (photo_keywords overrides the industry default)
  if (process.env.PEXELS_API_KEY) {
    const fetched = await fetchStockPhotos(
      company.industry_category,
      company.vibe || "bold",
      10,
      company.city,
      company.photo_keywords || subType
    )
    if (fetched.length) {
      void cacheStockImages(company.id, fetched)
      return fetched
    }
  }

  // Nothing better available — fall back to the generic pool rather than nothing.
  if (pool.length) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    void cacheStockImages(company.id, shuffled)
    return shuffled
  }

  return []
}

export function pickImg(imgs: string[], i: number): string | null {
  if (!imgs.length) return null
  return imgs[i % imgs.length] || null
}
