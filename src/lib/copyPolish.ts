export type ServiceCopyItem = {
  name: string
  description: string
}

export type MenuCopyCategory = {
  category: string
  items: { name: string; description: string; price: string | null; photo_url?: string | null }[]
}

const KNOWN_FIXES: Record<string, string> = {
  accomodate: "accommodate",
  accomodation: "accommodation",
  adress: "address",
  alot: "a lot",
  apparell: "apparel",
  appoitment: "appointment",
  availible: "available",
  buisness: "business",
  calender: "calendar",
  comunication: "communication",
  definitly: "definitely",
  seperate: "separate",
  recieve: "receive",
  recieved: "received",
  recomend: "recommend",
  restaraunt: "restaurant",
  resturant: "restaurant",
  schedual: "schedule",
  tshirt: "T-shirt",
  tshirts: "T-shirts",
}

const LOWERCASE_TITLE_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "nor", "of", "on", "or", "per", "the", "to", "vs", "with"])
const UPPERCASE_WORDS = new Set(["ac", "ai", "api", "bbq", "cfo", "ceo", "cpa", "crm", "dj", "faq", "gps", "hvac", "it", "llc", "seo", "sms", "tv", "ui", "ux", "vip", "wifi"])
const SERVICE_DESCRIPTION_BY_NAME: Record<string, string> = {
  apparel: "Everyday pieces selected for fit, comfort, and style.",
  clothing: "Easy-to-wear pieces chosen to help the whole look come together.",
  shirts: "Clean staples for work, weekends, and everything between.",
  hats: "Finishing touches that make the whole look feel intentional.",
  accessories: "Small details that add polish without overcomplicating the look.",
  shoes: "Comfortable options chosen for movement, style, and everyday wear.",
  catering: "Food planned around the guest list, timing, and feel of the event.",
  reservations: "A simple way for guests to plan ahead and know what to expect.",
  estimates: "Clear pricing guidance before the work begins.",
  repairs: "Practical fixes handled with attention to the details that matter.",
  installation: "A clean setup process designed to feel straightforward from start to finish.",
  cleaning: "A reliable reset for the spaces customers use every day.",
  landscaping: "Outdoor work shaped around curb appeal, upkeep, and long-term use.",
  photography: "Images composed to feel natural, useful, and true to the moment.",
}

const SERVICE_DESCRIPTION_PATTERNS = [
  "Clear options, thoughtful guidance, and an easy next step.",
  "Practical help shaped around what the customer needs most.",
  "A focused option for customers who want the details handled well.",
  "Simple, well-presented service built to make the decision easier.",
  "Careful attention to the small choices that affect the final result.",
  "A straightforward way to get exactly what is needed without extra friction.",
]


export type CopyPolishContext = {
  businessName?: string | null
  industry?: string | null
  subIndustry?: string | null
  city?: string | null
  state?: string | null
}

const HUMAN_INDUSTRY_LABELS: Record<string, string> = {
  apparel: "apparel shop",
  clothing: "clothing shop",
  retail: "retail shop",
  food: "restaurant",
  food_beverage: "food business",
  home_based_food: "food business",
  beauty: "beauty business",
  wellness: "wellness studio",
  fitness: "fitness business",
  events: "event business",
  home_services: "home service business",
  cleaning: "cleaning business",
  landscaping: "landscaping business",
  automotive: "automotive business",
  pet_services: "pet service business",
  creative_services: "creative business",
  professional_services: "professional service business",
  real_estate: "real estate business",
  healthcare: "healthcare practice",
  education: "education business",
  nonprofit: "nonprofit organization",
}

function humanIndustryLabel(context?: CopyPolishContext) {
  const raw = (context?.subIndustry || context?.industry || "business").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return HUMAN_INDUSTRY_LABELS[raw] || HUMAN_INDUSTRY_LABELS[raw.replace(/_shop$/, "")] || raw.replace(/_/g, " ") || "business"
}

function locationLabel(context?: CopyPolishContext) {
  return [context?.city, context?.state].filter(Boolean).join(", ")
}

function decapitalizeBodyTitleCase(value: string) {
  return value.replace(/([,;:]\s+)([A-Z][a-z]+(?:-[a-z]+)?)(?=\s|,|;|\.|$)/g, (_, prefix: string, word: string) => {
    if (UPPERCASE_WORDS.has(word.toLowerCase())) return `${prefix}${word}`
    return `${prefix}${word.charAt(0).toLowerCase()}${word.slice(1)}`
  })
}

