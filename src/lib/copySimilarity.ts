import type { ContentGenerationInput, GeneratedWebsiteContent } from "@/lib/contentGeneration"
import { polishAboutCopy, polishHeroCopy, polishHeroTitle, polishServices, polishTitle } from "@/lib/copyPolish"

export type ExistingCopyReference = {
  companyId?: string | null
  slug?: string | null
  name?: string | null
  industry?: string | null
  subIndustry?: string | null
  city?: string | null
  state?: string | null
  heroTitle?: string | null
  heroSubtitle?: string | null
  aboutText?: string | null
  aboutPreview?: string | null
  aboutStory?: string | null
  services?: { name?: string | null; description?: string | null }[] | null
}

export type CopySimilarityMatch = {
  slug: string
  field: "hero" | "about" | "services" | "combined"
  score: number
  reason: string
}

export type CopySimilarityGuardResult = {
  content: GeneratedWebsiteContent
  changed: boolean
  match: CopySimilarityMatch | null
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "you",
  "our",
  "are",
  "was",
  "were",
  "will",
  "can",
  "get",
  "gets",
  "into",
  "out",
  "all",
  "any",
  "each",
  "every",
  "what",
  "when",
  "where",
  "why",
  "how",
  "before",
  "after",
  "next",
  "step",
  "steps",
  "clear",
  "built",
  "around",
  "company",
  "business",
  "service",
  "services",
  "customers",
  "customer",
])

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function contextForInput(input: ContentGenerationInput) {
  return {
    businessName: input.name,
    industry: input.industry,
    subIndustry: input.subIndustry,
    city: input.city,
    state: input.state,
  }
}

