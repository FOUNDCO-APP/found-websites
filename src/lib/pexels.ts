const PEXELS_API_KEY = process.env.PEXELS_API_KEY || ""
const BASE_URL = "https://api.pexels.com/v1"

const industryQueries: Record<string, string> = {
  home_services: "home renovation remodeling interior contractor house improvement",
  wellness:      "spa massage wellness relaxation peaceful serene therapy",
  food:          "fresh food healthy meal restaurant colorful ingredients",
  events:        "event party celebration decoration colorful venue balloons",
  retail:        "boutique shop retail store product display stylish",
  fitness:       "gym fitness workout exercise training athlete strong",
  beauty:        "salon beauty hair nail makeup cosmetics styling",
  automotive:    "car repair mechanic auto service garage vehicle",
  pet_services:  "dog cat pet grooming animal cute happy",
  cleaning:      "clean home professional spotless organized service",
  landscaping:   "garden landscape lawn outdoor plants nature green",
}

const vibeModifiers: Record<string, string> = {
  bold:   "dramatic professional strong",
  calm:   "soft minimal serene light",
  modern: "modern clean contemporary",
  warm:   "warm cozy friendly community",
}

async function searchPexels(query: string): Promise<string[]> {
  if (!PEXELS_API_KEY) {
    console.warn("[pexels] PEXELS_API_KEY not set")
    return []
  }
  try {
    const res = await fetch(
      `${BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
      {
        headers: { Authorization: PEXELS_API_KEY },
        next: { revalidate: 86400 },
      }
    )
    if (!res.ok) {
      console.error("[pexels] API error:", res.status)
      return []
    }
    const data = await res.json()
    const photos: { src: { large2x: string } }[] = data.photos || []
    return photos.map(p => p.src.large2x)
  } catch (err) {
    console.error("[pexels] fetch failed:", err)
    return []
  }
}

// photo_keywords on the company row overrides the industry default.
// This lets a smoothie shop get smoothie photos instead of generic food photos.
export async function fetchStockPhotos(
  industryCategory: string,
  vibe: string,
  count: number = 5,
  city?: string | null,
  photoKeywords?: string | null
): Promise<string[]> {
  const base = photoKeywords || industryQueries[industryCategory] || "small business professional service"
  const modifier = vibeModifiers[vibe] ?? ""
  const query = [base, modifier].filter(Boolean).join(" ")

  const photos = await searchPexels(query)
  if (!photos.length) return []

  const shuffled = [...photos].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export async function fetchStockPhoto(
  industryCategory: string,
  vibe: string,
  city?: string | null,
  photoKeywords?: string | null
): Promise<string | null> {
  const results = await fetchStockPhotos(industryCategory, vibe, 1, city, photoKeywords)
  return results[0] ?? null
}