function sentenceFromFragments(value: string) {
  const parts = value.split(/,\s*/).map(part => part.trim()).filter(Boolean)
  if (parts.length < 2 || parts.some(part => /\b(is|are|we|our|offer|offers|make|makes|serve|serves|provide|provides)\b/i.test(part))) return value
  const normalized = parts.map(part => part.replace(/\.$/, "").toLowerCase())
  if (normalized.length === 2) return `We offer ${normalized[0]} and ${normalized[1]}.`
  return `We offer ${normalized.slice(0, -1).join(", ")}, and ${normalized[normalized.length - 1]}.`
}

function splitLongCommaSentence(sentence: string) {
  const commaCount = (sentence.match(/,/g) || []).length
  if (sentence.length < 150 || commaCount < 3) return sentence
  const firstComma = sentence.indexOf(",")
  if (firstComma < 40) return sentence
  return `${sentence.slice(0, firstComma).trim()}. ${sentence.slice(firstComma + 1).trim()}`
}

export function polishAboutCopy(value: unknown, context?: CopyPolishContext) {
  if (typeof value !== "string") return ""
  let cleaned = applyKnownFixes(normalizeWhitespace(value))
  if (!cleaned) return ""

  const businessName = context?.businessName ? polishTitle(context.businessName) : null
  const industry = humanIndustryLabel(context)
  const location = locationLabel(context)

  cleaned = cleaned.replace(/\blocally owned ([a-z_ ]+?) in\b/i, `locally owned ${industry} in`)
  cleaned = cleaned.replace(/\ba locally owned ([a-z_ ]+?)([,.])/i, `a locally owned ${industry}$2`)
  cleaned = cleaned.replace(/\ba ([a-z_ ]+?) in Your Area\b/i, `a ${industry}${location ? ` in ${location}` : ""}`)
  cleaned = cleaned.replace(/\bWholesale available\b/gi, "wholesale options are available")
  cleaned = cleaned.replace(/\bSame-day\b/g, "same-day")
  cleaned = decapitalizeBodyTitleCase(cleaned)

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentenceFromFragments(sentence.trim()))
    .map(splitLongCommaSentence)
    .filter(Boolean)

  cleaned = sentences.join(" ")
  cleaned = cleaned.replace(/\s+/g, " ").trim()
  cleaned = cleaned.replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`)
  if (!/[.!?]$/.test(cleaned)) cleaned += "."

  if (businessName && !new RegExp(`^${businessName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(cleaned) && cleaned.length < 260) {
    cleaned = `${businessName} is a ${location ? `${industry} in ${location}` : industry}. ${cleaned}`
  }

  return cleaned
}
const TEMPLATE_SMELL_PATTERNS = [
  /handled with clear communication/i,
  /careful work, and an easy path/i,
  /from first question to finished result/i,
  /professional .+ with clear communication/i,
]

function serviceKey(name: string) {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim()
}

function serviceDescriptionSignature(service: ServiceCopyItem) {
  const key = serviceKey(service.name)
  return service.description
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .replace(new RegExp(`\\b${key.replace(/\s+/g, "\\s+")}s?\\b`, "gi"), "{service}")
    .replace(/\s+/g, " ")
    .trim()
}

function hasTemplateSmell(description: string) {
  return TEMPLATE_SMELL_PATTERNS.some(pattern => pattern.test(description))
}

function fallbackServiceDescription(name: string, index: number) {
  const key = serviceKey(name)
  const exact = SERVICE_DESCRIPTION_BY_NAME[key]
  if (exact) return exact

  const words = key.split(" ").filter(Boolean)
  for (const word of words) {
    if (SERVICE_DESCRIPTION_BY_NAME[word]) return SERVICE_DESCRIPTION_BY_NAME[word]
  }

  return SERVICE_DESCRIPTION_PATTERNS[index % SERVICE_DESCRIPTION_PATTERNS.length]
}

function improveServiceDescriptions(services: ServiceCopyItem[]) {
  const signatures = new Map<string, number>()
  for (const service of services) {
    const signature = serviceDescriptionSignature(service)
    signatures.set(signature, (signatures.get(signature) ?? 0) + 1)
  }

  return services.map((service, index) => {
    const signature = serviceDescriptionSignature(service)
    const duplicate = (signatures.get(signature) ?? 0) > 1
    const tooGeneric = hasTemplateSmell(service.description) || service.description.length < 18
    const startsWithServiceName = service.description.toLowerCase().startsWith(service.name.toLowerCase())

    if (!duplicate && !tooGeneric && !startsWithServiceName) return service

    return {
      ...service,
      description: polishSentence(fallbackServiceDescription(service.name, index)),
    }
  })
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/[\t\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?=\S)/g, "$1 ")
    .trim()
}

