export type ServiceCopyItem = {
  name: string
  description: string
}

export type MenuCopyCategory = {
  category: string
  catalog_settings?: { fulfillment?: "pickup" | "shipping" | "both" | "unavailable" | null; payment_behavior?: "online_required" | "pay_later" | null } | null
  items: {
    name: string
    description: string
    price: string | null
    photo_url?: string | null
    images?: string[] | null
    details?: { label: string; value: string }[] | null
    options?: { label: string; choices: string[] }[] | null
    variants?: { id: string; options: Record<string, string>; stock: number | null }[] | null
    inventory_tracking?: boolean | null
    fulfillment?: "inherit" | "pickup" | "shipping" | "both" | "unavailable" | null
    availability?: "active" | "hidden" | "sold_out" | null
    sizes?: string | null
    materials?: string | null
    shipping_note?: string | null
  }[]
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
const UPPERCASE_WORDS = new Set(["ac", "ai", "api", "az", "bbq", "ca", "cfo", "ceo", "cpa", "crm", "dj", "faq", "gps", "hvac", "it", "llc", "seo", "sms", "tv", "ui", "ux", "vip", "wifi"])
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
  garlands: "A polished detail for entrances, tables, walls, or photo moments.",
  arches: "A clear focal point that frames the celebration and anchors the room.",
  backdrops: "A camera-ready setting built around the color, theme, and guest experience.",
  delivery: "Arrival planned around the event schedule so setup feels calm and prepared.",
  setup: "Installation handled with care so the space is ready before guests arrive.",
  strike: "Post-event removal that keeps the close of the celebration simple.",
  "custom colors": "Palette choices matched to the theme, brand, or moment being celebrated.",
  service: "Practical help shaped around the details customers care about most.",
  restaurant: "Food, service, and timing handled so guests know what to expect.",
  remodeling: "Project work planned around clear scope, clean execution, and lasting use.",
  church: "Worship, service, and community life for people looking for connection.",
  esthetician: "Personal care shaped around comfort, detail, and a calm appointment flow.",
  barber: "Cuts and grooming handled with care, consistency, and respect for the schedule.",
  painting: "Surface prep and finish work planned for clean lines and lasting results.",
  "graphic designer": "Visual work shaped around clarity, polish, and the way the brand needs to be seen.",
  weddings: "Celebration details shaped around the ceremony, reception, and guest experience.",
  birthdays: "A festive setup designed around the age, theme, and people being celebrated.",
  parties: "Decor and details that help the room feel ready when guests walk in.",
  "balloon decor": "Custom balloon moments built around the event style, colors, and space.",
  "balloon garland": "A flexible statement piece for entries, dessert tables, stages, or photo areas.",
  "party rentals": "Event pieces selected to support the setup without overcomplicating the day.",
  "event planning": "Practical coordination that keeps the event details moving in the right order.",
  venue: "A ready setting for gatherings that need a clear place to come together.",
  "quinceañera": "A celebration setup shaped around family, tradition, and the guest experience.",
  "quinceañeras": "Celebration setups shaped around family, tradition, and the guest experience.",
  portraits: "Clean, natural images that feel useful, personal, and easy to share.",
  "senior portraits": "A relaxed portrait session built around personality, confidence, and milestone moments.",
  events: "Coverage focused on the people, details, and moments that make the day matter.",
}

