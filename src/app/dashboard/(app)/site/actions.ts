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

export async function updateSiteField(field: string, value: unknown) {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  const { error } = await ctx.admin
    .from("website_config")
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq("company_id", ctx.company.id)

  if (error) return { error: error.message }

  revalidatePath(`/${ctx.company.slug}`)
  revalidatePath(`/${ctx.company.slug}/gallery`)
  return { success: true }
}

export async function regenerateSection(section: "hero" | "about" | "services" | "tagline") {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

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
    hero: `You are a professional copywriter for small businesses. Write a hero section.
Business: ${company.name}
Industry: ${company.industry_category} - ${company.sub_industry || ""}
Location: ${company.city || ""}, ${company.state || ""}
Description: ${company.description || ""}
What makes them different: ${company.different || ""}
Vibe: ${company.vibe || "bold"}
Return ONLY valid JSON: {"hero_title": "short punchy headline 4-7 words", "hero_subtitle": "1-2 sentence description under 160 chars"}`,

    about: `You are a professional copywriter for small businesses. Write an about section.
Business: ${company.name}
Industry: ${company.industry_category} - ${company.sub_industry || ""}
Location: ${company.city || ""}, ${company.state || ""}
Description: ${company.description || ""}
What makes them different: ${company.different || ""}
Return ONLY valid JSON: {"about_text": "2-3 warm authentic sentences under 300 chars"}`,

    services: `You are a professional copywriter for small businesses. Rewrite these service descriptions.
Business: ${company.name}
Current services: ${JSON.stringify(config.services || [])}
Return ONLY valid JSON: {"services": [{"name": "service name", "description": "compelling 1-sentence description under 120 chars"}]}`,

    tagline: `You are a professional copywriter for small businesses. Write a tagline and CTA.
Business: ${company.name}
Industry: ${company.industry_category}
Vibe: ${company.vibe || "bold"}
Return ONLY valid JSON: {"tagline": "3-6 word memorable tagline", "cta_headline": "3-5 word action CTA"}`,
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
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.hero_title)    updates.hero_title = parsed.hero_title
    if (parsed.hero_subtitle) updates.hero_subtitle = parsed.hero_subtitle
    if (parsed.about_text)    updates.about_text = parsed.about_text
    if (parsed.services)      updates.services = parsed.services
    if (parsed.tagline)       updates.tagline = parsed.tagline
    if (parsed.cta_headline)  updates.cta_headline = parsed.cta_headline

    await ctx.admin.from("website_config").update(updates).eq("company_id", ctx.company.id)
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

  // Get the photo URL from company_photos
  const { data: photo } = await ctx.admin
    .from("company_photos")
    .select("id, url, storage_path")
    .eq("id", photoId)
    .eq("company_id", ctx.company.id)
    .single()

  if (!photo) return { error: "Photo not found" }

  // Update company_photos section tag
  await ctx.admin
    .from("company_photos")
    .update({ website_section: section })
    .eq("id", photoId)
    .eq("company_id", ctx.company.id)

  const isGallery = section === "gallery"
  const isHero = section === "hero"
  const isRemoving = section === null

  if (isGallery || isHero) {
    // Upsert into media table so public site picks it up
    const { data: existing } = await ctx.admin
      .from("media")
      .select("id")
      .eq("company_id", ctx.company.id)
      .eq("url", photo.url)
      .single()

    if (existing) {
      // Update existing media record
      await ctx.admin
        .from("media")
        .update({ website_flag: true })
        .eq("id", existing.id)
    } else {
      // Insert new media record
      await ctx.admin
        .from("media")
        .insert({
          company_id: ctx.company.id,
          url: photo.url,
          thumbnail_url: photo.url,
          type: "photo",
          filename: photo.storage_path?.split("/").pop() ?? "photo.jpg",
          website_flag: true,
          size_bytes: 0,
        })
    }
  } else if (isRemoving) {
    // Remove from media table (unflag)
    await ctx.admin
      .from("media")
      .update({ website_flag: false })
      .eq("company_id", ctx.company.id)
      .eq("url", photo.url)
  }

  // Revalidate both dashboard and public site
  revalidatePath(`/${ctx.company.slug}`)
  revalidatePath(`/${ctx.company.slug}/gallery`)
  revalidatePath("/")
  return { success: true }
}

