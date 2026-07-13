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
  return value
    .map(item => {
      if (!item || typeof item !== "object") return null
      const row = item as { name?: unknown; description?: unknown }
      const name = polishTitle(row.name, "Service")
      return {
        name,
        description: polishSentence(row.description, `Professional ${name.toLowerCase()} with clear communication and careful work.`),
      }
    })
    .filter((item): item is ServiceCopyItem => item !== null)
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

export function polishWebsiteField(field: string, value: unknown) {
  switch (field) {
    case "hero_title":
    case "tagline":
    case "cta_headline":
      return polishShortCopy(value)
    case "hero_subtitle":
    case "about_text":
      return polishSentence(value)
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

export function polishWebsiteUpdates<T extends Record<string, unknown>>(updates: T): T {
  const polished: Record<string, unknown> = { ...updates }
  for (const field of ["hero_title", "hero_subtitle", "about_text", "tagline", "cta_headline", "services", "faq_items", "menu_items"]) {
    if (field in polished) polished[field] = polishWebsiteField(field, polished[field])
  }
  return polished as T
}