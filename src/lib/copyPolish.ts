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
  frcc: "FRCC",
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
  photography: "photography business",
  photographer: "photography business",
  contractor: "contractor",
  construction: "contractor",
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
  pet_services: "pet care business",
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


function rawIndustryLabel(context?: CopyPolishContext) {
  return (context?.subIndustry || context?.industry || "business").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function regexEscape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function variantAlreadyHumanGuard(variant: string, human: string) {
  const normalizedVariant = variant.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim()
  const normalizedHuman = human.toLowerCase().replace(/\s+/g, " ").trim()
  if (!normalizedHuman.startsWith(`${normalizedVariant} `)) return ""
  const suffix = normalizedHuman.slice(normalizedVariant.length).trim()
  return suffix ? `(?!\\s+${regexEscape(suffix).replace(/\\ /g, "\\s+")}\\b)` : ""
}

function collapseRepeatedHumanLabels(value: string, context?: CopyPolishContext) {
  const human = humanIndustryLabel(context)
  const words = human.split(/\s+/).filter(Boolean)
  if (words.length < 2) return value
  const lastWord = regexEscape(words[words.length - 1])
  const escapedHuman = regexEscape(human).replace(/\\ /g, "\\s+")
  return value.replace(new RegExp(`\\b${escapedHuman}(?:\\s+${lastWord})+\\b`, "gi"), human)
}

function replaceRawIndustryLabels(value: string, context?: CopyPolishContext) {
  const raw = rawIndustryLabel(context)
  const human = humanIndustryLabel(context)
  if (!raw || raw === human) return collapseRepeatedHumanLabels(value, context)

  const sourceLabels = Array.from(new Set([
    raw,
    context?.subIndustry?.toLowerCase() ?? "",
    context?.subIndustry ? "" : context?.industry?.toLowerCase() ?? "",
  ]))
    .map(label => label.replace(/[^a-z0-9_ ]+/g, " ").trim())
    .filter(label => label && label !== human)

  let cleaned = collapseRepeatedHumanLabels(value, context)
  for (const label of sourceLabels) {
    const variants = Array.from(new Set([label, label.replace(/_/g, " "), label.replace(/\s+/g, "_")])).filter(Boolean)
    for (const variant of variants) {
      const escaped = regexEscape(variant)
      const guarded = `${escaped}${variantAlreadyHumanGuard(variant, human)}`
      cleaned = cleaned
        .replace(new RegExp(`\\blocal ${guarded}\\b`, "gi"), `local ${human}`)
        .replace(new RegExp(`\\byour local ${guarded}\\b`, "gi"), `your local ${human}`)
        .replace(new RegExp(`\\blocally owned ${guarded}\\b`, "gi"), `locally owned ${human}`)
        .replace(new RegExp(`\\b${guarded} in\\b`, "gi"), `${human} in`)
    }
  }
  return collapseRepeatedHumanLabels(cleaned, context)
}

function titleCaseHumanIndustry(value: string, context?: CopyPolishContext) {
  return polishTitle(replaceRawIndustryLabels(value, context))
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

function joinHumanList(parts: string[]) {
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`
}

function normalizeFragment(part: string) {
  return part
    .replace(/\.$/, "")
    .replace(/\s+options are available$/i, " options")
    .replace(/^wholesale available$/i, "wholesale options")
    .replace(/^weekly$/i, "weekly cleaning")
    .replace(/^move outs$/i, "move-out service")
    .replace(/^nails$/i, "nail care")
    .replace(/^community$/i, "community programs")
    .replace(/^donations$/i, "donor support")
    .replace(/^facials$/i, "facial services")
    .replace(/^lashes$/i, "lash services")
    .replace(/^balloons$/i, "balloon installs")
    .toLowerCase()
}

function sentenceFromFragments(value: string, context?: CopyPolishContext) {
  const parts = value.split(/,\s*/).map(part => part.trim()).filter(Boolean)
  if (parts.length < 2) return value

  const normalized = parts.map(normalizeFragment)
  const fragmentLike = normalized.every(part => !/\b(is|are|we|our|offer|offers|make|makes|serve|serves|provide|provides|handle|handles|help|helps)\b/i.test(part))
  if (!fragmentLike) return value

  const industry = (context?.subIndustry || context?.industry || "").toLowerCase()
  const familyOwned = normalized.includes("family owned")
  const openLate = normalized.includes("open late")
  const relaxing = normalized.includes("relaxing")
  const freeEstimates = normalized.includes("free estimates")
  const core = normalized.filter(part => !["family owned", "open late", "relaxing", "free estimates"].includes(part))

  if (industry.includes("food")) {
    const food = core.filter(part => part !== "catering")
    const actions = [
      food.length ? `serve ${joinHumanList(food)}` : null,
      core.includes("catering") ? "offer catering" : null,
    ].filter(Boolean)
    const extra = familyOwned || openLate ? " with a family-friendly feel and late hours" : ""
    return `We ${joinHumanList(actions as string[])}${extra}.`
  }

  if (industry.includes("home_services") || industry.includes("contract") || industry.includes("cleaning") || industry.includes("landscaping")) {
    const action = industry.includes("cleaning") ? "offer" : "handle"
    const tail = freeEstimates ? " with free estimates and clear communication from start to finish" : " with clear communication from start to finish"
    return `We ${action} ${joinHumanList(core)}${tail}.`
  }

  if (industry.includes("beauty")) {
    return `We offer ${joinHumanList(core)} in a space built around care and confidence.`
  }

  if (industry.includes("wellness")) {
    const tail = relaxing ? " designed to help clients slow down and feel restored" : " with a calm, thoughtful experience"
    return `We offer ${joinHumanList(core)}${tail}.`
  }

  if (industry.includes("event")) {
    const eventTypes = core.filter(part => part !== "balloon installs")
    const lead = core.includes("balloon installs") ? "balloon installs and event details" : joinHumanList(core)
    const tail = eventTypes.length ? ` for ${joinHumanList(eventTypes)}` : ""
    return `We create ${lead}${tail} with a polished touch.`
  }

  if (industry.includes("creative") || industry.includes("photography")) {
    return `We photograph ${joinHumanList(core)} with a calm process and a clean final look.`
  }

  if (industry.includes("real_estate")) {
    const people = core.filter(part => part !== "listings")
    return `We help ${joinHumanList(people.length ? people : core)} move with clarity, local knowledge, and practical guidance.`
  }

  if (industry.includes("pet")) {
    return `We offer ${joinHumanList(core)} for pets who deserve gentle, reliable attention.`
  }

  if (industry.includes("professional")) {
    return `We help with ${joinHumanList(core)} so clients can stay organized and make better decisions.`
  }

  if (industry.includes("nonprofit")) {
    return `We support ${joinHumanList(core)} and the people who make that work possible.`
  }

  return `We offer ${joinHumanList(normalized)} with care and clear next steps.`
}

function normalizeForIntroCompare(value: string) {
  return applyKnownFixes(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function aboutIntroInfo(sentence: string, context?: CopyPolishContext) {
  const normalized = normalizeForIntroCompare(sentence.replace(/[.!?]+$/g, ""))
  const city = context?.city ? normalizeForIntroCompare(context.city) : ""
  if (!city || !normalized.includes(city)) return null

  const introMatch = normalized.match(/^(.+?)\s+is\s+(?:a|an)\s+(.+?)\s+in\s+(.+)$/)
  if (!introMatch) return null

  const subject = introMatch[1].trim()
  const descriptor = introMatch[2].trim().replace(/^locally owned\s+/, "")
  const local = /\blocally owned\b/.test(normalized)
  return { local, normalized, subject, descriptor }
}

function removeRedundantIntroSentences(sentences: string[], context?: CopyPolishContext) {
  if (sentences.length < 2) return sentences
  const result: string[] = []

  for (const sentence of sentences) {
    const current = sentence.trim()
    if (!current) continue

    const previous = result[result.length - 1]
    if (previous) {
      const previousIntro = aboutIntroInfo(previous, context)
      const currentIntro = aboutIntroInfo(current, context)
      if (previousIntro && currentIntro) {
        const currentIsStronger = (currentIntro.local && !previousIntro.local) || currentIntro.descriptor.includes(previousIntro.descriptor) || currentIntro.descriptor.length > previousIntro.descriptor.length
        result[result.length - 1] = currentIsStronger ? current : previous
        continue
      }
    }

    result.push(current)
  }

  return result
}
function collapseDuplicateIntroParagraph(value: string, context?: CopyPolishContext) {
  if (!context?.businessName || !context.city) return value
  const business = polishTitle(context.businessName)
  const businessPattern = regexEscape(business).replace(/\ /g, "\\s+")
  const cityPattern = regexEscape(context.city).replace(/\ /g, "\\s+")
  const statePattern = context.state ? `(?:,\\s*${regexEscape(context.state)})?` : ""
  const locationPattern = `${cityPattern}${statePattern}`
  const genericIntro = `${businessPattern}\\s+is\\s+(?:a|an)\\s+(?!locally\\s+owned\\b)[^.]*?\\bin\\s+${locationPattern}`
  const localIntro = `${businessPattern}\\s+is\\s+(?:a|an)\\s+locally\\s+owned\\s+[^.]*?\\bin\\s+${locationPattern}`

  let cleaned = value.replace(new RegExp(`\\b${genericIntro}\\.\\s+(${localIntro})\\.`, "gi"), (_, local: string) => `${local.replace(new RegExp(`^${businessPattern}`, "i"), business)}.`)
  cleaned = cleaned.replace(new RegExp(`\\b(${localIntro})\\.\\s+${genericIntro}\\.`, "gi"), (_, local: string) => `${local.replace(new RegExp(`^${businessPattern}`, "i"), business)}.`)
  return cleaned
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

  cleaned = replaceRawIndustryLabels(cleaned, context)
  cleaned = cleaned.replace(/\ba locally owned ([a-z_]+(?: [a-z_]+){0,2})([,.])/i, (match: string, label: string, punctuation: string) => {
    if (/\bin\b/i.test(label)) return match
    return `a locally owned ${industry}${punctuation}`
  })
  cleaned = cleaned.replace(/\ba ([a-z_ ]+?) in Your Area\b/i, `a ${industry}${location ? ` in ${location}` : ""}`)
  cleaned = cleaned.replace(/\bWholesale available\b/gi, "wholesale options are available")
  cleaned = cleaned.replace(/\bSame-day\b/g, "same-day")
  cleaned = decapitalizeBodyTitleCase(cleaned)
  cleaned = collapseDuplicateIntroParagraph(cleaned, context)

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentenceFromFragments(sentence.trim(), context))
    .map(splitLongCommaSentence)
    .filter(Boolean)

  cleaned = removeRedundantIntroSentences(sentences, context).join(" ")
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

function isFaithContext(context?: CopyPolishContext) {
  const label = `${context?.industry ?? ""} ${context?.subIndustry ?? ""}`.toLowerCase()
  return /\b(church|mosque|temple|ministry|faith|congregation)\b/.test(label)
}

export function polishBusinessName(value: unknown, fallback = "") {
  return polishTitle(value, fallback)
}

export function getAboutHeroSubtitle(context?: CopyPolishContext) {
  const location = locationLabel(context)
  if (isFaithContext(context)) {
    const label = (context?.subIndustry ?? "").toLowerCase().includes("church") ? "church community" : "faith community"
    return location ? `A ${label} in ${location}.` : `A ${label}.`
  }
  return location ? `Locally owned and operated in ${location}.` : "Local and independent."
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

export function polishHeroCopy(value: unknown, context?: CopyPolishContext) {
  if (typeof value !== "string") return ""
  const cleaned = replaceRawIndustryLabels(applyKnownFixes(normalizeWhitespace(value)), context)
  return polishSentence(cleaned)
}

export function polishHeroTitle(value: unknown, context?: CopyPolishContext) {
  if (typeof value !== "string") return ""
  return titleCaseHumanIndustry(applyKnownFixes(normalizeWhitespace(value)), context)
}
export function polishWebsiteField(field: string, value: unknown, context?: CopyPolishContext) {
  switch (field) {
    case "hero_title":
      return polishHeroTitle(value, context)
    case "tagline":
    case "cta_headline":
      return polishShortCopy(value)
    case "hero_subtitle":
      return polishHeroCopy(value, context)
    case "about_text":
      return polishAboutCopy(value, context)
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