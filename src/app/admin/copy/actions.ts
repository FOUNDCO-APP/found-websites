"use server"

import { cookies } from "next/headers"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { generateWebsiteContent } from "@/lib/contentGeneration"
import { getIndustryManifest } from "@/lib/industryManifests"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function requireAdmin() {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  if (!adminKey || !process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
    throw new Error("Not authorized")
  }
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
  await requireAdmin()
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

export async function regenerateSiteCopy(companyId: string): Promise<{ success: boolean; versionId?: string; error?: string }> {
  await requireAdmin()
  const supabase = getAdminClient()

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

  const { data: versionId, error: publishError } = await supabase.rpc(
    "publish_website_copy_with_snapshot",
    {
      p_company_id: companyId,
      p_new_copy: {
        hero_title: result.heroTitle,
        hero_subtitle: result.heroSubtitle,
        about_text: result.aboutText,
        tagline: result.tagline,
        cta_headline: result.ctaHeadline,
        services: result.services,
        faq_items: result.faq_items ?? null,
        copy_generated: result.copy_generated,
      },
      p_created_by: "found_admin",
    },
  )

  if (publishError || typeof versionId !== "string") {
    console.error("[admin/copy] atomic publish error:", publishError?.message)
    return { success: false, error: "Nothing changed. The safety snapshot could not be saved." }
  }

  return { success: true, versionId }
}

export async function undoSiteCopy(versionId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const supabase = getAdminClient()
  const { error } = await supabase.rpc("restore_website_copy_version", {
    p_version_id: versionId,
    p_created_by: "found_admin",
  })

  if (error) {
    console.error("[admin/copy] restore error:", error.message)
    return { success: false, error: "Undo failed. The current site was left unchanged." }
  }

  return { success: true }
}
