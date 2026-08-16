"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { generateWebsiteContent } from "@/lib/contentGeneration"
import { guardGeneratedCopyUniqueness } from "@/lib/copySimilarity"
import { loadCopySimilarityReferences } from "@/lib/copySimilaritySupabase"
import { getIndustryManifest } from "@/lib/industryManifests"
import { sendNewSignupAlert } from "@/lib/adminAlerts"
import { captureFoundOnboardingCompleted } from "@/lib/foundFunnelServer"
import { sendTrackedEmail } from "@/lib/emailLog"
import { defaultDisabledAddonsForIndustry } from "@/lib/featureAccess"

type OnboardingInput = {
  name: string
  description: string
  industry: string | null
  subIndustry: string
  location: string
  serviceAreas?: string[]
  phone: string
  email: string
  contactName?: string
  phoneVisible?: boolean
  emailVisible?: boolean
  leadPhone?: string
  leadEmail?: string
  different: string
  idealCustomer?: string
  serviceAreaNote?: string
  proofPoint?: string
  services: string
  photoChoice: string
  slugPreference?: string
  logoChoice: string
  logoUrl?: string
  logoWhiteUrl?: string
  navbarDark?: boolean
  heroImageUrls?: string[]
  companyId?: string
  primaryColor: string
  vibe: string
  testimonials: string
  plan?: string
  compToken?: string
}

type OnboardingResult = {
  success: boolean
  slug?: string
  url?: string
  companyId?: string
  error?: string
  comp?: boolean
  previewAllowed?: boolean
}

type ResumeBuiltSiteResult =
  | { success: true; slug: string; url: string; companyId: string; name: string; plan?: string; comp?: boolean; previewAllowed?: boolean }
  | { success: false; error: string }

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

import { slugify } from "@/lib/slugify"