function tokenize(value: string) {
  return compact(value)
    .toLowerCase()
    .replace(/[']/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

function ngrams(tokens: string[], size: number) {
  if (tokens.length < size) return []
  const grams: string[] = []
  for (let index = 0; index <= tokens.length - size; index += 1) {
    grams.push(tokens.slice(index, index + size).join(" "))
  }
  return grams
}

function overlapScore(leftValues: string[], rightValues: string[]) {
  const left = new Set(leftValues)
  const right = new Set(rightValues)
  if (!left.size || !right.size) return 0
  let shared = 0
  for (const value of left) {
    if (right.has(value)) shared += 1
  }
  const union = new Set([...left, ...right]).size
  const jaccard = shared / union
  const containment = shared / Math.min(left.size, right.size)
  return Math.max(jaccard, containment * 0.86)
}

export function scoreCopySimilarity(leftText: string, rightText: string) {
  const leftTokens = tokenize(leftText)
  const rightTokens = tokenize(rightText)
  if (leftTokens.length < 5 || rightTokens.length < 5) return 0

  const tokenScore = overlapScore(leftTokens, rightTokens)
  const bigramScore = overlapScore(ngrams(leftTokens, 2), ngrams(rightTokens, 2))
  const trigramScore = overlapScore(ngrams(leftTokens, 3), ngrams(rightTokens, 3))
  return Math.min(1, Math.max(tokenScore, bigramScore * 1.08, trigramScore * 1.18))
}

function serviceText(services: { name?: string | null; description?: string | null }[] | null | undefined) {
  return (services ?? [])
    .map((service) => [service?.name, service?.description].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(" ")
}

function candidateTexts(content: GeneratedWebsiteContent) {
  return {
    hero: [content.heroTitle, content.heroSubtitle].filter(Boolean).join(" "),
    about: [content.aboutText, content.aboutPreview, content.aboutStory].filter(Boolean).join(" "),
    services: serviceText(content.services),
    combined: [
      content.heroTitle,
      content.heroSubtitle,
      content.aboutText,
      content.aboutPreview,
      content.aboutStory,
      serviceText(content.services),
    ].filter(Boolean).join(" "),
  }
}

function referenceTexts(reference: ExistingCopyReference) {
  return {
    hero: [reference.heroTitle, reference.heroSubtitle].filter(Boolean).join(" "),
    about: [reference.aboutText, reference.aboutPreview, reference.aboutStory].filter(Boolean).join(" "),
    services: serviceText(reference.services),
    combined: [
      reference.heroTitle,
      reference.heroSubtitle,
      reference.aboutText,
      reference.aboutPreview,
      reference.aboutStory,
      serviceText(reference.services),
    ].filter(Boolean).join(" "),
  }
}

export function findClosestCopyMatch(
  content: GeneratedWebsiteContent,
  references: ExistingCopyReference[],
): CopySimilarityMatch | null {
  const candidate = candidateTexts(content)
  let closest: CopySimilarityMatch | null = null

  for (const reference of references) {
    const existing = referenceTexts(reference)
    const checks: Array<CopySimilarityMatch["field"]> = ["hero", "about", "services", "combined"]
    for (const field of checks) {
      const score = scoreCopySimilarity(candidate[field], existing[field])
      const threshold = field === "combined" ? 0.64 : field === "services" ? 0.72 : 0.68
      if (score >= threshold && (!closest || score > closest.score)) {
        closest = {
          slug: reference.slug || reference.companyId || "existing-site",
          field,
          score,
          reason: `${field} copy is too close to ${reference.slug || "an existing site"}`,
        }
      }
    }
  }

  return closest
}

function locationPhrase(input: ContentGenerationInput) {
  return input.city ? `${input.city}${input.state ? `, ${input.state}` : ""}` : "your area"
}

function cityLabel(input: ContentGenerationInput) {
  return input.city || "your area"
}

function humanIndustry(input: ContentGenerationInput) {
  return polishTitle((input.subIndustry || input.industry || "local business").replace(/_/g, " ")).toLowerCase()
}

function serviceNames(input: ContentGenerationInput) {
  return input.services
    .map((service) => service.name.trim())
    .filter(Boolean)
    .slice(0, 3)
}

function naturalList(values: string[]) {
  if (values.length <= 1) return values[0] ?? ""
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`
}

function buildDistinctCopy(content: GeneratedWebsiteContent, input: ContentGenerationInput): GeneratedWebsiteContent {
  const context = contextForInput(input)
  const industry = humanIndustry(input)
  const services = serviceNames(input)
  const servicePhrase = services.length
    ? naturalList(services)
    : industry
  const differentiator = input.different.trim()
  const location = locationPhrase(input)
  const city = cityLabel(input)

  const heroSubtitle = polishHeroCopy(
    services.length
      ? `${polishTitle(industry)} in ${city}, centered on ${servicePhrase}.`
      : `${polishTitle(industry)} in ${city}, shaped around ${input.name}'s actual customer work.`,
    context,
  )

  const aboutPreview = polishAboutCopy(
    `${input.name} is a ${industry} in ${location}. ${
      services.length
        ? `The work focuses on ${servicePhrase} so customers quickly understand what to ask for.`
        : `Customers get a clearer view of the work, the location, and the next step.`
    }${differentiator ? ` ${differentiator.replace(/\.?\s*$/, ".")}` : ""}`,
    context,
  )

  const aboutStory = polishAboutCopy(
    `${input.name} is a ${industry} in ${location}. ${
      services.length
        ? `The experience is organized around ${servicePhrase}, practical details, and a simple path from first question to next step.`
        : `The experience is organized around practical details, local context, and a simple path from first question to next step.`
    }${differentiator ? ` ${differentiator.replace(/\.?\s*$/, ".")}` : ""}`,
    context,
  )

  const servicesForPolish = services.length
    ? input.services
    : content.services

  return {
    ...content,
    heroTitle: polishHeroTitle(content.heroTitle, context),
    heroSubtitle,
    aboutText: aboutPreview,
    aboutPreview,
    aboutStory,
    services: polishServices(servicesForPolish, context),
  }
}

export function guardGeneratedCopyUniqueness(
  content: GeneratedWebsiteContent,
  input: ContentGenerationInput,
  references: ExistingCopyReference[],
): CopySimilarityGuardResult {
  const match = findClosestCopyMatch(content, references)
  if (!match) return { content, changed: false, match: null }

  return {
    content: buildDistinctCopy(content, input),
    changed: true,
    match,
  }
}
