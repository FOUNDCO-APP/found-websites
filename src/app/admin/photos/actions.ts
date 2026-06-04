"use server"
import { cookies } from "next/headers"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Admin actions need service role key to bypass RLS
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const PEXELS_KEY = process.env.PEXELS_API_KEY || ""

const industryQueries: Record<string, string> = {
  home_services: "home renovation remodeling contractor construction worker",
  food:          "fresh food restaurant meal kitchen cooking ingredients",
  wellness:      "spa massage wellness relaxation peaceful serene therapy",
  events:        "event party celebration decoration colorful venue elegant",
  retail:        "boutique shop retail store product display stylish interior",
  fitness:       "gym fitness workout exercise training athlete strong",
  beauty:        "salon beauty hair nail makeup styling transformation",
  automotive:    "car repair mechanic auto service garage vehicle",
  pet_services:  "dog cat pet grooming animal cute happy owner",
  cleaning:      "clean home professional spotless organized service sparkle",
  landscaping:   "garden landscape lawn outdoor plants nature green yard",
}

export interface PexelsPhoto {
  id: number
  url: string
  thumb: string
  desc: string
}

export async function fetchIndustryPhotos(industry: string): Promise<PexelsPhoto[]> {
  const query = industryQueries[industry] || industry
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

export async function saveApprovedPhotos(
  industry: string,
  photos: { url: string; desc: string }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient()

    // Get existing pool for this industry (vibe null = universal)
    const { data: existing } = await supabase
      .from("industry_photo_pools")
      .select("id, photos")
      .eq("industry_category", industry)
      .is("vibe", null)
      .maybeSingle()

    const existingPhotos: { url: string; desc: string }[] = existing?.photos || []

    // Deduplicate by URL
    const existingUrls = new Set(existingPhotos.map((p) => p.url))
    const newPhotos = photos.filter((p) => !existingUrls.has(p.url))
    const merged = [...existingPhotos, ...newPhotos]

    if (existing?.id) {
      await supabase
        .from("industry_photo_pools")
        .update({ photos: merged })
        .eq("id", existing.id)
    } else {
      await supabase
        .from("industry_photo_pools")
        .insert({
          industry_category: industry,
          vibe: null,
          photos: merged,
          keywords: null,
          active: true,
        })
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function getApprovedCounts(): Promise<Record<string, number>> {
  try {
    const supabase = getAdminClient()
    const { data } = await supabase
      .from("industry_photo_pools")
      .select("industry_category, photos")
      .is("vibe", null)

    const counts: Record<string, number> = {}
    for (const row of data || []) {
      counts[row.industry_category] = (row.photos as unknown[])?.length || 0
    }
    return counts
  } catch {
    return {}
  }
}

export async function adminLogin(key: string): Promise<boolean> {
  if (key === process.env.ADMIN_KEY) {
    const cookieStore = await cookies()
    cookieStore.set("admin_key", key, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })
    return true
  }
  return false
}
