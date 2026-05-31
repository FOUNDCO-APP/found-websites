const PEXELS_API_KEY = process.env.PEXELS_API_KEY || ""
const BASE_URL = "https://api.pexels.com/v1"

const industryQueries: Record<string, string> = {
  home_services:  "home renovation contractor construction remodeling",
  wellness:       "spa wellness relaxation massage therapy",
  food:           "restaurant food dining kitchen chef",
  events:         "event celebration party decoration venue",
  retail:         "retail store shopping boutique",
  fitness:        "fitness gym workout training",
  beauty:         "beauty salon hair styling",
  automotive:     "auto mechanic car repair garage",
  pet_services:   "pet grooming dog cat animal",
  cleaning:       "cleaning professional home service",
  landscaping:    "landscaping garden outdoor lawn",
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

// Fetch multiple photos for a company — used to populate stock_images on first visit
export async function fetchStockPhotos(
  industryCategory: string,
  vibe: string,
  count: number = 5,
  city?: string | null
): Promise<string[]> {
  const base = industryQueries[industryCategory] ?? "small business professional service"
  const modifier = vibeModifiers[vibe] ?? ""
  const query = [base, modifier].filter(Boolean).join(" ")

  const photos = await searchPexels(query)
  if (!photos.length) return []

  // Shuffle for variety across companies
  const shuffled = [...photos].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Convenience wrapper — returns a single photo URL
export async function fetchStockPhoto(
  industryCategory: string,
  vibe: string,
  city?: string | null
): Promise<string | null> {
  const results = await fetchStockPhotos(industryCategory, vibe, 1, city)
  return results[0] ?? null
}