function applyKnownFixes(value: string) {
  return value.replace(/\b[A-Za-z][A-Za-z'-]*\b/g, (word) => {
    const key = word.toLowerCase()
    return KNOWN_FIXES[key] ?? word
  })
}

function capitalizeWord(word: string, index: number, total: number) {
  if (!word) return word
  const lower = word.toLowerCase()
  if (UPPERCASE_WORDS.has(lower)) return lower.toUpperCase()
  if (index > 0 && index < total - 1 && LOWERCASE_TITLE_WORDS.has(lower)) return lower
  if (/^[A-Z0-9&.'-]+$/.test(word) && word.length > 1 && word !== lower) return word
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function polishTitle(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback
  const cleaned = applyKnownFixes(normalizeWhitespace(value))
  if (!cleaned) return fallback
  const words = cleaned.split(" ")
  return words.map((word, index) => {
    if (word.includes("/")) {
      return word.split("/").map(part => capitalizeWord(part, index, words.length)).join("/")
    }
    return capitalizeWord(word, index, words.length)
  }).join(" ")
}

export function polishSentence(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback
  let cleaned = applyKnownFixes(normalizeWhitespace(value))
  if (!cleaned) return fallback
  cleaned = cleaned.replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`)
  if (!/[.!?]$/.test(cleaned)) cleaned += "."
  return cleaned
}

export function polishShortCopy(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback
  const cleaned = applyKnownFixes(normalizeWhitespace(value))
  if (!cleaned) return fallback
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function polishServices(value: unknown): ServiceCopyItem[] {
  if (!Array.isArray(value)) return []
  const services = value
    .map(item => {
      if (!item || typeof item !== "object") return null
      const row = item as { name?: unknown; description?: unknown }
      const name = polishTitle(row.name, "Service")
      return {
        name,
        description: polishSentence(row.description, fallbackServiceDescription(name, 0)),
      }
    })
    .filter((item): item is ServiceCopyItem => item !== null)

  return improveServiceDescriptions(services)
}

export function polishFaqItems(value: unknown): { q: string; a: string }[] | null {
  if (!Array.isArray(value)) return null
  const items = value
    .map(item => {
      if (!item || typeof item !== "object") return null
      const row = item as { q?: unknown; a?: unknown }
      const q = polishShortCopy(row.q).replace(/[.]+$/, "")
      const question = q ? (/[?]$/.test(q) ? q : `${q}?`) : ""
      const a = polishSentence(row.a)
      return question && a ? { q: question, a } : null
    })
    .filter((item): item is { q: string; a: string } => item !== null)
  return items.length ? items : null
}

export function polishMenuCategories(value: unknown): MenuCopyCategory[] {
  if (!Array.isArray(value)) return []
  const categories: MenuCopyCategory[] = []

  for (const category of value) {
    if (!category || typeof category !== "object") continue
    const row = category as { category?: unknown; items?: unknown }
    const sourceItems = Array.isArray(row.items) ? row.items : []
    const items: MenuCopyCategory["items"] = []

    for (const item of sourceItems) {
      if (!item || typeof item !== "object") continue
      const menuItem = item as { name?: unknown; description?: unknown; price?: unknown; photo_url?: unknown }
      const name = polishTitle(menuItem.name, "Item")
      items.push({
        name,
        description: polishSentence(menuItem.description, ""),
        price: typeof menuItem.price === "string" && menuItem.price.trim() ? menuItem.price.trim() : null,
        photo_url: typeof menuItem.photo_url === "string" && menuItem.photo_url.trim() ? menuItem.photo_url.trim() : null,
      })
    }

    categories.push({
      category: polishTitle(row.category, "Menu"),
      items,
    })
  }

  return categories
}

export function polishWebsiteField(field: string, value: unknown, context?: CopyPolishContext) {
  switch (field) {
    case "hero_title":
    case "tagline":
    case "cta_headline":
      return polishShortCopy(value)
    case "hero_subtitle":
    case "about_text":
      return field === "about_text" ? polishAboutCopy(value, context) : polishSentence(value)
    case "services":
      return polishServices(value)
    case "faq_items":
      return polishFaqItems(value)
    case "menu_items":
      return polishMenuCategories(value)
    default:
      return value
  }
}

export function polishWebsiteUpdates<T extends Record<string, unknown>>(updates: T, context?: CopyPolishContext): T {
  const polished: Record<string, unknown> = { ...updates }
  for (const field of ["hero_title", "hero_subtitle", "about_text", "tagline", "cta_headline", "services", "faq_items", "menu_items"]) {
    if (field in polished) polished[field] = polishWebsiteField(field, polished[field], context)
  }
  return polished as T
}