export async function updateMenuItems(categories: { category: string; items: { name: string; description: string; price: string | null; photo_url?: string | null }[] }[]) {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  const { error } = await ctx.admin
    .from("website_config")
    .update({ menu_items: categories, updated_at: new Date().toISOString() })
    .eq("company_id", ctx.company.id)

  if (error) return { error: error.message }

  revalidatePath(`/${ctx.company.slug}/menu`)
  revalidatePath(`/${ctx.company.slug}`)
  return { success: true }
}

export async function uploadMenuItemPhoto(formData: FormData): Promise<{ url: string } | { error: string }> {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  const file = formData.get("file") as File | null
  if (!file) return { error: "No file" }

  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${ctx.company.id}/menu/${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error } = await ctx.admin.storage
    .from("company-assets")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (error) return { error: error.message }

  const { data: { publicUrl } } = ctx.admin.storage
    .from("company-assets")
    .getPublicUrl(path)

  revalidatePath(`/${ctx.company.slug}/menu`)
  return { url: publicUrl }
}

export async function connectCustomDomain(rawDomain: string): Promise<{
  success: boolean; domain?: string; verified?: boolean
  verificationRecords?: { type: string; host: string; value: string }[]
  error?: string
}> {
  const ctx = await getContext()
  if (!ctx) return { success: false, error: "Not authenticated" }

  const domain = rawDomain.trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "")

  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(domain)) {
    return { success: false, error: "Enter a valid domain (e.g. mybusiness.com)" }
  }

  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) return { success: false, error: "Domain connection not configured" }

  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: domain }),
  })
  const data = await res.json()

  if (!res.ok && res.status !== 409) {
    return { success: false, error: data.error?.message ?? "Failed to register domain" }
  }

  await ctx.admin.from("website_config")
    .update({ custom_domain: domain, updated_at: new Date().toISOString() })
    .eq("company_id", ctx.company.id)

  revalidatePath(`/${ctx.company.slug}`)

  return {
    success: true,
    domain,
    verified: data.verified ?? false,
    verificationRecords: (data.verification ?? []) as { type: string; host: string; value: string }[],
  }
}

export async function checkDomainStatus(domain: string): Promise<{ verified: boolean; error?: string }> {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) return { verified: false, error: "Not configured" }

  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains/${domain}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  const data = await res.json()
  if (!res.ok) return { verified: false, error: data.error?.message }
  return { verified: data.verified ?? false }
}

export async function disconnectDomain(domain: string): Promise<{ success: boolean; error?: string }> {
  const ctx = await getContext()
  if (!ctx) return { success: false, error: "Not authenticated" }

  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID

  if (token && projectId) {
    await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains/${domain}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  await ctx.admin.from("website_config")
    .update({ custom_domain: null, updated_at: new Date().toISOString() })
    .eq("company_id", ctx.company.id)

  revalidatePath(`/${ctx.company.slug}`)
  return { success: true }
}

export async function updatePrimaryIntent(intent: string) {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  const { error } = await ctx.admin
    .from("companies")
    .update({ primary_intent: intent })
    .eq("id", ctx.company.id)

  if (error) return { error: error.message }

  revalidatePath(`/${ctx.company.slug}`)
  revalidatePath(`/${ctx.company.slug}/reserve`)
  revalidatePath(`/${ctx.company.slug}/menu`)
  return { success: true }
}

export async function removeStockImage(imageUrl: string) {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  const { data: config } = await ctx.admin
    .from("website_config")
    .select("stock_images")
    .eq("company_id", ctx.company.id)
    .single()

  if (!config) return { error: "No config" }

  const current = (config.stock_images as string[]) ?? []
  const updated = current.filter(url => url !== imageUrl)

  await ctx.admin
    .from("website_config")
    .update({ stock_images: updated })
    .eq("company_id", ctx.company.id)

  revalidatePath(`/${ctx.company.slug}/gallery`)
  return { success: true }
}
