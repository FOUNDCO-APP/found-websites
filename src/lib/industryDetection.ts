export const industryLabels: Record<string, string> = {
  home_services: "Home Services",
  food: "Food",
  wellness: "Wellness",
  events: "Events",
  retail: "Retail",
  fitness: "Fitness",
  beauty: "Beauty",
  automotive: "Automotive",
  pet_services: "Pet Services",
  cleaning: "Cleaning",
  landscaping: "Landscaping",
  real_estate: "Real Estate",
  creative_services: "Creative Services",
  home_based_food: "Home-Based Food",
  education: "Education & Instruction",
  music_performance: "Music & Performance",
  professional_services: "Professional Services",
  healthcare: "Healthcare",
  childcare: "Childcare & Family",
  makers_crafts: "Makers & Crafts",
  home_property: "Home & Property",
  nonprofit: "Nonprofit & Community",
}

type KeywordConfig = {
  industry: string
  terms: string[]
  strongTerms?: string[]
}

const keywordMap: KeywordConfig[] = [
  {
    industry: "home_services",
    terms: [
      "roof", "roofer", "roofing", "remodel", "remodeler", "remodeling", "renovation", "painting", "painter", "paint", "drywall", "floor", "flooring", "tile", "hvac", "plumber", "plumbing", "electrician", "electrical", "handyman", "contractor", "construction", "concrete", "masonry", "fence", "fencing", "garage door", "window install", "door install", "camera install", "tv install", "air conditioning", "heating", "cooling", "furnace", "ac repair", "duct",
    ],
    strongTerms: ["hvac", "roofer", "roofing", "plumber", "electrician", "air conditioning", "heating and cooling", "ac repair", "general contractor"],
  },
  {
    industry: "real_estate",
    terms: ["real estate", "realtor", "realty", "property manager", "property management", "buy houses", "sell houses", "brokerage", "broker", "listing agent", "buyer agent", "buyers agent", "seller agent", "sellers agent", "commercial agent", "homes for sale"],
    strongTerms: ["real estate", "realtor", "brokerage", "listing agent", "property manager"],
  },
  {
    industry: "food",
    terms: ["restaurant", "food", "smoothie", "bakery", "baker", "coffee", "cafe", "catering", "caterer", "meal prep", "food truck", "kitchen", "taco", "pizza", "burger", "sandwich", "bbq", "barbecue", "deli", "ice cream", "juice", "chef", "personal chef"],
    strongTerms: ["restaurant", "food truck", "coffee shop", "smoothie shop", "meal prep", "catering"],
  },
  {
    industry: "wellness",
    terms: ["spa", "massage", "masseuse", "wellness", "therapy", "therapist", "yoga", "meditation", "acupuncture", "reiki", "holistic", "wellness coach", "life coach", "breathwork", "sound bath"],
    strongTerms: ["massage therapist", "yoga studio", "wellness coach", "acupuncture"],
  },
  {
    industry: "events",
    terms: ["event", "events", "wedding", "weddings", "party", "parties", "balloon", "balloons", "venue", "decor", "decorator", "dj", "rental", "rentals", "photo booth", "wedding photography", "event photography", "party rental"],
    strongTerms: ["event planning", "wedding planner", "balloon garland", "balloon decor", "party rentals", "photo booth"],
  },
  {
    industry: "retail",
    terms: ["shop", "store", "boutique", "retail", "product", "products", "shirt", "shirts", "clothing", "apparel", "merch", "merchandise", "online store", "ecommerce", "e-commerce", "gift", "gifts", "home goods", "beauty store", "bike shop", "bicycle", "bike", "shoes", "sneakers", "digital product", "digital products"],
    strongTerms: ["online store", "retail store", "sell shirts", "apparel brand", "shopping cart", "digital products"],
  },
  {
    industry: "fitness",
    terms: ["gym", "fitness", "training", "trainer", "personal trainer", "pilates", "boxing", "martial arts", "workout", "coach", "strength", "conditioning", "bootcamp", "crossfit", "dance fitness"],
    strongTerms: ["personal trainer", "fitness coach", "yoga fitness", "martial arts", "boxing gym"],
  },
  {
    industry: "beauty",
    terms: ["salon", "barber", "barbershop", "nail", "nails", "hair", "hairstylist", "stylist", "lashes", "lash", "makeup", "esthetician", "pedicure", "manicure", "brows", "waxing", "facial", "skincare", "spray tan"],
    strongTerms: ["hair salon", "nail salon", "barbershop", "lash artist", "makeup artist", "esthetician"],
  },
  {
    industry: "automotive",
    terms: ["auto", "automotive", "car", "cars", "vehicle", "vehicles", "mechanic", "detailing", "detailer", "tires", "oil change", "body shop", "collision", "mobile mechanic", "car audio", "wrap", "tint", "transmission", "brakes", "brake repair"],
    strongTerms: ["auto repair", "body shop", "mobile mechanic", "oil change", "car detailing", "brake repair"],
  },
  {
    industry: "pet_services",
    terms: ["pet", "pets", "dog", "dogs", "cat", "cats", "grooming", "groomer", "boarding", "dog walker", "pet sitter", "pet sitting", "trainer", "dog trainer", "mobile grooming", "kennel", "puppy"],
    strongTerms: ["pet groomer", "dog walker", "pet sitter", "dog trainer", "mobile grooming"],
  },
  {
    industry: "cleaning",
    terms: ["cleaning", "cleaner", "cleaners", "maid", "maids", "janitorial", "move out", "move-out", "window cleaning", "carpet cleaning", "deep clean", "house cleaning", "commercial cleaning", "office cleaning", "pressure washing", "power washing"],
    strongTerms: ["house cleaning", "commercial cleaning", "window cleaning", "carpet cleaning", "move-out cleaning"],
  },
  {
    industry: "landscaping",
    terms: ["landscaping", "landscaper", "landscape", "lawn care", "lawn", "yard", "garden", "gardener", "pavers", "paver", "tree", "trees", "tree trimming", "tree service", "irrigation", "sprinkler", "sprinklers", "hardscape", "hardscaping", "turf", "grass", "outdoor lighting"],
    strongTerms: ["landscaping", "landscaper", "lawn care", "tree trimming", "tree service", "irrigation", "hardscaping"],
  },
  {
    industry: "creative_services",
    terms: ["graphic design", "designer", "photographer", "photography", "videographer", "videography", "video", "branding", "brand design", "illustrator", "copywriter", "social media", "web design", "website designer", "tattoo", "mural", "artist", "creative", "portfolio", "content creator"],
    strongTerms: ["graphic designer", "photographer", "photography", "videographer", "branding designer", "web designer", "tattoo artist", "muralist", "social media manager"],
  },
  {
    industry: "home_based_food",
    terms: ["homemade", "home kitchen", "cottage", "cottage food", "tortilla", "tortillas", "tamale", "tamales", "custom cake", "custom cakes", "cake", "cakes", "jam", "preserves", "salsa", "hot sauce", "small batch", "made at home", "bakes from home", "home baker", "cottage baker"],
    strongTerms: ["cottage food", "home baker", "home kitchen", "tortilla maker", "tamale maker", "custom cakes", "bakes from home"],
  },
  {
    industry: "education",
    terms: ["tutor", "tutoring", "lesson", "lessons", "instructor", "instruction", "teach", "teacher", "coaching", "class", "classes", "learn", "swim lessons", "driving school", "test prep", "reading specialist", "language tutor", "music lessons", "art lessons", "dance instructor"],
    strongTerms: ["private tutor", "music lessons", "art lessons", "dance instructor", "swim lessons", "driving school", "language tutor", "test prep"],
  },
  {
    industry: "music_performance",
    terms: ["musician", "music", "band", "singer", "performer", "performance", "comedy", "comedian", "magician", "entertainer", "face paint", "face painting", "spoken word", "live music", "cover band", "quartet", "booking", "guitarist", "pianist", "dj services"],
    strongTerms: ["live music", "cover band", "solo musician", "string quartet", "children's entertainer", "face painter"],
  },
  {
    industry: "professional_services",
    terms: ["accountant", "accounting", "bookkeeper", "bookkeeping", "tax", "taxes", "attorney", "lawyer", "law firm", "notary", "insurance", "financial advisor", "mortgage", "consultant", "consulting", "business coach", "hr", "payroll", "legal", "paralegal"],
    strongTerms: ["cpa", "tax preparer", "financial advisor", "insurance agent", "mortgage broker", "business attorney", "law firm"],
  },
  {
    industry: "healthcare",
    terms: ["dentist", "dental", "chiropractor", "chiropractic", "physical therapy", "physical therapist", "speech therapy", "speech therapist", "optometrist", "dermatologist", "audiologist", "acupuncture", "naturopath", "counselor", "psychologist", "clinic", "medical", "health", "doctor", "nurse", "therapy clinic"],
    strongTerms: ["dentist", "chiropractor", "physical therapist", "speech therapist", "optometrist", "therapist counselor", "medical clinic"],
  },
  {
    industry: "childcare",
    terms: ["daycare", "day care", "babysitter", "babysitting", "nanny", "after school", "preschool", "child care", "childcare", "doula", "postpartum", "newborn care", "early childhood", "kids care", "infant care"],
    strongTerms: ["licensed daycare", "in-home daycare", "after-school care", "child care", "postpartum doula", "newborn care"],
  },
  {
    industry: "makers_crafts",
    terms: ["jewelry", "ceramics", "ceramic", "pottery", "woodwork", "woodworking", "candle", "candles", "soap", "soaps", "tailor", "sewing", "screen print", "screen printing", "leather", "leatherwork", "weave", "weaving", "textile", "handmade", "craft", "crafts", "maker", "makers", "studio", "glasswork", "crochet", "knit", "embroidery"],
    strongTerms: ["jewelry maker", "ceramicist", "candle maker", "soap maker", "screen printer", "leatherworker", "handmade goods"],
  },
  {
    industry: "home_property",
    terms: ["interior design", "interior designer", "home organizer", "organizer", "junk removal", "moving", "mover", "home inspector", "inspection", "pest control", "locksmith", "pool service", "pool cleaning", "window clean", "pressure wash", "pressure washing", "power washing", "home staging", "property maintenance"],
    strongTerms: ["interior designer", "junk removal", "home inspector", "pest control", "locksmith", "pool service", "home organizer"],
  },
  {
    industry: "nonprofit",
    terms: ["nonprofit", "non profit", "charity", "church", "mosque", "temple", "community center", "volunteer", "mutual aid", "animal rescue", "food bank", "donation", "donations", "501c3", "ministry", "congregation", "foundation", "community program"],
    strongTerms: ["nonprofit", "non profit", "501c3", "food bank", "animal rescue", "mutual aid", "community center"],
  },
]

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function singleWordVariants(term: string) {
  const variants = new Set([term])
  if (term.length > 2) variants.add(`${term}s`)
  if (term.endsWith("y") && term.length > 2) variants.add(`${term.slice(0, -1)}ies`)
  if (term.endsWith("e") && term.length > 3) variants.add(`${term.slice(0, -1)}ing`)
  if (!term.endsWith("e") && term.length > 3) variants.add(`${term}ing`)
  if (!term.endsWith("er") && term.length > 3) variants.add(`${term}er`)
  return variants
}

function matchesTerm(normalizedText: string, tokens: Set<string>, term: string) {
  const normalizedTerm = normalizeText(term)
  if (!normalizedTerm) return false

  if (normalizedTerm.includes(" ")) {
    return ` ${normalizedText} `.includes(` ${normalizedTerm} `)
  }

  for (const variant of singleWordVariants(normalizedTerm)) {
    if (tokens.has(variant)) return true
  }
  return false
}

export function detectIndustry(input: string): string | null {
  const text = normalizeText(input)
  if (!text) return null

  const tokens = new Set(text.split(" ").filter(Boolean))
  let bestMatch: { industry: string; score: number } | null = null

  for (const { industry, terms, strongTerms = [] } of keywordMap) {
    const score = terms.reduce((total, term) => total + (matchesTerm(text, tokens, term) ? 1 : 0), 0)
      + strongTerms.reduce((total, term) => total + (matchesTerm(text, tokens, term) ? 4 : 0), 0)
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { industry, score }
    }
  }

  return bestMatch?.industry ?? null
}