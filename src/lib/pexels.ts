const PEXELS_API_KEY = process.env.PEXELS_API_KEY || ""
const BASE_URL = "https://api.pexels.com/v1"

const industryQueries: Record<string, string> = {
  home_services:  "home renovation contractor construction",
  wellness:       "spa wellness relaxation calm",
  food:           "restaurant food dining",
  events:         "event celebration party decor",
  retail:         "retail store shopping boutique",
  fitness:        "fitness gym workout training",
  beauty:         "beauty salon hair styling",
  automotive:     "auto mechanic car repair garage",
  pet_services:   "pet grooming dog cat",
  cleaning:       "cleaning professional home clean",
  landscaping:    "landscaping garden outdoor lawn",
}

const vibeModifiers: Record<string, string> = {
  bold:   "dramatic strong",
  calm:   "soft minimal light",
  modern: "modern clean architecture",
  warm:   "warm cozy friendly",
}

export async function fetchStockPhoto(
  industryCategory: string,
  vibe: string,
  city?: string | null
): Promise<string | null> {
  if (!PEXELS_API_KEY) {
    console.warn("[pexels] PEXELS_API_KEY not set")
    return null
  }

  const base = industryQueries[industryCategory] ?? "small business professional"
  const modifier = vibeModifiers[vibe] ?? ""
  const query = [base, modifier].filter(Boolean).join(" ")

  try {
    const res = await fetch(
      `${BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
      {
        headers: { Authorization: PEXELS_API_KEY },
        next: { revalidate: 86400 },
      }
    )

    if (!res.ok) {
      console.error("[pexels] API error:", res.status, await res.text())
      return null
    }

    const data = await res.json()
    const photos: { src: { large2x: string } }[] = data.photos || []
    if (!photos.length) return null

    // Pick a random photo from the results for variety
    const pick = photos[Math.floor(Math.random() * photos.length)]
    return pick.src.large2x
  } catch (err) {
    console.error("[pexels] fetch failed:", err)
    return null
  }
}
