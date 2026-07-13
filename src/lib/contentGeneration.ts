import { polishSentence, polishServices, polishShortCopy, polishTitle } from "@/lib/copyPolish"
import type { IndustryManifest } from "@/lib/industryManifests"
import { getWebsiteJob, type WebsiteJob } from "@/lib/subIndustryVocabulary"

type ServiceItem = {
  name: string
  description: string
}

export type ContentGenerationInput = {
  name: string
  description: string
  industry: string
  subIndustry: string
  city: string | null
  state: string | null
  different: string
  services: ServiceItem[]
  vibe: string
  manifest: IndustryManifest
}

export type GeneratedWebsiteContent = {
  heroTitle: string
  heroSubtitle: string
  aboutText: string
  tagline: string | null
  ctaHeadline: string | null
  services: ServiceItem[]
  copy_generated: boolean
  faq_items: { q: string; a: string }[] | null
}

type ClaudeMessageResponse = {
  content?: Array<{ type: string; text?: string }>
}

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages"
const ANTHROPIC_VERSION = "2023-06-01"
const DEFAULT_MODEL = "claude-haiku-4-5"

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function limit(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback
  const cleaned = compact(value)
  if (!cleaned) return fallback
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trim()}...` : cleaned
}

function serviceFallback(name: string) {
  return `Professional ${polishTitle(name).toLowerCase()} with clear communication, careful work, and a simple next step.`
}

function parseGeneratedJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced?.[1]?.trim() || trimmed
  try {
    const parsed = JSON.parse(candidate)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function sanitizeServices(value: unknown, fallback: ServiceItem[]) {
  if (!Array.isArray(value)) return fallback

  const generated = value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const fallbackName = fallback[index]?.name || "Service"
      const name = polishTitle(limit(record.name, fallbackName, 60), fallbackName)
      return {
        name,
        description: polishSentence(limit(record.description, serviceFallback(name), 180), serviceFallback(name)),
      }
    })
    .filter(Boolean) as ServiceItem[]

  if (!generated.length) return fallback
  return fallback.map((service, index) => generated[index] || service)
}

function sanitizeFaqItems(value: unknown): { q: string; a: string }[] | null {
  if (!Array.isArray(value)) return null
  const items = value
    .slice(0, 3)
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const q = typeof record.q === "string" ? polishShortCopy(compact(record.q).slice(0, 160)).replace(/[.]+$/, "") : null
      const a = typeof record.a === "string" ? polishSentence(compact(record.a).slice(0, 300)) : null
      if (!q || !a) return null
      return { q: /[?]$/.test(q) ? q : `${q}?`, a }
    })
    .filter((x): x is { q: string; a: string } => x !== null)
  return items.length > 0 ? items : null
}

function buildJobFamilyCopy(
  name: string,
  industryLabel: string,
  cityLabel: string,
  locationPhrase: string,
  differentiator: string | null,
  job: WebsiteJob,
): { heroSubtitle: string; aboutText: string; ctaHeadline: string } {
  const ind = industryLabel.toLowerCase()
  const diff = differentiator
    ? differentiator.charAt(0).toUpperCase() + differentiator.slice(1).replace(/\.?\s*$/, ".") + " "
    : ""

  switch (job) {
    case "book_me":
      return {
        heroSubtitle: `${industryLabel} in ${cityLabel}. Book online — easy scheduling, real results.`,
        aboutText: `${name} is a locally owned ${ind} in ${locationPhrase}. ${diff}We take care of every detail so you can enjoy the experience.`,
        ctaHeadline: "Ready to book?",
      }
    case "hire_me":
      return {
        heroSubtitle: `Trusted ${ind} serving ${cityLabel}. We show up, do the work right, and stand behind it.`,
        aboutText: `${name} serves ${locationPhrase} with dependable ${ind} work. ${diff}We show up on time, do the job right, and leave things better than we found them.`,
        ctaHeadline: "Get your free estimate",
      }
    case "quote_me":
      return {
        heroSubtitle: `Fast, honest estimates from ${cityLabel}'s trusted ${ind} team.`,
        aboutText: `${name} is ${locationPhrase}'s go-to ${ind}. ${diff}We give straight answers and fair prices — no guesswork, no surprises.`,
        ctaHeadline: "Request a free quote",
      }
    case "visit_me":
      return {
        heroSubtitle: `Your local ${ind} in ${cityLabel}. Come see what we're all about.`,
        aboutText: `${name} is a locally owned ${ind} in ${locationPhrase}. ${diff}We're proud of what we do and even prouder of the people we do it for.`,
        ctaHeadline: "Come see us",
      }
    case "order_from_me":
      return {
        heroSubtitle: `Fresh ${ind} from ${cityLabel}. Made with care in every order.`,
        aboutText: `${name} is a small-batch ${ind} in ${locationPhrase}. ${diff}We stay small on purpose — it's how we keep the quality up.`,
        ctaHeadline: "Place an order",
      }
    case "trust_me":
      return {
        heroSubtitle: `Experienced ${ind} in ${cityLabel}. Every client gets the full attention they deserve.`,
        aboutText: `${name} serves ${locationPhrase} with the expertise and care that only comes from real experience. ${diff}We take your situation seriously.`,
        ctaHeadline: "Let's talk",
      }
    case "find_me":
      return {
        heroSubtitle: `${industryLabel} based in ${cityLabel}. Shows, bookings, and everything in between.`,
        aboutText: `${name} is a ${ind} in ${locationPhrase}. ${diff}The work speaks for itself — take a look.`,
        ctaHeadline: "Get in touch",
      }
  }
}

