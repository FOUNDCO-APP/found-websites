"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { generateWebsiteContent } from "@/lib/contentGeneration"
import { getIndustryManifest } from "@/lib/industryManifests"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export type SiteNeedingCopy = {
  company_id: string
  company_name: string
  slug: string
  industry: string
  sub_industry: string | null
  city: string | null
  state: string | null
  vibe: string
  hero_subtitle: string | null
  copy_generated: boolean | null
  config_id: string
}

export async function getSitesNeedingCopy(): Promise<SiteNeedingCopy[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from("website_config")
    .select(`
      id,
      hero_subtitle,
      copy_generated,
      company:companies (
        id,
        name,
        slug,
        industry_category,
        sub_industry,
        city,
        state,
        vibe
      )
    `)
    .order("id", { ascending: false })
    .limit(100)

  if (error) {
    console.error("[admin/copy] fetch error:", error.message)
    return []
  }

  return (data ?? [])
    .filter((row) => row.company)
    .map((row) => {
      const c = (row.company as unknown) as {
        id: string; name: string; slug: string
        industry_category: string; sub_industry: string | null
        city: string | null; state: string | null; vibe: string
      }
      return {
        company_id: c.id,
        company_name: c.name,
        slug: c.slug,
        industry: c.industry_category,
        sub_industry: c.sub_industry,
        city: c.city,
        state: c.state,
        vibe: c.vibe,
        hero_subtitle: row.hero_subtitle,
        copy_generated: row.copy_generated ?? null,
        config_id: row.id,
      }
    })
}

export async function regenerateSiteCopy(companyId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminClient()

  // Load the full company + config in parallel
  const [{ data: company, error: cErr }, { data: config, error: cfErr }] = await Promise.all([
    supabase
      .from("companies")
      .select("name, industry_category, sub_industry, city, state, vibe")
      .eq("id", companyId)
      .maybeSingle(),
    supabase
      .from("website_config")
      .select("about_text, services")
      .eq("company_id", companyId)
      .maybeSingle(),
  ])

  if (cErr || !company) return { success: false, error: "Company not found." }
  if (cfErr || !config) return { success: false, error: "Config not found." }

  const manifest = getIndustryManifest(company.industry_category)
  if (!manifest) return { success: false, error: "Unknown industry." }

  const services = Array.isArray(config.services) ? config.services : []

  const result = await generateWebsiteContent({
    name: company.name,
    description: config.about_text || "",
    industry: company.industry_category,
    subIndustry: company.sub_industry || "",
    city: company.city,
    state: company.state,
    different: "",
    services,
    vibe: company.vibe || "bold",
    manifest,
  })

  const { error: updateError } = await supabase
    .from("website_config")
    .update({
      hero_title: result.heroTitle,
      hero_subtitle: result.heroSubtitle,
      about_text: result.aboutText,
      tagline: result.tagline,
      cta_headline: result.ctaHeadline,
      services: result.services,
      copy_generated: result.copy_generated,
    })
    .eq("company_id", companyId)

  if (updateError) {
    console.error("[admin/copy] update error:", updateError.message)
    return { success: false, error: "Copy generated but DB update failed." }
  }

  return { success: true }
}
