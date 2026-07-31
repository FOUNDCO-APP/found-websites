"use server"

import * as Sentry from "@sentry/nextjs"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { polishMenuCategories, polishTitle, polishWebsiteField, polishWebsiteUpdates } from "@/lib/copyPolish"
import { isVideoMedia, mediaKindFromUrl } from "@/lib/mediaKind"
import { checkPublicRateLimit, publicRateLimitMessage } from "@/lib/security/rateLimit"
import { createWhiteLogoVariant } from "@/lib/logoVariants"
import type { MenuCategory } from "@/types/company"


type SiteConfigRecord = Record<string, unknown>
type CompanyCopyContext = {
  name: string | null
  industry_category: string | null
  sub_industry: string | null
  city: string | null
  state: string | null
  vibe: string | null
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function locationLine(company: CompanyCopyContext) {
  return [company.city, company.state].filter(Boolean).join(", ")
}

function serviceList(config: SiteConfigRecord) {
  const services = Array.isArray(config.services) ? config.services : []
  return services
    .map(service => {
      if (!service || typeof service !== "object") return null
      const row = service as { name?: unknown; description?: unknown }
      return {
        name: polishTitle(row.name, "Service"),
        description: cleanText(row.description, "Thoughtful service shaped around what you need."),
      }
    })
    .filter(Boolean) as { name: string; description: string }[]
}

function fallbackRewrite(section: "hero" | "about" | "services" | "tagline", company: CompanyCopyContext, config: SiteConfigRecord) {
  const name = polishTitle(company.name, "This business")
  const industry = cleanText(company.sub_industry, cleanText(company.industry_category, "local business")).replace(/_/g, " ")
  const industryLabel = polishTitle(industry)
  const place = locationLine(company)
  const placeSuffix = place ? ` in ${place}` : ""

  if (section === "hero") {
    return {
      hero_title: `${name}, made simple`,
      hero_subtitle: `A sharper ${industry} experience${placeSuffix}, built around clear service and easy next steps.`,
    }
  }

  if (section === "about") {
    return {
      about_text: `${name} helps customers get what they need without friction. Every detail is handled with care, clear communication, and a focus on making the next step feel easy.`,
    }
  }

  if (section === "services") {
    const services = serviceList(config)
    return {
      services: (services.length ? services : [{ name: industryLabel, description: "Professional help shaped around what matters most." }]).map(service => ({
        name: service.name,
        description: `${service.name} handled with clear communication, careful work, and an easy path from first question to finished result.`,
      })),
    }
  }

  return {
    tagline: "Clear. Local. Ready.",
    cta_headline: "Start now",
  }
}

function pickUpdates(parsed: Record<string, unknown>) {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof parsed.hero_title === "string") updates.hero_title = parsed.hero_title
  if (typeof parsed.hero_subtitle === "string") updates.hero_subtitle = parsed.hero_subtitle
  if (typeof parsed.about_text === "string") updates.about_text = parsed.about_text
  if (Array.isArray(parsed.services)) updates.services = parsed.services
  if (typeof parsed.tagline === "string") updates.tagline = parsed.tagline
  if (typeof parsed.cta_headline === "string") updates.cta_headline = parsed.cta_headline
  return updates
}
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

  const copyContext = {
    businessName: ctx.company.name,
    industry: ctx.company.industry_category,
    subIndustry: ctx.company.sub_industry,
    city: ctx.company.city,
    state: ctx.company.state,
  }
  const polishedValue = polishWebsiteField(field, value, copyContext)

  const { error } = await ctx.admin
    .from("website_config")
    .update({ [field]: polishedValue, updated_at: new Date().toISOString() })
    .eq("company_id", ctx.company.id)

  if (error) return { error: error.message }

  revalidatePath(`/${ctx.company.slug}`)
  revalidatePath(`/${ctx.company.slug}/gallery`)
  revalidatePath(`/${ctx.company.slug}/contact`)
  return { success: true }
}

