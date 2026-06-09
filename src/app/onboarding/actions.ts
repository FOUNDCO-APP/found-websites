"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { generateWebsiteContent } from "@/lib/contentGeneration"
import { getIndustryManifest } from "@/lib/industryManifests"

type OnboardingInput = {
  name: string
  description: string
  industry: string | null
  subIndustry: string
  location: string
  serviceAreas?: string[]
  phone: string
  email: string
  different: string
  services: string
  photoChoice: string
  logoChoice: string
  primaryColor: string
  vibe: string
  testimonials: string
}

type OnboardingResult = {
  success: boolean
  slug?: string
  url?: string
  error?: string
}

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || `found-${crypto.randomUUID().slice(0, 8)}`
}

async function uniqueSlug(base: string) {
  const supabase = getAdminClient()
  for (let i = 0; i < 20; i += 1) {
    const slug = i === 0 ? base : `${base}-${i + 1}`
    const { data } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()
    if (!data) return slug
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

function splitLocation(location: string) {
  const [cityRaw, stateRaw] = location.split(",").map((part) => part.trim())
  return {
    city: cityRaw || null,
    state: stateRaw?.split(/\s+/)[0] || null,
    serviceAreas: cityRaw ? [cityRaw] : [],
  }
}

function parseServices(input: string) {
  return input
    .split(/[,;\n]+/)
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((name) => ({
      name,
      description: `Professional ${name.toLowerCase()} tailored to each customer, with clear communication from the first conversation to the final result.`,
    }))
}

function parseTestimonials(input: string) {
  return input
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((line) => {
      const [namePart, ...quoteParts] = line.split(/\s[-:]\s/)
      const quote = quoteParts.join(" - ").trim()
      return {
        name: (namePart || "Happy Customer").trim(),
        role: "Customer",
        quote: quote || line,
      }
    })
}

function normalizeHex(value: string) {
  const trimmed = value.trim()
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : "#2E7D32"
}

function normalizeVibe(value: string) {
  return ["bold", "calm", "modern", "warm"].includes(value) ? value : "bold"
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "")
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0")).join("")}`
}

function mix(hex: string, target: "#000000" | "#ffffff", amount: number) {
  const sourceRgb = hexToRgb(hex)
  const targetRgb = hexToRgb(target)
  return rgbToHex({
    r: Math.round(sourceRgb.r + (targetRgb.r - sourceRgb.r) * amount),
    g: Math.round(sourceRgb.g + (targetRgb.g - sourceRgb.g) * amount),
    b: Math.round(sourceRgb.b + (targetRgb.b - sourceRgb.b) * amount),
  })
}

export async function createOnboardingSite(input: OnboardingInput): Promise<OnboardingResult> {
  const name = input.name.trim()
  const industry = input.industry
  const subIndustry = input.subIndustry.trim()
  const phone = input.phone.trim()
  const email = input.email.trim()
  const primaryColor = normalizeHex(input.primaryColor)
  const vibe = normalizeVibe(input.vibe)

  if (!name || !industry || !subIndustry || !phone || !email) {
    return { success: false, error: "Business name, business type, phone, and email are required." }
  }

  const manifest = getIndustryManifest(industry)
  if (!manifest) {
    return { success: false, error: "We could not match that business type yet." }
  }

  const supabase = getAdminClient()
  const companyId = crypto.randomUUID()
  const slug = await uniqueSlug(slugify(name))
  const { city, state, serviceAreas: derivedAreas } = splitLocation(input.location)
  const serviceAreas = input.serviceAreas?.length
    ? [...new Set([city, ...input.serviceAreas].filter(Boolean) as string[])]
    : derivedAreas
  const services = parseServices(input.services)
  const testimonials = parseTestimonials(input.testimonials)
  const generatedContent = await generateWebsiteContent({
    name,
    description: input.description.trim(),
    industry,
    subIndustry,
    city,
    state,
    different: input.different.trim(),
    services,
    vibe,
    manifest,
  })

  const { error: companyError } = await supabase
    .from("companies")
    .insert({
      id: companyId,
      name,
      slug,
      industry_category: industry,
      sub_industry: subIndustry,
      vibe,
      primary_intent: manifest.primaryIntent,
      secondary_intent: manifest.secondaryIntent,
      phone,
      email,
      city,
      state,
      logo_url: null,
      primary_color: primaryColor,
      accent_color_1: mix(primaryColor, "#000000", 0.22),
      accent_color_2: mix(primaryColor, "#ffffff", 0.72),
      photo_keywords: subIndustry,
      active: true,
    })

  if (companyError) {
    console.error("[onboarding] company insert error:", companyError.message)
    return { success: false, error: "We could not create the company record." }
  }

  const { error: configError } = await supabase
    .from("website_config")
    .insert({
      company_id: companyId,
      hero_title: generatedContent.heroTitle,
      hero_subtitle: generatedContent.heroSubtitle,
      hero_image_url: null,
      hero_video_url: null,
      about_text: generatedContent.aboutText,
      tagline: generatedContent.tagline,
      cta_headline: generatedContent.ctaHeadline,
      services: generatedContent.services,
      testimonials,
      service_areas: serviceAreas,
      social_links: {},
      custom_domain: null,
      published: true,
    })

  if (configError) {
    console.error("[onboarding] website_config insert error:", configError.message)
    return { success: false, error: "We created the company, but could not create the website content." }
  }

  return {
    success: true,
    slug,
    url: `https://${slug}.${ROOT_DOMAIN}`,
  }
}
