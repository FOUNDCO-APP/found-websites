"use server"
import { cookies } from "next/headers"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Storage bucket + paths for photo pools
const BUCKET = "config"
const POOL_PATH         = (industry: string) => `photo-pools/${industry}.json`
const PENDING_POOL_PATH = (industry: string) => `photo-pools/${industry}.pending.json`

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const PEXELS_KEY = process.env.PEXELS_API_KEY || ""

const industryQueries: Record<string, string> = {
  home_services:        "home renovation remodeling contractor construction worker",
  food:                 "fresh food restaurant meal kitchen cooking ingredients",
  wellness:             "spa massage wellness relaxation peaceful serene therapy",
  events:               "event party celebration decoration colorful venue elegant",
  retail:               "boutique shop retail store product display stylish interior",
  fitness:              "gym fitness workout exercise training athlete strong",
  beauty:               "salon beauty hair nail makeup styling transformation",
  automotive:           "car repair mechanic auto service garage vehicle",
  pet_services:         "dog cat pet grooming animal cute happy owner",
  cleaning:             "clean home professional spotless organized service sparkle",
  landscaping:          "garden landscape lawn outdoor plants nature green yard",
  real_estate:          "real estate agent professional home neighborhood property",
  creative_services:    "graphic designer creative studio branding photography workspace",
  home_based_food:      "homemade baking cottage kitchen food artisan pastry",
  education:            "tutoring teaching lesson learning classroom student",
  music_performance:    "live music band performance concert musician stage",
  professional_services:"professional office consultant business meeting workspace",
  healthcare:           "physical therapy massage chiropractic wellness clinic care",
  childcare:            "childcare daycare children kids play learning happy",
  makers_crafts:        "handmade craft artisan workshop ceramics woodworking jewelry maker",
  home_property:        "home interior staging property architecture real estate photography",
  nonprofit:            "community volunteers nonprofit charity giving people together",
}

export interface PexelsPhoto {
  id: number
  url: string
  thumb: string
  desc: string
}