async function uniqueSlug(base: string, city: string | null) {
  const supabase  = getAdminClient()
  const citySlug  = city ? slugify(city) : null
  const hex4      = () => Math.random().toString(16).slice(2, 6)

  // city makes a meaningful domain (doubleblur-tucson); industry does not
  const candidates = [
    base,
    citySlug ? `${base}-${citySlug}` : null,
    `${base}-${hex4()}`,
  ].filter((s): s is string => !!s)

  for (const slug of candidates) {
    const { data } = await supabase.from("companies").select("id").eq("slug", slug).maybeSingle()
    if (!data) return slug
  }
  return `${base}-${hex4()}`
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

  await sendTrackedEmail({
    to: trimmedEmail,
    subject: trimmedFirst ? `Your site is waiting, ${trimmedFirst}` : "Your site is waiting",
    html: buildSaveSpotEmail({ firstName: trimmedFirst, businessName, resumeUrl }),
    text: `Hey ${trimmedFirst || "there"},\n\nYou started building ${businessName ? `${businessName}'s website` : "your website"} — you were almost there.\n\nCome back when you're ready. It only takes a few more minutes.\n\n${resumeUrl}\n\n— The Found team`,
    recipientType: "prospect",
    emailType: "abandoned_onboarding_save",
    source: "onboarding/saveAbandonedLead",
    admin: supabase,
  })

  return { success: true }
}

export async function findBuiltSiteForResume(slugInput: string, emailInput: string): Promise<ResumeBuiltSiteResult> {
  const slug = slugInput.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48)
  const email = emailInput.trim().toLowerCase()

  if (!slug || !email.includes("@")) {
    return { success: false, error: "Enter the email you used to build this site." }
  }

  const supabase = getAdminClient()
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, slug, email, plan, is_comp, account_kind, subscription_status, preview_completed_at")
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    console.error("[onboarding] resume lookup error:", error.message)
    return { success: false, error: "We could not check that site yet. Try again." }
  }

  if (!company || String(company.email ?? "").trim().toLowerCase() !== email) {
    return { success: false, error: "That email does not match this site. Pick a different web address or use the original email." }
  }

  if (!company.preview_completed_at) {
    return { success: false, error: "That site was started, but it has not been built yet." }
  }

  if (["active", "trialing"].includes(String(company.subscription_status ?? ""))) {
    return { success: false, error: "That site is already active. Open your dashboard to manage it." }
  }

  return {
    success: true,
    companyId: company.id,
    name: company.name,
    slug: company.slug,
    url: `https://${company.slug}.${ROOT_DOMAIN}`,
    plan: company.plan ?? "found",
    comp: Boolean(company.is_comp),
    previewAllowed: company.account_kind === "test" || Boolean(company.is_comp),
  }
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
  const { city, state, serviceAreas: derivedAreas } = splitLocation(input.location)
  const preferredBase = input.slugPreference
    ? input.slugPreference.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48)
    : slugify(name)
  const slug = await uniqueSlug(preferredBase, city)
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
    idealCustomer: input.idealCustomer?.trim() || "",
    serviceAreaNote: input.serviceAreaNote?.trim() || "",
    proofPoint: input.proofPoint?.trim() || "",
    services,
    vibe,
    manifest,
  })
  const copyReferences = await loadCopySimilarityReferences(supabase)
  const guardedCopy = guardGeneratedCopyUniqueness(generatedContent, {
    name,
    description: input.description.trim(),
    industry,
    subIndustry,
    city,
    state,
    different: input.different.trim(),
    idealCustomer: input.idealCustomer?.trim() || "",
    serviceAreaNote: input.serviceAreaNote?.trim() || "",
    proofPoint: input.proofPoint?.trim() || "",
    services,
    vibe,
    manifest,
  }, copyReferences)
  const siteContent = guardedCopy.content
  if (guardedCopy.changed) {
    console.warn("[onboarding] copy similarity guard rewrote generated copy", {
      slug,
      matchedSlug: guardedCopy.match?.slug,
      field: guardedCopy.match?.field,
      score: guardedCopy.match?.score,
    })
  }

  // Comp link (?comp=<comp secret> on the onboarding URL): validated here,
  // server-side, against a dedicated secret - the client only ever carries
  // the raw value along, it never decides on its own whether comp applies.
  // Deliberately NOT process.env.ADMIN_KEY: that same key also unlocks
  // /admin/businesses and /admin/photos, so a leaked comp link used to be
  // able to grant full admin access, not just a free signup. This secret
  // can only ever comp a new company.
  const isComp = Boolean(input.compToken && process.env.COMP_LINK_SECRET && input.compToken === process.env.COMP_LINK_SECRET)

  // The account_kind column now defaults to 'test' at the database level
  // (safer than the old default of 'client', which silently mislabeled
  // every practice signup as a real customer with zero prompting to fix
  // it - the exact bug Shawn caught). That default is a safety net, not
  // the primary signal: every real customer signup needs to be explicitly
  // marked 'client' here, or they'd wrongly default to hidden-as-test too.
  // Shawn's own known emails are the one reliable signal that separates
  // "he's testing something" from "a real customer signed up."
  const ownerEmails = (process.env.OWNER_EMAILS || "shawnlopez@me.com").split(",").map(e => e.trim().toLowerCase()).filter(Boolean)
  const accountKind = ownerEmails.includes(email.trim().toLowerCase()) ? "test" : "client"

  const { error: companyError } = await supabase
    .from("companies")
    .insert({
      id: companyId,
      name,
      slug,
      account_kind: accountKind,
      client_state: accountKind === "client" ? "onboarding" : "active",
      industry_category: industry,
      sub_industry: subIndustry,
      vibe,
      primary_intent: manifest.primaryIntent,
      secondary_intent: manifest.secondaryIntent,
      phone,
      email,
      contact_name: input.contactName?.trim() || null,
      phone_visible: input.phoneVisible ?? true,
      email_visible: input.emailVisible ?? true,
      lead_phone: input.leadPhone?.trim() || null,
      lead_email: input.leadEmail?.trim() || null,
      city,
      state,
      // logo_url is for light backgrounds; logo_white_url is for dark backgrounds.
      logo_url: input.logoUrl ?? null,
      logo_white_url: input.logoWhiteUrl ?? null,
      navbar_dark: input.navbarDark ?? false,
      primary_color: primaryColor,
      accent_color_1: mix(primaryColor, "#000000", 0.22),
      accent_color_2: mix(primaryColor, "#ffffff", 0.72),
      photo_keywords: subIndustry,
      plan: ["found", "found_pro", "found_business"].includes(input.plan ?? "") ? input.plan : "found",
      // Only matters if/when this company is ever on found_business (see
      // getEffectiveAddons) - inert otherwise, so it's safe to always seed.
      disabled_addons: defaultDisabledAddonsForIndustry(industry ?? ""),
      active: true,
      preview_completed_at: new Date().toISOString(),
      ...(isComp ? { is_comp: true, subscription_status: "active" } : {}),
    })

  if (companyError) {
    console.error("[onboarding] company insert error:", companyError.message)
    return { success: false, error: "We could not create the company record." }
  }

  // Best-effort, fire-and-forget - never block onboarding on this.
  if (accountKind === "client") {
    void sendNewSignupAlert({ id: companyId, name, slug, plan: input.plan ?? "found", city, state })
  }

  const { error: configError } = await supabase
    .from("website_config")
    .insert({
      company_id: companyId,
      hero_title: siteContent.heroTitle,
      hero_subtitle: siteContent.heroSubtitle,
      hero_image_url: input.heroImageUrls?.[0] ?? null,
      hero_images: input.heroImageUrls ?? [],
      hero_video_url: null,
      about_text: siteContent.aboutText,
      about_preview: siteContent.aboutPreview,
      about_story: siteContent.aboutStory,
      about_highlights: siteContent.aboutHighlights,
      tagline: siteContent.tagline,
      cta_headline: siteContent.ctaHeadline,
      services: siteContent.services,
      testimonials,
      service_areas: serviceAreas,
      social_links: {},
      custom_domain: null,
      published: true,
      copy_generated: siteContent.copy_generated,
      faq_items: siteContent.faq_items,
    })

  if (configError) {
    console.error("[onboarding] website_config insert error:", configError.message)
    return { success: false, error: "We created the company, but could not create the website content." }
  }

  const siteUrl = `https://${slug}.${ROOT_DOMAIN}`

  await captureFoundOnboardingCompleted({
    company_id: companyId,
    slug,
    plan_name: input.plan ?? "found",
    industry,
  })

  // Create or find the auth user and link them to this company.
  // generateLink handles both cases: creates the user if they don't exist,
  // finds them if they do, and returns their user.id either way.
  // Generate magic link - creates auth user if needed and links it to the company.
  try {
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `https://my.${ROOT_DOMAIN}/auth/callback` },
    })
    if (linkError) {
      console.error("[onboarding] generateLink error:", linkError.message)
    } else {
      if (linkData?.user?.id) {
        await supabase.from("companies").update({ user_id: linkData.user.id }).eq("id", companyId)
      }
    }
  } catch (err) {
    console.error("[onboarding] auth setup error:", err)
  }

  return {
    success: true,
    slug,
    url: siteUrl,
    companyId,
    comp: isComp,
    previewAllowed: accountKind === "test" || isComp,
  }
}
