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

const keywordMap: Array<{ industry: string; terms: string[]; strongTerms?: string[] }> = [
  {
    industry: "home_services",
    terms: ["roof", "remodel", "painting", "drywall", "floor", "contractor", "construction", "plumbing", "electrical", "handyman", "install", "air conditioning", "heating", "cooling", "furnace", "ac repair", "duct"],
    strongTerms: ["hvac", "air conditioning", "heating and cooling", "heating", "cooling", "furnace", "ac repair"],
  },
  {
    industry: "real_estate",
    terms: ["real estate", "realtor", "property manager", "property management", "buy houses", "sell houses", "brokerage", "listing agent", "buyers agent", "sellers agent"],
    strongTerms: ["real estate", "realtor", "brokerage", "listing agent"],
  },
  { industry: "food", terms: ["restaurant", "food", "smoothie", "bakery", "coffee", "catering", "meal", "truck", "kitchen"] },
  { industry: "wellness", terms: ["spa", "massage", "wellness", "therapy", "therapist", "yoga", "meditation", "acupuncture"] },
  { industry: "events", terms: ["event", "wedding", "party", "balloon", "venue", "decor", "dj", "photography"] },
  { industry: "retail", terms: ["shop", "store", "boutique", "retail", "products", "bicycle", "bike", "gift"] },
  { industry: "fitness", terms: ["gym", "fitness", "training", "trainer", "pilates", "boxing", "martial arts", "workout"] },
  { industry: "beauty", terms: ["salon", "barber", "nails", "hair", "lashes", "makeup", "esthetician", "pedicure", "manicure"] },
  { industry: "automotive", terms: ["auto", "car", "mechanic", "detailing", "tires", "oil change", "body shop"] },
  { industry: "pet_services", terms: ["pet", "dog", "cat", "grooming", "groomer", "boarding", "dog walker", "pet sitter"] },
  { industry: "cleaning", terms: ["cleaning", "cleaner", "maid", "janitorial", "move-out", "window cleaning", "carpet"] },
  { industry: "landscaping", terms: ["landscape", "lawn", "yard", "garden", "pavers", "tree", "irrigation", "hardscape"] },
  {
    industry: "creative_services",
    terms: ["graphic design", "designer", "photographer", "photography", "videographer", "video", "branding", "illustrator", "copywriter", "social media", "web design", "tattoo", "mural", "artist"],
    strongTerms: ["graphic designer", "branding designer", "web designer", "tattoo artist"],
  },
  {
    industry: "home_based_food",
    terms: ["homemade", "home kitchen", "cottage", "tortilla", "tamale", "tamales", "custom cake", "cakes", "jam", "preserves", "salsa", "hot sauce", "small batch", "made at home", "bakes from home"],
    strongTerms: ["cottage food", "home baker", "home kitchen", "tortilla maker", "tamale maker"],
  },
  {
    industry: "education",
    terms: ["tutor", "tutoring", "lessons", "instructor", "teach", "teacher", "coaching", "class", "learn", "swim lessons", "driving school", "test prep", "reading specialist"],
    strongTerms: ["private tutor", "music lessons", "art lessons", "dance instructor", "swim lessons", "language tutor", "test prep"],
  },
  {
    industry: "music_performance",
    terms: ["musician", "band", "singer", "performer", "comedy", "comedian", "magician", "entertainer", "face paint", "spoken word", "live music", "cover band", "quartet", "booking"],
    strongTerms: ["live music", "cover band", "solo musician", "string quartet", "children's entertainer"],
  },
  {
    industry: "professional_services",
    terms: ["accountant", "bookkeeper", "tax", "attorney", "lawyer", "notary", "insurance", "financial advisor", "mortgage", "consultant", "business coach", "hr"],
    strongTerms: ["cpa", "tax preparer", "financial advisor", "insurance agent", "mortgage broker", "business attorney"],
  },
  {
    industry: "healthcare",
    terms: ["dentist", "chiropractor", "physical therapy", "speech therapy", "optometrist", "dermatologist", "audiologist", "acupuncture", "naturopath", "counselor", "psychologist", "clinic", "medical", "health"],
    strongTerms: ["dentist", "chiropractor", "physical therapist", "speech therapist", "optometrist", "therapist/counselor"],
  },
  {
    industry: "childcare",
    terms: ["daycare", "babysitter", "nanny", "after school", "preschool", "child care", "childcare", "doula", "postpartum", "newborn care", "early childhood"],
    strongTerms: ["licensed daycare", "in-home daycare", "after-school care", "doula", "postpartum doula", "newborn care"],
  },
  {
    industry: "makers_crafts",
    terms: ["jewelry", "ceramics", "pottery", "woodwork", "candle", "soap", "tailor", "sewing", "screen print", "leather", "weave", "textile", "handmade", "craft", "maker", "studio", "glasswork"],
    strongTerms: ["jewelry maker", "ceramicist", "candle maker", "soap maker", "screen printer", "leatherworker"],
  },
  {
    industry: "home_property",
    terms: ["interior design", "home organizer", "junk removal", "moving", "mover", "home inspector", "pest control", "locksmith", "pool service", "window clean", "pressure wash", "organizer"],
    strongTerms: ["interior designer", "junk removal", "home inspector", "pest control", "locksmith", "pool service"],
  },
  {
    industry: "nonprofit",
    terms: ["nonprofit", "charity", "church", "mosque", "temple", "community center", "volunteer", "mutual aid", "animal rescue", "food bank", "donation", "501c3", "ministry", "congregation"],
    strongTerms: ["nonprofit", "501c3", "food bank", "animal rescue", "mutual aid", "community center"],
  },
]

export function detectIndustry(input: string): string | null {
  const text = input.toLowerCase()
  let bestMatch: { industry: string; score: number } | null = null

  for (const { industry, terms, strongTerms = [] } of keywordMap) {
    const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0)
      + strongTerms.reduce((total, term) => total + (text.includes(term) ? 4 : 0), 0)
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { industry, score }
    }
  }

  return bestMatch?.industry ?? null
}