export async function regenerateSection(section: "hero" | "about" | "services" | "tagline") {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  // AI Rewrite had no cap at all - each tap is a real, billed Anthropic API
  // call, and the button could be hammered indefinitely. 15/hour is generous
  // for genuine iterative use (a few tries per section, per page) while
  // capping runaway cost from a stuck button or a bad actor.
  const limit = checkPublicRateLimit(await headers(), { key: `ai-rewrite:${ctx.company.id}`, limit: 15, windowMs: 60 * 60 * 1000 })
  if (!limit.allowed) return { error: publicRateLimitMessage(limit) }

  const { data: config } = await ctx.admin
    .from("website_config")
    .select("*")
    .eq("company_id", ctx.company.id)
    .single()

  const { data: company } = await ctx.admin
    .from("companies")
    .select("name, industry_category, sub_industry, city, state, vibe")
    .eq("id", ctx.company.id)
    .single()

  if (!config || !company) return { error: "Could not load site data" }

  const sectionPrompts: Record<string, string> = {
    hero: `You are a professional copywriter for small businesses. Write a hero section.
Business: ${company.name}
Industry: ${company.industry_category} - ${company.sub_industry || ""}
Location: ${company.city || ""}, ${company.state || ""}
Vibe: ${company.vibe || "bold"}
Return ONLY valid JSON: {"hero_title": "short punchy headline 4-7 words", "hero_subtitle": "1-2 sentence description under 160 chars"}`,

    about: `You are a professional copywriter for small businesses. Write an about section.
Business: ${company.name}
Industry: ${company.industry_category} - ${company.sub_industry || ""}
Location: ${company.city || ""}, ${company.state || ""}
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

  let generated: Record<string, unknown> | null = null

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [{ role: "user", content: sectionPrompts[section] }],
        }),
      })

      if (!response.ok) {
        const body = await response.text().catch(() => "")
        throw new Error(`Anthropic ${response.status}: ${body.slice(0, 300)}`)
      }
      const data = await response.json()
      const text = data.content?.[0]?.text ?? ""
      const clean = text.replace(/```json|```/g, "").trim()
      generated = JSON.parse(clean)
    } catch (err) {
      console.error("[regenerate] AI fallback used", err)
      Sentry.captureException(err, { tags: { area: "regenerateSection" }, extra: { section, companyId: ctx.company.id } })
    }
  }

  // If the real AI call failed or returned something unparsable, `generated`
  // stays null and this silently falls back to a generic template - the
  // owner used to have no way to know their "AI rewrite" wasn't actually
  // written for their business. usedFallback lets the caller tell them.
  const usedFallback = generated === null
  const updates = polishWebsiteUpdates(pickUpdates(generated ?? fallbackRewrite(section, company, config)), {
    businessName: company.name,
    industry: company.industry_category,
    subIndustry: company.sub_industry,
    city: company.city,
    state: company.state,
  })
  const { error } = await ctx.admin.from("website_config").update(updates).eq("company_id", ctx.company.id)
  if (error) return { error: error.message }

  revalidatePath(`/${ctx.company.slug}`)
  revalidatePath("/dashboard/site")
  return { success: true, updates, usedFallback }
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

  const isGallery = section === "gallery"
  const isHero = section === "hero"
  const isRemoving = section === null

  if (isHero) {
    await ctx.admin
      .from("company_photos")
      .update({ website_section: null })
      .eq("company_id", ctx.company.id)
      .eq("website_section", "hero")
  }

  // Update company_photos section tag
  await ctx.admin
    .from("company_photos")
    .update({ website_section: section })
    .eq("id", photoId)
    .eq("company_id", ctx.company.id)

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
          type: mediaKindFromUrl(photo.url),
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

  const { data: config } = await ctx.admin
    .from("website_config")
    .select("hero_images, hero_image_url, hero_video_url")
    .eq("company_id", ctx.company.id)
    .single()

  const currentHeroImages = Array.isArray(config?.hero_images)
    ? (config.hero_images as unknown[]).filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    : []

  if (isHero) {
    if (isVideoMedia(photo.url)) {
      await ctx.admin
        .from("website_config")
        .update({ hero_video_url: photo.url, hero_image_url: null, updated_at: new Date().toISOString() })
        .eq("company_id", ctx.company.id)
    } else {
      const heroImages = [photo.url, ...currentHeroImages.filter(url => url !== photo.url)]
      await ctx.admin
        .from("website_config")
        .update({ hero_image_url: photo.url, hero_video_url: null, hero_images: heroImages, updated_at: new Date().toISOString() })
        .eq("company_id", ctx.company.id)
    }
  } else if (isRemoving) {
    const heroImages = currentHeroImages.filter(url => url !== photo.url)
    if (config?.hero_image_url === photo.url || currentHeroImages.includes(photo.url)) {
      await ctx.admin
        .from("website_config")
        .update({ hero_image_url: heroImages[0] ?? null, hero_video_url: config?.hero_video_url === photo.url ? null : config?.hero_video_url ?? null, hero_images: heroImages, updated_at: new Date().toISOString() })
        .eq("company_id", ctx.company.id)
    }
  }

  // Revalidate both dashboard and public site
  revalidatePath(`/${ctx.company.slug}`)
  revalidatePath(`/${ctx.company.slug}/about`)
  revalidatePath(`/${ctx.company.slug}/services`)
  revalidatePath(`/${ctx.company.slug}/menu`)
  revalidatePath(`/${ctx.company.slug}/shop`)
  revalidatePath(`/${ctx.company.slug}/gallery`)
  revalidatePath(`/${ctx.company.slug}/contact`)
  revalidatePath("/dashboard/site")
  revalidatePath("/")
  return { success: true }
}


export async function clearHeroPhoto() {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  await ctx.admin
    .from("company_photos")
    .update({ website_section: null })
    .eq("company_id", ctx.company.id)
    .eq("website_section", "hero")

  const { error } = await ctx.admin
    .from("website_config")
    .update({ hero_image_url: null, hero_video_url: null, hero_images: [], updated_at: new Date().toISOString() })
    .eq("company_id", ctx.company.id)

  if (error) return { error: error.message }

  revalidatePath(`/${ctx.company.slug}`)
  revalidatePath(`/${ctx.company.slug}/about`)
  revalidatePath(`/${ctx.company.slug}/services`)
  revalidatePath(`/${ctx.company.slug}/menu`)
  revalidatePath(`/${ctx.company.slug}/shop`)
  revalidatePath(`/${ctx.company.slug}/gallery`)
  revalidatePath("/dashboard/site")
  revalidatePath("/")
  return { success: true }
}

export async function updateMenuItems(categories: MenuCategory[]) {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  const { error } = await ctx.admin
    .from("website_config")
    .update({ menu_items: polishMenuCategories(categories), updated_at: new Date().toISOString() })
    .eq("company_id", ctx.company.id)

  if (error) return { error: error.message }

  revalidatePath(`/${ctx.company.slug}/menu`)
  revalidatePath(`/${ctx.company.slug}/shop`)
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
  revalidatePath(`/${ctx.company.slug}/shop`)
  return { url: publicUrl }
}

// Vercel tracks two separate things for a domain: whether this project owns
// the claim to it (the /domains endpoint's `verified`), and whether its DNS
// actually points at Vercel (the /domains/{domain}/config endpoint's
// `misconfigured`). Found used to treat the first as "Live" - a domain with
// zero DNS changes could read `verified: true` immediately since nobody else
// had a conflicting claim on it, so the dashboard said "Live" while the site
// was not reachable there at all. This helper is the one place both signals
// get combined; "live" requires both. Any failure to positively confirm
// "not misconfigured" fails closed - reported as not-live, never as an
// ambiguous pass. Short in-memory cache so an owner with two tabs open (or
// the 20s poll firing close to a manual "Check Connection" tap) doesn't
// double the Vercel calls for the same domain within the same few seconds.
type DomainStatus = { ownershipVerified: boolean; misconfigured: boolean; error?: string }
const domainStatusCache = new Map<string, { data: DomainStatus; expiresAt: number }>()
const DOMAIN_STATUS_CACHE_MS = 12000

async function getVercelDomainStatus(domain: string): Promise<DomainStatus> {
  const cached = domainStatusCache.get(domain)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) return { ownershipVerified: false, misconfigured: true, error: "Not configured" }

  let result: DomainStatus
  try {
    const [domainRes, configRes] = await Promise.all([
      fetch(`https://api.vercel.com/v10/projects/${projectId}/domains/${domain}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      }),
      fetch(`https://api.vercel.com/v6/domains/${domain}/config`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      }),
    ])

    if (!domainRes.ok || !configRes.ok) {
      const errSource = !domainRes.ok ? domainRes : configRes
      const errData = await errSource.json().catch(() => ({}))
      result = { ownershipVerified: false, misconfigured: true, error: errData.error?.message ?? "Couldn't check domain status" }
    } else {
      const domainData = await domainRes.json()
      const configData = await configRes.json()
      result = {
        ownershipVerified: domainData.verified ?? false,
        // Fail closed: only a explicit `false` counts as correctly configured.
        misconfigured: configData.misconfigured !== false,
      }
    }
  } catch {
    result = { ownershipVerified: false, misconfigured: true, error: "Couldn't reach Vercel" }
  }

  domainStatusCache.set(domain, { data: result, expiresAt: Date.now() + DOMAIN_STATUS_CACHE_MS })
  return result
}