export function buildFallbackWebsiteContent(input: ContentGenerationInput): GeneratedWebsiteContent {
  const cityLabel = input.city || "Your Area"
  const industryLabel = polishTitle((input.subIndustry || input.industry).replace(/_/g, " "))
  const locationPhrase = input.city
    ? `${input.city}${input.state ? `, ${input.state}` : ""}`
    : "Your Area"
  const differentiator = input.different?.trim() || null

  const job = getWebsiteJob(input.subIndustry || null, input.industry)
  const copy = buildJobFamilyCopy(input.name, industryLabel, cityLabel, locationPhrase, differentiator, job)

  return {
    heroTitle: input.subIndustry ? `${industryLabel} in ${cityLabel}` : polishTitle(input.name),
    heroSubtitle: copy.heroSubtitle,
    aboutText: copy.aboutText,
    tagline: null,
    ctaHeadline: copy.ctaHeadline,
    copy_generated: false,
    faq_items: null,
    services: input.services.length
      ? polishServices(input.services)
      : [{
          name: polishTitle(industryLabel || "Service"),
          description: serviceFallback(industryLabel || "service"),
        }],
  }
}

function buildPrompt(input: ContentGenerationInput) {
  return [
    "Create concise homepage copy for a small business website generated by Found Co.",
    "Write like Apple would for a local business: clear, human, premium, and simple. No hype. No jargon. No emojis.",
    "Return JSON only with this exact shape:",
    '{"heroTitle":"string","heroSubtitle":"string","aboutText":"string","tagline":"string or null","ctaHeadline":"string or null","services":[{"name":"string","description":"string"}],"faqItems":[{"q":"string","a":"string"},{"q":"string","a":"string"},{"q":"string","a":"string"}]}',
    "",
    `Business name: ${input.name}`,
    `What they do: ${input.description || "Not provided"}`,
    `Industry: ${input.industry}`,
    `Sub-industry: ${input.subIndustry}`,
    `Location: ${[input.city, input.state].filter(Boolean).join(", ") || "Not provided"}`,
    `What makes them different: ${input.different || "Not provided"}`,
    `Selected vibe: ${input.vibe}`,
    `Design direction (internal brief — never copy this text into output): ${input.manifest.primaryJob}`,
    `Voice and feel (internal — never copy this text into output): ${input.manifest.jonyNote}`,
    `Primary call to action intent: ${input.manifest.primaryIntent}`,
    `Secondary call to action intent: ${input.manifest.secondaryIntent || "none"}`,
    `Services to keep in this order: ${input.services.map((service) => service.name).join(", ") || "Create one general service"}`,
    "",
    "Rules:",
    "- Keep heroTitle under 64 characters.",
    "- Keep heroSubtitle under 150 characters.",
    "- Keep aboutText under 420 characters.",
    "- Keep each service description under 160 characters.",
    "- Preserve the provided service names unless they are unclear; lightly clean them only.",
    "- Do not invent license numbers, awards, prices, guarantees, credentials, or years in business.",
    "- Generate exactly 3 FAQ entries in faqItems. Questions and answers should sound like a real owner wrote them, specific to this business type and location.",
    "- FAQ answers must include the business name and city naturally, and should be 1-2 sentences max.",
    "- Questions should be what real customers actually search: service-specific, location-aware, and conversational.",
  ].join("\n")
}

export async function generateWebsiteContent(input: ContentGenerationInput): Promise<GeneratedWebsiteContent> {
  const fallback = buildFallbackWebsiteContent(input)
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return fallback

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 1200,
        temperature: 0.4,
        messages: [{ role: "user", content: buildPrompt(input) }],
      }),
    })
    clearTimeout(timeout)

    if (!response.ok) {
      console.error("[contentGeneration] Claude request failed:", response.status, await response.text())
      return fallback
    }

    const payload = await response.json() as ClaudeMessageResponse
    const text = payload.content?.find((block) => block.type === "text")?.text
    const generated = text ? parseGeneratedJson(text) : null
    if (!generated) return fallback

    const faqItems = sanitizeFaqItems(generated.faqItems)
    return {
      heroTitle: polishShortCopy(limit(generated.heroTitle, fallback.heroTitle, 64)),
      heroSubtitle: polishSentence(limit(generated.heroSubtitle, fallback.heroSubtitle, 150)),
      aboutText: polishSentence(limit(generated.aboutText, fallback.aboutText, 420)),
      tagline: typeof generated.tagline === "string" ? polishShortCopy(limit(generated.tagline, "", 80)) || null : null,
      ctaHeadline: typeof generated.ctaHeadline === "string" ? polishShortCopy(limit(generated.ctaHeadline, "", 90)) || null : null,
      copy_generated: true,
      faq_items: faqItems,
      services: sanitizeServices(generated.services, fallback.services),
    }
  } catch (error) {
    console.error("[contentGeneration] Claude generation error:", error)
    return fallback
  }
}
