"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { revalidatePath } from "next/cache"

async function getContext() {
  const user = await getAuthUser()
  if (!user) return null
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return null
  return { user, company, admin: createAdminClient() }
}

export async function getSiteConfig() {
  const ctx = await getContext()
  if (!ctx) return null
  const { data } = await ctx.admin
    .from("website_config")
    .select("*")
    .eq("company_id", ctx.company.id)
    .single()
  return data
}

export async function getWebsitePhotos() {
  const ctx = await getContext()
  if (!ctx) return []
  const { data } = await ctx.admin
    .from("company_photos")
    .select("id, url, for_website, website_section")
    .eq("company_id", ctx.company.id)
    .eq("for_website", true)
    .order("created_at", { ascending: false })
  return data ?? []
}

export async function updateSiteField(field: string, value: unknown) {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  const { error } = await ctx.admin
    .from("website_config")
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq("company_id", ctx.company.id)

  if (error) return { error: error.message }
  revalidatePath(`/${ctx.company.slug}`)
  return { success: true }
}

export async function regenerateSection(section: "hero" | "about" | "services" | "tagline") {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  // Get current config and company info
  const { data: config } = await ctx.admin
    .from("website_config")
    .select("*")
    .eq("company_id", ctx.company.id)
    .single()

  const { data: company } = await ctx.admin
    .from("companies")
    .select("name, industry_category, sub_industry, city, state, vibe, description, different")
    .eq("id", ctx.company.id)
    .single()

  if (!config || !company) return { error: "Could not load site data" }

  const sectionPrompts: Record<string, string> = {
    hero: `You are a professional copywriter for small businesses. Write a hero section for a website.
Business: ${company.name}
Industry: ${company.industry_category} - ${company.sub_industry || ""}
Location: ${company.city || ""}, ${company.state || ""}
Description: ${company.description || ""}
What makes them different: ${company.different || ""}
Vibe: ${company.vibe || "bold"}

Return ONLY valid JSON with no markdown:
{"hero_title": "short punchy headline 4-7 words", "hero_subtitle": "1-2 sentence compelling description under 160 chars"}`,

    about: `You are a professional copywriter for small businesses. Write an about section.
Business: ${company.name}
Industry: ${company.industry_category} - ${company.sub_industry || ""}
Location: ${company.city || ""}, ${company.state || ""}
Description: ${company.description || ""}
What makes them different: ${company.different || ""}

Return ONLY valid JSON with no markdown:
{"about_text": "2-3 warm, authentic sentences about the business. Under 300 chars."}`,

    services: `You are a professional copywriter for small businesses. Rewrite these service descriptions to be more compelling.
Business: ${company.name}
Current services: ${JSON.stringify(config.services || [])}

Return ONLY valid JSON with no markdown:
{"services": [{"name": "service name", "description": "compelling 1-sentence description under 120 chars"}]}`,

    tagline: `You are a professional copywriter for small businesses. Write a tagline and CTA.
Business: ${company.name}
Industry: ${company.industry_category}
Vibe: ${company.vibe || "bold"}

Return ONLY valid JSON with no markdown:
{"tagline": "3-6 word memorable tagline", "cta_headline": "3-5 word action-oriented CTA"}`,
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 500,
        messages: [{ role: "user", content: sectionPrompts[section] }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ""

    // Parse JSON response
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    // Update the relevant fields
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.hero_title)   updates.hero_title = parsed.hero_title
    if (parsed.hero_subtitle) updates.hero_subtitle = parsed.hero_subtitle
    if (parsed.about_text)   updates.about_text = parsed.about_text
    if (parsed.services)     updates.services = parsed.services
    if (parsed.tagline)      updates.tagline = parsed.tagline
    if (parsed.cta_headline) updates.cta_headline = parsed.cta_headline

    await ctx.admin
      .from("website_config")
      .update(updates)
      .eq("company_id", ctx.company.id)

    revalidatePath(`/${ctx.company.slug}`)
    return { success: true, updates }
  } catch (err) {
    console.error("[regenerate]", err)
    return { error: "AI generation failed" }
  }
}

export async function assignPhotoToSection(photoId: string, section: string | null) {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  await ctx.admin
    .from("company_photos")
    .update({ website_section: section })
    .eq("id", photoId)
    .eq("company_id", ctx.company.id)

  revalidatePath(`/${ctx.company.slug}`)
  return { success: true }
}
