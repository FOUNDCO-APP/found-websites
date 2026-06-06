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
}

const keywordMap: Array<{ industry: string; terms: string[] }> = [
  { industry: "real_estate", terms: ["real estate", "realtor", "property", "homes", "buy houses", "sell houses", "investor", "brokerage"] },
  { industry: "home_services", terms: ["roof", "remodel", "painting", "drywall", "floor", "contractor", "construction", "plumbing", "electrical", "handyman", "hvac", "install"] },
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
]

export function detectIndustry(input: string): string | null {
  const text = input.toLowerCase()
  return keywordMap.find(({ terms }) => terms.some((term) => text.includes(term)))?.industry ?? null
}
