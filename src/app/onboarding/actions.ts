"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { generateWebsiteContent } from "@/lib/contentGeneration"
import { getIndustryManifest } from "@/lib/industryManifests"

const resend = new Resend(process.env.RESEND_API_KEY)

type OnboardingInput = {
  name: string
  description: string
  industry: string | null
  subIndustry: string
  location: string
  serviceAreas?: string[]
  phone: string
  email: string
  phoneVisible?: boolean
  emailVisible?: boolean
  leadPhone?: string
  leadEmail?: string
  different: string
  services: string
  photoChoice: string
  logoChoice: string
  logoUrl?: string
  heroImageUrl?: string
  companyId?: string
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

export async function saveAbandonedLead({
  firstName,
  email,
  businessName,
  stepAbandoned,
  partialAnswers,
}: {
  firstName: string
  email: string
  businessName?: string
  stepAbandoned: string
  partialAnswers: Record<string, unknown>
}): Promise<{ success: boolean; error?: string }> {
  const trimmedEmail = email.trim()
  const trimmedFirst = firstName.trim()

  if (!trimmedEmail.includes("@")) {
    return { success: false, error: "Valid email required." }
  }

  const supabase = getAdminClient()

  await supabase
    .from("leads")
    .insert({
      company_id: null,
      name: trimmedFirst || "Unknown",
      email: trimmedEmail,
      phone: null,
      reply_token: crypto.randomUUID(),
      type: "onboarding_abandoned",
      partial_answers: {
        ...partialAnswers,
        businessName: businessName ?? null,
        stepAbandoned,
      },
    })
    .then(({ error }) => {
      if (error) console.error("[onboarding] abandoned lead insert:", error.message)
    })

  const resumeUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://foundco.app"}/?start=1`

  await resend.emails.send({
    from: "Found <hello@foundco.app>",
    to: trimmedEmail,
    subject: trimmedFirst ? `Your site is waiting, ${trimmedFirst}` : "Your site is waiting",
    html: buildSaveSpotEmail({ firstName: trimmedFirst, businessName, resumeUrl }),
    text: `Hey ${trimmedFirst || "there"},\n\nYou started building ${businessName ? `${businessName}'s website` : "your website"} — you were almost there.\n\nCome back when you're ready. It only takes a few more minutes.\n\n${resumeUrl}\n\n— The Found team`,
  }).catch((err: unknown) => console.error("[Resend] save-spot email error:", err))

  return { success: true }
}

function buildSaveSpotEmail({
  firstName,
  businessName,
  resumeUrl,
}: {
  firstName: string
  businessName?: string
  resumeUrl: string
}) {
  const greeting = firstName || "there"
  const ctx = businessName ? `${businessName}'s website` : "your website"
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#080A09;padding:32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#32D074;">Your spot is saved</p>
            <h1 style="margin:0;font-size:28px;font-weight:300;color:#ffffff;letter-spacing:6px;">FOUND</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 36px;">
            <p style="margin:0 0 20px;font-size:17px;font-weight:800;color:#111111;">Hey ${greeting},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#444444;line-height:1.75;">You started building ${ctx} — you were almost there.</p>
            <p style="margin:0 0 32px;font-size:15px;color:#444444;line-height:1.75;">Come back when you're ready. It only takes a few more minutes, and your site will be live the same day.</p>
            <a href="${resumeUrl}" style="display:inline-block;background:#32D074;color:#080A09;font-size:14px;font-weight:900;padding:16px 36px;border-radius:50px;text-decoration:none;">Finish building my site →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#bbbbbb;">Powered by <a href="https://foundco.app" style="color:#bbbbbb;text-decoration:underline;">Found</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
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
    const missing = [!name && "name", !industry && "industry", !subIndustry && "subIndustry", !phone && "phone", !email && "email"].filter(Boolean)
    console.error("[onboarding] missing fields:", missing)
    return { success: false, error: `Missing: ${missing.join(", ")}. Please go back and complete those steps.` }
  }

  const manifest = getIndustryManifest(industry)
  if (!manifest) {
    return { success: false, error: "We could not match that business type yet." }
  }

  const supabase = getAdminClient()
  const companyId = input.companyId || crypto.randomUUID()
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
      phone_visible: input.phoneVisible ?? true,
      email_visible: input.emailVisible ?? true,
      lead_phone: input.leadPhone?.trim() || null,
      lead_email: input.leadEmail?.trim() || null,
      city,
      state,
      logo_url: input.logoUrl ?? null,
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
      hero_image_url: input.heroImageUrl ?? null,
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
      copy_generated: generatedContent.copy_generated,
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
