export type PoolPhoto = {
  url: string
  desc: string
  tag: string | null        // sub-type — e.g. "spa facial", "nail studio", null = general
  keywords?: string[]       // team-approved matching keywords
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const BUCKET = "config"
const POOL_PATH = (industry: string) => `photo-pools/${industry}.json`

async function fetchPool(industryCategory: string): Promise<PoolPhoto[]> {
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${POOL_PATH(industryCategory)}`
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.photos || []) as PoolPhoto[]
  } catch {
    return []
  }
}

// Returns photo URLs for a given industry, optionally filtered by sub-type tag.
// If subType is provided: returns matching tagged photos first, then general (null tag) as fallback.
// If subType is not provided: returns all photos shuffled.
export async function getPhotoPool(
  industryCategory: string,
  _vibe: string,
  subType?: string
): Promise<string[]> {
  const pool = await fetchPool(industryCategory)
  if (!pool.length) return []

  if (subType) {
    const subTypeLower = subType.toLowerCase()
    const tagged = pool.filter(p => p.tag && p.tag.toLowerCase().includes(subTypeLower))
    const general = pool.filter(p => !p.tag)
    const combined = [...tagged, ...general]
    return combined.length ? combined.map(p => p.url) : pool.map(p => p.url)
  }

  return [...pool].sort(() => Math.random() - 0.5).map(p => p.url)
}

export async function getPhotoPoolWithDesc(
  industryCategory: string,
  _vibe: string,
  subType?: string
): Promise<PoolPhoto[]> {
  const pool = await fetchPool(industryCategory)
  if (!pool.length) return []

  if (subType) {
    const subTypeLower = subType.toLowerCase()
    const tagged = pool.filter(p => p.tag && p.tag.toLowerCase().includes(subTypeLower))
    const general = pool.filter(p => !p.tag)
    return tagged.length ? [...tagged, ...general] : pool
  }

  return pool
}