const SERVICE_DESCRIPTION_PATTERNS = [
  "Practical help shaped around the details customers care about most.",
  "Focused support that makes the next step easier to understand.",
  "A useful option for customers who want the important details handled well.",
  "A simple service built around clear expectations and steady follow-through.",
  "Careful attention to the small choices that affect the final result.",
  "A straightforward way to get what is needed without extra friction.",
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
    if (UPPERCASE_WORDS.has(word.toLowerCase())) return `${prefix}${word.toUpperCase()}`
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
    .replace(/^[\s,.;:!?]+|[\s,.;:!?]+$/g, "")
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
    .replace(/^available weekends$/i, "weekend availability")
    .replace(/^all genres$/i, "a flexible song list")
    .replace(/^sound system included$/i, "sound system support")
    .replace(/^bilingual$/i, "bilingual support")
    .replace(/^bilingual crew$/i, "bilingual support")
    .replace(/^bilingual team (\d+\+? years experience)$/i, "$1 with bilingual support")
    .replace(/^(\d+\+? years) experience with bilingual support$/i, "bilingual support and $1 of experience")
    .replace(/^(\d+\+? years) experience$/i, "$1 of experience")
    .replace(/^bilingual team$/i, "bilingual support")
    .replace(/^family friendly sets$/i, "family-friendly sets")
    .replace(/^20 years online$/i, "online retail experience")
    .replace(/^large events welcome$/i, "large events")
    .replace(/^full service setup$/i, "full-service setup")
    .replace(/^custom designs$/i, "custom designs")
    .replace(/^same day delivery$/i, "same-day delivery")
    .replace(/^water smart designs$/i, "water-smart designs")
    .replace(/^hardscapes$/i, "hardscape work")
    .replace(/^master stylist$/i, "stylist experience")
    .replace(/^20\+ years experience$/i, "20+ years of experience")
    .replace(/^family owned$/i, "family-owned service")
    .replace(/^walk[- ]ins welcome$/i, "walk-ins")
    .replace(/^award winning$/i, "award-winning work")
    .replace(/^made from scratch$/i, "made-from-scratch food")
    .replace(/^locally sourced$/i, "local ingredients")
    .replace(/^family recipe$/i, "family recipes")
    .replace(/^gluten free options$/i, "gluten-free options")
    .toLowerCase()
}

function hasMeaningfulList(parts: string[]) {
  return parts.filter(part => part && !["family-owned service"].includes(part)).length >= 2
}

function hasAnyMeaningfulDetail(parts: string[]) {
  return parts.some(part => part && !["family-owned service", "free estimates"].includes(part))
}

function removeFromList(parts: string[], removals: string[]) {
  const removeSet = new Set(removals)
  return parts.filter(part => !removeSet.has(part))
}

