"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { slugify } from "@/lib/slugify"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const SUFFIXES = ["studio", "co", "hq", "shop", "pro", "lab", "works"]

async function isFree(slug: string): Promise<boolean> {
  const supabase = getAdminClient()
  const { data } = await supabase.from("companies").select("id").eq("slug", slug).maybeSingle()
  return !data
}

function sanitize(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48)
}

export async function checkSlugAvailable(
  raw: string,
  city: string | null = null,
): Promise<{ available: boolean; suggestions: string[] }> {
  const slug = sanitize(raw)
  if (!slug) return { available: false, suggestions: [] }

  const available = await isFree(slug)
  if (available) return { available: true, suggestions: [] }

  // Build ordered candidates for suggestions
  const citySlug = city ? slugify(city) : null
  const candidates = [
    citySlug ? `${slug}-${citySlug}` : null,
    ...SUFFIXES.map((s) => `${slug}-${s}`),
  ].filter((s): s is string => !!s)

  const suggestions: string[] = []
  for (const c of candidates) {
    if (suggestions.length >= 3) break
    if (await isFree(c)) suggestions.push(c)
  }

  return { available: false, suggestions }
}
