"use server"
import { cookies } from "next/headers"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Storage bucket + path for photo pools
const BUCKET = "config"
const POOL_PATH = (industry: string) => `photo-pools/${industry}.json`

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

async function readPool(industry: string): Promise<{ url: string; desc: string }[]> {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(POOL_PATH(industry))
    if (error || !data) return []
    const text = await data.text()
    const parsed = JSON.parse(text)
    return parsed.photos || []
  } catch {
    return []
  }
}

async function writePool(industry: string, photos: { url: string; desc: string }[]): Promise<void> {
  const supabase = getAdminClient()
  const json = JSON.stringify({ industry, photos }, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  await supabase.storage
    .from(BUCKET)
    .upload(POOL_PATH(industry), blob, { upsert: true, contentType: "application/json" })
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

export async function getApprovedCounts(): Promise<Record<string, number>> {
  const industries = [
    "home_services","food","wellness","events","retail",
    "fitness","beauty","automotive","pet_services","cleaning","landscaping",
  ]
  const counts: Record<string, number> = {}
  await Promise.all(
    industries.map(async (ind) => {
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