function isDomainLive(status: DomainStatus) {
  return status.ownershipVerified && !status.misconfigured
}

export async function connectCustomDomain(rawDomain: string): Promise<{
  success: boolean; domain?: string; verified?: boolean; misconfigured?: boolean
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

  domainStatusCache.delete(domain) // just changed - never serve a stale cached status right after connecting
  const status = await getVercelDomainStatus(domain)

  return {
    success: true,
    domain,
    verified: isDomainLive(status),
    misconfigured: status.misconfigured,
    verificationRecords: (data.verification ?? []) as { type: string; host: string; value: string }[],
  }
}

export async function checkDomainStatus(domain: string): Promise<{ verified: boolean; misconfigured: boolean; error?: string }> {
  const status = await getVercelDomainStatus(domain)
  return { verified: isDomainLive(status), misconfigured: status.misconfigured, error: status.error }
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

  domainStatusCache.delete(domain)
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

// Business Info lives on the companies table, not website_config - these are
// used sitewide (footer, nav, every page), not scoped to one page's copy.
// Explicit allowlist on purpose: this table also holds plan/subscription/
// Stripe fields that must never be reachable through a generic field setter.
const COMPANY_FIELD_ALLOWLIST = new Set(["name", "phone", "email", "city", "state"])

export async function updateCompanyLogo(formData: FormData): Promise<{ url: string; whiteUrl: string | null } | { error: string }> {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  const file = formData.get("file") as File | null
  if (!file || !file.size) return { error: "No file selected." }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png"
  const allowed = ["png", "jpg", "jpeg", "webp", "svg", "gif"]
  if (!allowed.includes(ext)) return { error: "PNG, JPG, WEBP, or SVG only." }
  if (file.size > 5 * 1024 * 1024) return { error: "File must be under 5 MB." }

  const bytes = await file.arrayBuffer()
  // Cache-bust: same filename every re-upload would otherwise keep serving
  // a stale cached image at the same URL after a replace.
  const path = `logos/${ctx.company.id}/logo-${Date.now()}.${ext}`

  const { error } = await ctx.admin.storage
    .from("company-assets")
    .upload(path, bytes, { contentType: file.type, upsert: true })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = ctx.admin.storage.from("company-assets").getPublicUrl(path)

  let whiteUrl: string | null = null
  const whiteBytes = await createWhiteLogoVariant(bytes, file.type)
  if (whiteBytes) {
    const whitePath = `logos/${ctx.company.id}/logo-white-${Date.now()}.png`
    const { error: whiteError } = await ctx.admin.storage
      .from("company-assets")
      .upload(whitePath, whiteBytes, { contentType: "image/png", upsert: true })
    if (!whiteError) {
      whiteUrl = ctx.admin.storage.from("company-assets").getPublicUrl(whitePath).data.publicUrl
    }
  }

  const { error: dbError } = await ctx.admin
    .from("companies")
    .update({ logo_url: publicUrl, logo_white_url: whiteUrl })
    .eq("id", ctx.company.id)
  if (dbError) return { error: dbError.message }

  revalidatePath(`/${ctx.company.slug}`)
  revalidatePath(`/${ctx.company.slug}/about`)
  revalidatePath(`/${ctx.company.slug}/contact`)
  revalidatePath(`/${ctx.company.slug}/services`)
  revalidatePath(`/${ctx.company.slug}/menu`)
  revalidatePath(`/${ctx.company.slug}/shop`)
  revalidatePath(`/${ctx.company.slug}/gallery`)
  revalidatePath("/dashboard/site")
  return { url: publicUrl, whiteUrl }
}

export async function updateCompanyField(field: string, value: string) {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }
  if (!COMPANY_FIELD_ALLOWLIST.has(field)) return { error: "Field not editable" }

  const { error } = await ctx.admin
    .from("companies")
    .update({ [field]: value.trim() || null })
    .eq("id", ctx.company.id)

  if (error) return { error: error.message }

  revalidatePath(`/${ctx.company.slug}`)
  revalidatePath(`/${ctx.company.slug}/contact`)
  return { success: true }
}