export async function fetchIndustryPhotos(industry: string, customQuery?: string): Promise<PexelsPhoto[]> {
  const query = customQuery?.trim() || industryQueries[industry] || industry
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=24&orientation=landscape`,
      { headers: { Authorization: PEXELS_KEY }, cache: "no-store" }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.photos || []).map((p: { id: number; alt: string; src: { large2x: string; medium: string } }) => ({
      id: p.id,
      url: p.src.large2x,
      thumb: p.src.medium,
      desc: p.alt || "",
    }))
  } catch {
    return []
  }
}

async function readPoolFromPath(path: string): Promise<{ url: string; desc: string; tag?: string | null }[]> {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase.storage.from(BUCKET).download(path)
    if (error || !data) return []
    const text = await data.text()
    const parsed = JSON.parse(text)
    return parsed.photos || []
  } catch {
    return []
  }
}

async function writePoolToPath(path: string, industry: string, photos: { url: string; desc: string; tag?: string | null }[]): Promise<void> {
  const supabase = getAdminClient()
  const json = JSON.stringify({ industry, photos }, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: "application/json" })
}

async function readPool(industry: string) { return readPoolFromPath(POOL_PATH(industry)) }
async function writePool(industry: string, photos: { url: string; desc: string; tag?: string | null }[]) {
  return writePoolToPath(POOL_PATH(industry), industry, photos)
}

export async function saveApprovedPhotos(
  industry: string,
  photos: { url: string; desc: string }[],
  tag?: string  // search query used — becomes the sub-type label
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await readPool(industry)
    const existingUrls = new Set(existing.map((p) => p.url))
    const newPhotos = photos
      .filter((p) => !existingUrls.has(p.url))
      .map((p) => ({ ...p, tag: tag || null }))
    const merged = [...existing, ...newPhotos]
    await writePool(industry, merged)
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

const ALL_INDUSTRIES = [
  "home_services","food","wellness","events","retail",
  "fitness","beauty","automotive","pet_services","cleaning","landscaping","real_estate",
  "creative_services","home_based_food","education","music_performance",
  "professional_services","healthcare","childcare","makers_crafts","home_property","nonprofit",
]

export async function getApprovedCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  await Promise.all(
    ALL_INDUSTRIES.map(async (ind) => {
      const pool = await readPool(ind)
      if (pool.length > 0) counts[ind] = pool.length
    })
  )
  return counts
}

export async function getApprovedUrls(industry: string): Promise<string[]> {
  const pool = await readPool(industry)
  return pool.map((p) => p.url)
}

// Team submits picks for Shawn's review — saves to pending path, does NOT go live
export async function saveTeamPicks(
  industry: string,
  photos: { url: string; desc: string }[],
  tag?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await readPoolFromPath(PENDING_POOL_PATH(industry))
    const existingUrls = new Set(existing.map((p) => p.url))
    const newPhotos = photos.filter((p) => !existingUrls.has(p.url)).map((p) => ({ ...p, tag: tag || null }))
    await writePoolToPath(PENDING_POOL_PATH(industry), industry, [...existing, ...newPhotos])
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Get URLs the team has submitted so they pre-select in the curator UI
export async function getTeamPickUrls(industry: string): Promise<string[]> {
  const pool = await readPoolFromPath(PENDING_POOL_PATH(industry))
  return pool.map((p) => p.url)
}

// Get full pending photo objects so Shawn can see and review them
export async function getTeamPicks(industry: string): Promise<{ url: string; desc: string; tag?: string | null }[]> {
  return readPoolFromPath(PENDING_POOL_PATH(industry))
}

// Remove a single photo from the pending pool
export async function removePendingPhoto(industry: string, url: string): Promise<{ success: boolean }> {
  try {
    const existing = await readPoolFromPath(PENDING_POOL_PATH(industry))
    const updated = existing.filter((p) => p.url !== url)
    if (updated.length === 0) {
      const supabase = getAdminClient()
      await supabase.storage.from(BUCKET).remove([PENDING_POOL_PATH(industry)])
    } else {
      await writePoolToPath(PENDING_POOL_PATH(industry), industry, updated)
    }
    return { success: true }
  } catch {
    return { success: false }
  }
}

// Get pending counts for all industries (for amber badge in tabs)
export async function getPendingCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  await Promise.all(
    ALL_INDUSTRIES.map(async (ind) => {
      const pool = await readPoolFromPath(PENDING_POOL_PATH(ind))
      if (pool.length > 0) counts[ind] = pool.length
    })
  )
  return counts
}

// Shawn approves: merges pending picks into live pool, clears pending
export async function promoteToLive(industry: string): Promise<{ success: boolean; error?: string }> {
  try {
    const pending = await readPoolFromPath(PENDING_POOL_PATH(industry))
    if (!pending.length) return { success: false, error: "No pending picks to promote" }
    const existing = await readPool(industry)
    const existingUrls = new Set(existing.map((p) => p.url))
    const merged = [...existing, ...pending.filter((p) => !existingUrls.has(p.url))]
    await writePool(industry, merged)
    const supabase = getAdminClient()
    await supabase.storage.from(BUCKET).remove([PENDING_POOL_PATH(industry)])
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Delete a live pool (used to clear rogue uploads)
export async function deletePool(industry: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient()
    await supabase.storage.from(BUCKET).remove([POOL_PATH(industry)])
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function adminLogin(key: string): Promise<boolean> {
  if (key === process.env.ADMIN_KEY) {
    const cookieStore = await cookies()
    const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
    cookieStore.set("admin_key", key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // Scoped to the whole root domain, not just whichever host served the
      // login form - without this, the cookie never reaches my.foundco.app
      // and "View as" silently can't prove you're an admin once you get there.
      domain: process.env.NODE_ENV === "production" ? `.${ROOT_DOMAIN}` : undefined,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })
    return true
  }
  return false
}
