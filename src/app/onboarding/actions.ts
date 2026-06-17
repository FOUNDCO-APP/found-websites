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
}

type OnboardingResult = {
  success: boolean
  slug?: string
  url?: string
  companyId?: string
  error?: string
}

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
      // When both logos are provided: swap so logo_url = light-bg version, logo_white_url = dark-bg version
      logo_url: input.logoWhiteUrl ? input.logoWhiteUrl : (input.logoUrl ?? null),
      logo_white_url: input.logoWhiteUrl ? (input.logoUrl ?? null) : null,
      navbar_dark: input.navbarDark ?? false,
      primary_color: primaryColor,
      accent_color_1: mix(primaryColor, "#000000", 0.22),
      accent_color_2: mix(primaryColor, "#ffffff", 0.72),
      photo_keywords: subIndustry,
      plan: ["found", "found_pro", "found_business"].includes(input.plan ?? "") ? input.plan : "found",
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
      hero_image_url: input.heroImageUrls?.[0] ?? null,
      hero_images: input.heroImageUrls ?? [],
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

  const siteUrl = `https://${slug}.${ROOT_DOMAIN}`
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? `https://${ROOT_DOMAIN}`

  // Create or find the auth user and link them to this company.
  // generateLink handles both cases: creates the user if they don't exist,
  // finds them if they do — and returns their user.id either way.
  try {
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `https://my.${ROOT_DOMAIN}/auth/callback` },
    })
    if (linkError) {
      console.error("[onboarding] generateLink error:", linkError.message)
    } else if (linkData?.user?.id) {
      await supabase.from("companies").update({ user_id: linkData.user.id }).eq("id", companyId)
    }
  } catch (err) {
    console.error("[onboarding] auth setup error:", err)
  }

  const loginUrl = `https://my.${ROOT_DOMAIN}/login`

  // Fire-and-forget welcome email — failure doesn't block site creation
  resend.emails.send({
    from:    "Found <hello@foundco.app>",
    replyTo: "hello@foundco.app",
    to:      email,
    subject: `${name} is live.`,
    html:    buildWelcomeEmail({ name, siteUrl, slug, appUrl, loginUrl }),
    text:    `${name} is live.\n\nYour customers can find you now.\n\n→ ${siteUrl}\n\n───\n\n1. Pin it.\nAdd your link to your Instagram bio and Google Business profile today.\n\n2. Connect your domain.\nPoint your real domain here — takes 10 minutes.\n${appUrl}/connect-domain?slug=${slug}\n\n3. Send it to one person.\nYour best customer. Right now. See what they say.\n\n4. View your dashboard.\n${loginUrl}\n\n───\n\nReply to this email — we read every one.\n— The Found Team`,
  }).catch((err: unknown) => console.error("[Resend] welcome email error:", err))

  return {
    success: true,
    slug,
    url: siteUrl,
    companyId,
  }
}

function buildWelcomeEmail({
  name,
  siteUrl,
  slug,
  appUrl,
  loginUrl,
}: {
  name: string
  siteUrl: string
  slug: string
  appUrl: string
  loginUrl: string
}) {
  const displayUrl = siteUrl.replace("https://", "")
  const connectUrl = `${appUrl}/connect-domain?slug=${slug}`

  const step = (n: string, title: string, body: string, link?: { href: string; label: string }) => `
    <tr>
      <td style="padding:0 0 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="4" style="background:#32D074;border-radius:4px;">&nbsp;</td>
            <td width="16">&nbsp;</td>
            <td>
              <p style="margin:0 0 3px;font-size:11px;font-weight:800;letter-spacing:2px;color:#32D074;">${n}</p>
              <p style="margin:0 0 4px;font-size:16px;font-weight:900;color:#111111;line-height:1.3;">${title}</p>
              <p style="margin:0${link ? " 0 10px" : ""};font-size:14px;color:#666666;line-height:1.6;">${body}</p>
              ${link ? `<a href="${link.href}" style="font-size:13px;font-weight:900;color:#080A09;text-decoration:none;border-bottom:2px solid #32D074;padding-bottom:1px;">${link.label} →</a>` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${name} is live.</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <!-- Preheader: controls inbox preview text — hidden from view -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f2f2f0;">${name} is live. Your next steps are waiting — open to see them.&nbsp;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;">

        <!-- FOUND wordmark header -->
        <tr>
          <td style="background:#080A09;border-radius:16px 16px 0 0;padding:28px 36px;text-align:center;">
            <span style="font-size:22px;font-weight:200;color:#ffffff;letter-spacing:10px;text-transform:uppercase;">FOUND</span>
          </td>
        </tr>

        <!-- Hero: business name + moment -->
        <tr>
          <td style="background:#ffffff;padding:44px 36px 36px;text-align:center;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#32D074;">Live now</p>
            <h1 style="margin:0 0 10px;font-size:32px;font-weight:900;color:#080A09;line-height:1.1;">${name} is live.</h1>
            <p style="margin:0 0 32px;font-size:16px;font-weight:400;color:#777777;line-height:1.5;">Your customers can find you now.</p>
            <a href="${siteUrl}"
              style="display:block;background:#32D074;color:#080A09;font-size:15px;font-weight:900;padding:18px 24px;border-radius:50px;text-decoration:none;letter-spacing:0.04em;">
              Open your site →
            </a>
            <a href="${loginUrl}"
              style="display:block;margin-top:10px;background:transparent;color:#32D074;font-size:13px;font-weight:700;padding:14px 24px;border-radius:50px;text-decoration:none;letter-spacing:0.04em;border:1.5px solid #32D07440;">
              Go to your dashboard →
            </a>
            <p style="margin:12px 0 0;font-size:12px;color:#aaaaaa;">${displayUrl}</p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="background:#ffffff;padding:0 36px;"><div style="height:1px;background:#eeeeee;"></div></td></tr>

        <!-- Three steps -->
        <tr>
          <td style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px 36px 36px;">
            <p style="margin:0 0 24px;font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#bbbbbb;">Do these three things</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${step("01", "Pin it.", "Add your link to your Instagram bio and Google Business profile today. That's where your next customer is looking.")}
              ${step("02", "Connect your domain.", "Point your real domain here — takes about 10 minutes.", { href: connectUrl, label: "Connect now" })}
              ${step("03", "Send it to one person.", "Your best customer. Right now. See what they say.")}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 0 8px;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;color:#999999;">Reply to this email — we read every one.</p>
            <p style="margin:0;font-size:13px;font-weight:700;color:#555555;">— The Found Team</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
