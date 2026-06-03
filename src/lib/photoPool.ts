import { createClient } from "./supabase/server"
import { fetchStockPhotos } from "./pexels"

export type PoolPhoto = {
  url: string
  desc: string
}

// Query industry_photo_pools — most specific match first (industry + vibe),
// falls back to industry-only pool (vibe = null).
// Returns just the URLs for use in stock_images / template rendering.
// Returns empty array if no pool found — gradient fallback kicks in.
export async function getPhotoPool(
  industryCategory: string,
  vibe: string
): Promise<string[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("industry_photo_pools")
    .select("photos, keywords")
    .eq("industry_category", industryCategory)
    .eq("active", true)
    .or(`vibe.eq.${vibe},vibe.is.null`)
    .order("vibe", { ascending: false, nullsFirst: false }) // prefer specific vibe over null
    .limit(1)
    .single()

  if (!data) return []

  const photos = data.photos as PoolPhoto[]

  // Pool has curated photos — return URLs
  if (photos?.length) return photos.map((p) => p.url)

  // Pool exists but is empty — use its keywords for Pexels fallback
  if (data.keywords) {
    return fetchStockPhotos(industryCategory, vibe, 10, null, data.keywords)
  }

  return []
}

// Get full photo objects with descriptions — used by onboarding UI
// to show photo picker with labels
export async function getPhotoPoolWithDesc(
  industryCategory: string,
  vibe: string
): Promise<PoolPhoto[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("industry_photo_pools")
    .select("photos")
    .eq("industry_category", industryCategory)
    .eq("active", true)
    .or(`vibe.eq.${vibe},vibe.is.null`)
    .order("vibe", { ascending: false, nullsFirst: false })
    .limit(1)
    .single()

  if (!data?.photos) return []
  return data.photos as PoolPhoto[]
}