function sentenceFromFragments(value: string, context?: CopyPolishContext) {
  const parts = value.split(/,\s*/).map(part => part.trim()).filter(Boolean)
  if (parts.length === 1) {
    const single = normalizeFragment(parts[0])
    if (single === "custom orders") return "We handle custom orders."
    if (single === "wholesale options") return "Wholesale options are available."
    if (single === "same-day shipping") return "Same-day shipping is available."
    return value
  }
  if (parts.length < 2) return value

  const normalized = parts.map(normalizeFragment)
  const fragmentLike = normalized.every(part => !/\b(is|are|we|our|offer|offers|make|makes|serve|serves|provide|provides|handle|handles|help|helps)\b/i.test(part))
  if (!fragmentLike) return value

  const industry = `${context?.industry ?? ""} ${context?.subIndustry ?? ""}`.toLowerCase()
  const familyOwned = normalized.includes("family owned")
  const openLate = normalized.includes("open late")
  const relaxing = normalized.includes("relaxing")
  const freeEstimates = normalized.includes("free estimates")
  const core = normalized.filter(part => !["family owned", "open late", "relaxing", "free estimates"].includes(part))

  if (industry.includes("food") || industry.includes("restaurant") || industry.includes("cafe") || industry.includes("taco")) {
    const food = removeFromList(core, ["catering"])
    const actions = [
      hasMeaningfulList(food) ? `serve ${joinHumanList(food)}` : null,
      core.includes("catering") ? "offer catering" : null,
    ].filter(Boolean)
    if (!actions.length) return value
    if (food.includes("made-from-scratch food") && food.includes("family recipes")) {
      const extras = food.filter(part => !["made-from-scratch food", "family recipes"].includes(part))
      return `We serve made-from-scratch food with family recipes${extras.length ? `, ${joinHumanList(extras)}` : ""}.`
    }
    if (familyOwned && openLate) return `We ${joinHumanList(actions as string[])} and keep things welcoming for families and late-night guests.`
    if (familyOwned) return `We ${joinHumanList(actions as string[])} with recipes shaped by family tradition.`
    if (openLate) return `We ${joinHumanList(actions as string[])} with hours that work later in the day.`
    return `We ${joinHumanList(actions as string[])}.`
  }

  if (industry.includes("home_services") || industry.includes("contract") || industry.includes("cleaning") || industry.includes("landscaping")) {
    const detail = removeFromList(core, ["family-owned service", "free estimates"])
    if (!hasAnyMeaningfulDetail(detail)) return value
    const action = industry.includes("cleaning") ? "offer" : "handle"
    const familyOwnedService = core.includes("family-owned service")
    const support = detail.includes("bilingual support") ? " with bilingual support" : ""
    const work = removeFromList(detail, ["bilingual support"])
    if (!hasAnyMeaningfulDetail(work)) return value
    if (familyOwnedService && work.length === 1 && /years of experience/.test(work[0])) {
      return `Family-owned with ${work[0]}, we provide ${freeEstimates ? "free estimates and " : ""}clear communication from start to finish.`
    }
    const supportTail = support ? ", and bilingual support" : ""
    const tail = freeEstimates ? ` with free estimates, steady follow-through${supportTail}` : ` with clear communication and steady follow-through${supportTail}`
    return `We ${action} ${joinHumanList(work)}${tail}.`
  }

  if (industry.includes("beauty")) {
    if (!hasMeaningfulList(core)) return value
    const years = core.find(part => /years of experience/.test(part))
    const walkIns = core.includes("walk-ins")
    const details = removeFromList(core, ["walk-ins", years ?? ""])
    if (walkIns && years) return `We welcome walk-ins and bring ${years} to every appointment.`
    return `We offer ${joinHumanList(details.length ? details : core)} in a space built around care and confidence.`
  }

  if (industry.includes("wellness")) {
    if (!hasMeaningfulList(core)) return value
    const details = core.includes("bilingual support") && core.length > 1 ? removeFromList(core, ["bilingual support"]) : core
    const support = core.includes("bilingual support") ? " with bilingual support" : ""
    const tail = relaxing ? " designed to help clients slow down and feel restored" : ` in a calm, thoughtful setting${support}`
    return `We offer ${joinHumanList(details)}${tail}.`
  }

  if (industry.includes("photography")) {
    if (!hasMeaningfulList(core)) return value
    const experience = core.find(part => /years of experience/.test(part))
    const subjects = core.filter(part => part !== experience)
    if (experience) return `We photograph ${joinHumanList(subjects)} with ${experience}.`
    return `We photograph ${joinHumanList(core)} with a calm process and a clean final look.`
  }

  if (industry.includes("event")) {
    const eventTypes = core.filter(part => /weddings|birthdays|parties|celebrations|large events/.test(part))
    const details = core.filter(part => !eventTypes.includes(part))
    if (!hasMeaningfulList(core)) return value
    if (details.length && eventTypes.length) {
      const [primary, secondary, ...rest] = details
      const support = rest.length ? `, with ${joinHumanList(rest)}` : ""
      return `We create ${primary}${secondary ? ` and ${secondary}` : ""} for ${joinHumanList(eventTypes)}${support}.`
    }
    return `We create ${joinHumanList(core)} with a polished touch.`
  }

  if (industry.includes("music")) {
    if (!hasMeaningfulList(core)) return value
    const familyFriendly = core.includes("family-friendly sets")
    const details = removeFromList(core, ["family-friendly sets"])
    const [primary, secondary, ...rest] = details
    const support = rest.length ? `, with ${joinHumanList(rest)}` : ""
    return `We bring ${primary}${secondary ? ` and ${secondary}` : ""}${support}${familyFriendly ? " for family-friendly events" : " to events that need a reliable live set"}.`
  }

  if (industry.includes("creative")) {
    if (!hasMeaningfulList(core)) return value
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
  return { local, normalized, subject, descriptor, location: introMatch[3].trim() }
}

function compactForCompare(value: string) {
  return normalizeForIntroCompare(value).replace(/\s+/g, "")
}

function introSentencesOverlap(previousIntro: NonNullable<ReturnType<typeof aboutIntroInfo>>, currentIntro: NonNullable<ReturnType<typeof aboutIntroInfo>>, context?: CopyPolishContext) {
  const sameSubject = previousIntro.subject === currentIntro.subject || compactForCompare(previousIntro.subject) === compactForCompare(currentIntro.subject)
  const business = context?.businessName ? compactForCompare(context.businessName) : ""
  const previousIsBusiness = business && compactForCompare(previousIntro.subject) === business
  const currentIsBusiness = business && compactForCompare(currentIntro.subject) === business
  const sameDescriptor = previousIntro.descriptor.includes(currentIntro.descriptor) || currentIntro.descriptor.includes(previousIntro.descriptor)
  const sameLocation = previousIntro.location === currentIntro.location
  return sameLocation && sameDescriptor && (sameSubject || previousIsBusiness || currentIsBusiness || compactForCompare(previousIntro.subject).includes(compactForCompare(currentIntro.subject)) || compactForCompare(currentIntro.subject).includes(compactForCompare(previousIntro.subject)))
}

function strongerIntro(previous: string, current: string, previousIntro: NonNullable<ReturnType<typeof aboutIntroInfo>>, currentIntro: NonNullable<ReturnType<typeof aboutIntroInfo>>, context?: CopyPolishContext) {
  if (currentIntro.local && !previousIntro.local) return normalizeIntroBusinessName(current, context)
  if (!currentIntro.local && previousIntro.local) return normalizeIntroBusinessName(previous, context)
  if (currentIntro.descriptor.length > previousIntro.descriptor.length) return normalizeIntroBusinessName(current, context)
  return normalizeIntroBusinessName(previous, context)
}

function normalizeIntroBusinessName(sentence: string, context?: CopyPolishContext) {
  if (!context?.businessName) return sentence
  const business = polishTitle(context.businessName)
  const intro = aboutIntroInfo(sentence, context)
  if (!intro) return sentence
  const subjectPattern = regexEscape(intro.subject).replace(/\ /g, "\\s+")
  return sentence.replace(new RegExp(`^${subjectPattern}\\b`, "i"), business)
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
      if (previousIntro && currentIntro && introSentencesOverlap(previousIntro, currentIntro, context)) {
        result[result.length - 1] = strongerIntro(previous, current, previousIntro, currentIntro, context)
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
function normalizeBrokenRetailSentence(value: string) {
  return value
    .replace(/\bWe create,\s*creative,\s*and\s*custom designs for all T-shirts,\s*custom orders\./i, "We create custom T-shirt designs and custom orders.")
    .replace(/\bWe offer online retail experience,\s*same-day shipping,\s*and wholesale options with care and clear next steps\./i, "We offer online retail experience, same-day shipping, and wholesale options.")
    .replace(/water-smart designs,\s*hardscape work/gi, "water-smart designs and hardscape work")
    .replace(/\bWe have been in selling in\b/i, "We have been selling in")
}

function normalizeBusinessNameMentions(value: string, context?: CopyPolishContext) {
  if (!context?.businessName) return value
  const business = polishTitle(context.businessName)
  const compactBusiness = compactForCompare(business)
  return value.replace(/(^|[.!?]\s+)([A-Za-z0-9 '&.-]{2,80}?)(?=\s+(?:is|serves)\b)/g, (match, prefix: string, subject: string) => {
    return compactForCompare(subject) === compactBusiness ? `${prefix}${business}` : match
  })
}

function splitLongCommaSentence(sentence: string) {
  const commaCount = (sentence.match(/,/g) || []).length
  if (sentence.length < 120 || commaCount < 3) return sentence
  const firstCommaIndex = sentence.indexOf(",")
  const firstAndIndex = sentence.indexOf(" and ")
  if (commaCount <= 4 && firstAndIndex !== -1 && (firstCommaIndex === -1 || firstAndIndex < firstCommaIndex) && /\swith\s/i.test(sentence)) return sentence

  const offerMatch = sentence.match(/^(We (?:offer|handle|create) )(.+?)(?: with (.+))?\.$/i)
  if (offerMatch) {
    const prefix = offerMatch[1]
    const listText = offerMatch[2].replace(/,?\s+and\s+/i, ", ")
    const tail = offerMatch[3]
    const parts = listText
      .split(/,\s*/)
      .map(part => part.trim().replace(/\s+welcome$/i, "").replace(/^bilingual team$/i, "bilingual support"))
      .filter(Boolean)
    if (parts.length >= 4) {
      const first = parts.slice(0, 3)
      const rest = parts.slice(3)
      if (first.length === 3) return `${prefix}${first[0]} and ${first[1]} for ${first[2]}, with ${joinHumanList(rest)}.`
      return `${prefix}${joinHumanList(first)}${rest.length ? `, with ${joinHumanList(rest)}` : ""}.`
    }
  }

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

  cleaned = normalizeBrokenRetailSentence(cleaned)
  cleaned = replaceRawIndustryLabels(cleaned, context)
  cleaned = normalizeBusinessNameMentions(cleaned, context)
  cleaned = cleaned.replace(/\ba locally owned ([a-z_]+(?: [a-z_]+){0,2})([,.])/i, (match: string, label: string, punctuation: string) => {
    if (/\bin\b/i.test(label)) return match
    return `a locally owned ${industry}${punctuation}`
  })
  cleaned = cleaned.replace(/\ba ([a-z_ ]+?) in Your Area\b/i, `a ${industry}${location ? ` in ${location}` : ""}`)
  cleaned = cleaned.replace(/\bWholesale available\b/gi, "wholesale options are available")
  cleaned = cleaned.replace(/\bSame-day\b/g, "same-day")
  cleaned = cleaned.replace(/,\s+and\s+with\s+/gi, " with ")
  cleaned = decapitalizeBodyTitleCase(cleaned)
  cleaned = collapseDuplicateIntroParagraph(cleaned, context)
  cleaned = normalizeBusinessNameMentions(normalizeBrokenRetailSentence(cleaned), context)

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentenceFromFragments(sentence.trim(), context))
    .map(splitLongCommaSentence)
    .filter(Boolean)

  cleaned = normalizeBrokenRetailSentence(removeRedundantIntroSentences(sentences, context).join(" "))
  cleaned = cleaned.replace(/,?\s+and\s+with\s+/gi, " with ")
  cleaned = cleaned.replace(/\s+/g, " ").trim()
  cleaned = cleaned.replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`)
  if (!/[.!?]$/.test(cleaned)) cleaned += "."

  if (businessName) {
    const firstSubject = cleaned.match(/^(.+?)\s+is\s+(?:a|an)\s+/i)?.[1] ?? ""
    const businessPattern = regexEscape(businessName).replace(/\ /g, "\\s+")
    const startsWithBusiness = new RegExp(`^${businessPattern}\\b`, "i").test(cleaned) || compactForCompare(firstSubject) === compactForCompare(businessName)
    if (startsWithBusiness && firstSubject && firstSubject !== businessName) {
      const subjectPattern = regexEscape(firstSubject).replace(/\ /g, "\\s+")
      cleaned = cleaned.replace(new RegExp(`^${subjectPattern}\\b`, "i"), businessName)
    } else if (!startsWithBusiness && cleaned.length < 260) {
      cleaned = `${businessName} is a ${location ? `${industry} in ${location}` : industry}. ${cleaned}`
    }
  }

  return cleaned
}
const TEMPLATE_SMELL_PATTERNS = [
  /handled with clear communication/i,
  /careful work, and an easy path/i,
  /from first question to finished result/i,
  /professional .+ with clear communication/i,
  /clear options, thoughtful guidance/i,
  /easy next step/i,
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
  if (/[a-z][A-Z]/.test(word)) return word
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

function cleanCatalogOptions(value: unknown) {
  if (!Array.isArray(value)) return null
  const options = value
    .map((option) => {
      if (!option || typeof option !== "object") return null
      const row = option as { label?: unknown; choices?: unknown }
      const label = polishShortCopy(row.label).replace(/[.]+$/, "")
      const choices = Array.isArray(row.choices)
        ? Array.from(new Set(row.choices.map(choice => polishShortCopy(choice).replace(/[.]+$/, "")).filter(Boolean))).slice(0, 30)
        : []
      return label && choices.length ? { label, choices } : null
    })
    .filter((option): option is { label: string; choices: string[] } => option !== null)
    .slice(0, 6)
  return options.length ? options : null
}

function cleanCatalogVariants(value: unknown) {
  if (!Array.isArray(value)) return null
  const variants = value
    .map((variant) => {
      if (!variant || typeof variant !== "object") return null
      const row = variant as { id?: unknown; options?: unknown; stock?: unknown }
      const options: Record<string, string> = {}
      if (row.options && typeof row.options === "object") {
        for (const [label, choice] of Object.entries(row.options as Record<string, unknown>)) {
          const cleanLabel = polishShortCopy(label).replace(/[.]+$/, "")
          const cleanChoice = polishShortCopy(choice).replace(/[.]+$/, "")
          if (cleanLabel && cleanChoice) options[cleanLabel] = cleanChoice
        }
      }
      const numericStock = row.stock === null || row.stock === undefined || row.stock === "" ? null : Math.max(0, Math.floor(Number(row.stock)))
      return Object.keys(options).length ? { id: typeof row.id === "string" && row.id.trim() ? row.id.trim().slice(0, 180) : Object.values(options).join("-"), options, stock: Number.isFinite(numericStock as number) ? numericStock : null } : null
    })
    .filter((variant): variant is { id: string; options: Record<string, string>; stock: number | null } => variant !== null)
    .slice(0, 500)
  return variants.length ? variants : null
}

function cleanFulfillment(value: unknown) {
  return value === "pickup" || value === "shipping" || value === "both" || value === "unavailable" ? value : null
}

function cleanItemFulfillment(value: unknown) {
  return value === "inherit" || value === "pickup" || value === "shipping" || value === "both" || value === "unavailable" ? value : null
}
export function polishMenuCategories(value: unknown): MenuCopyCategory[] {
  if (!Array.isArray(value)) return []
  const categories: MenuCopyCategory[] = []

  for (const category of value) {
    if (!category || typeof category !== "object") continue
    const row = category as { category?: unknown; items?: unknown; catalog_settings?: unknown }
    const sourceItems = Array.isArray(row.items) ? row.items : []
    const items: MenuCopyCategory["items"] = []

    for (const item of sourceItems) {
      if (!item || typeof item !== "object") continue
      const menuItem = item as { name?: unknown; description?: unknown; price?: unknown; photo_url?: unknown; images?: unknown; details?: unknown; options?: unknown; variants?: unknown; inventory_tracking?: unknown; fulfillment?: unknown; availability?: unknown; sizes?: unknown; materials?: unknown; shipping_note?: unknown }
      const name = polishTitle(menuItem.name, "Item")
      const images = Array.isArray(menuItem.images)
        ? menuItem.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0).map(image => image.trim()).slice(0, 6)
        : []
      const primaryPhoto = typeof menuItem.photo_url === "string" && menuItem.photo_url.trim()
        ? menuItem.photo_url.trim()
        : images[0] ?? null
      const details = Array.isArray(menuItem.details)
        ? menuItem.details
          .map(detail => {
            if (!detail || typeof detail !== "object") return null
            const row = detail as { label?: unknown; value?: unknown }
            const label = polishShortCopy(row.label).replace(/[.]+$/, "")
            const value = polishSentence(row.value, "")
            return label && value ? { label, value } : null
          })
          .filter((detail): detail is { label: string; value: string } => detail !== null)
          .slice(0, 6)
        : []

      items.push({
        name,
        description: polishSentence(menuItem.description, ""),
        price: typeof menuItem.price === "string" && menuItem.price.trim() ? menuItem.price.trim() : null,
        photo_url: primaryPhoto,
        images: images.length ? images : primaryPhoto ? [primaryPhoto] : null,
        details: details.length ? details : null,
        options: cleanCatalogOptions(menuItem.options),
        variants: cleanCatalogVariants(menuItem.variants),
        inventory_tracking: typeof menuItem.inventory_tracking === "boolean" ? menuItem.inventory_tracking : null,
        fulfillment: cleanItemFulfillment(menuItem.fulfillment),
        availability: menuItem.availability === "hidden" || menuItem.availability === "sold_out" ? menuItem.availability : "active",
        sizes: typeof menuItem.sizes === "string" && menuItem.sizes.trim() ? polishShortCopy(menuItem.sizes).replace(/[.]+$/, "") : null,
        materials: typeof menuItem.materials === "string" && menuItem.materials.trim() ? polishShortCopy(menuItem.materials).replace(/[.]+$/, "") : null,
        shipping_note: typeof menuItem.shipping_note === "string" && menuItem.shipping_note.trim() ? polishSentence(menuItem.shipping_note, "") : null,
      })
    }

    const catalogSettings = row.catalog_settings && typeof row.catalog_settings === "object" ? row.catalog_settings as { fulfillment?: unknown; payment_behavior?: unknown } : null
    categories.push({
      category: polishTitle(row.category, "Menu"),
      catalog_settings: catalogSettings ? { fulfillment: cleanFulfillment(catalogSettings.fulfillment) ?? "both", payment_behavior: catalogSettings.payment_behavior === "pay_later" ? "pay_later" : "online_required" } : null,
      items,
    })
  }

  return categories
}

function improvedHeroSubtitle(value: string, context?: CopyPolishContext) {
  const location = context?.city || "your area"
  const industry = humanIndustryLabel(context)
  const label = `${context?.industry ?? ""} ${context?.subIndustry ?? ""}`.toLowerCase()

  if (/come see what we're all about/i.test(value)) {
    if (/restaurant|food|cafe|coffee|taco/.test(label)) return `A local restaurant in ${location} serving food made for the neighborhood.`
    if (/apparel|retail|shop|clothing/.test(label)) return `A local ${industry} in ${location} with pieces selected for everyday style.`
    return `A local ${industry} in ${location} with a clear reason to visit.`
  }

  if (/real results/i.test(value)) {
    if (/beauty|barber|esthetician|salon|spa|wellness/.test(label)) return `${polishTitle(context?.subIndustry || context?.industry || "Care")} in ${location} with calm scheduling and careful personal care.`
    return `${polishTitle(context?.subIndustry || context?.industry || "Service")} in ${location} with simple scheduling and dependable follow-through.`
  }

  return value
}

export function polishHeroCopy(value: unknown, context?: CopyPolishContext) {
  if (typeof value !== "string") return ""
  const cleaned = replaceRawIndustryLabels(applyKnownFixes(normalizeWhitespace(value)), context)
  return polishSentence(improvedHeroSubtitle(cleaned, context))
}

export function polishHeroTitle(value: unknown, context?: CopyPolishContext) {
  if (typeof value !== "string") return ""
  return titleCaseHumanIndustry(applyKnownFixes(normalizeWhitespace(value)), context)
}
export function polishAboutHighlights(value: unknown): { title: string; body: string }[] | null {
  if (!Array.isArray(value)) return null
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const row = item as { title?: unknown; body?: unknown; text?: unknown; description?: unknown }
      const title = polishShortCopy(row.title).replace(/[.]+$/, "")
      const body = polishSentence(row.body ?? row.text ?? row.description)
      return title && body ? { title, body } : null
    })
    .filter((item): item is { title: string; body: string } => item !== null)
  return items.length ? items.slice(0, 3) : null
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
    case "about_preview":
    case "about_story":
      return polishAboutCopy(value, context)
    case "about_highlights":
      return polishAboutHighlights(value)
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
  for (const field of ["hero_title", "hero_subtitle", "about_text", "about_preview", "about_story", "about_highlights", "tagline", "cta_headline", "services", "faq_items", "menu_items"]) {
    if (field in polished) polished[field] = polishWebsiteField(field, polished[field], context)
  }
  return polished as T
}