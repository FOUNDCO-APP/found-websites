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

// Returns photo URLs for a given industry, optionally filtered by sub-type tag,
// plus whether any photo was actually tagged for that sub-type.
// If subType is provided and matches a tag: returns tagged photos first, then
// general (null tag) as fallback, matchedTag: true.
// If subType is provided but nothing is tagged for it: returns the pool's
// general photos, but matchedTag: false — the caller should treat these as
// an untrustworthy fit (e.g. a bike shop under "retail" falling back to
// generic boutique photos) rather than a real match.
// If subType is not provided: returns all photos shuffled, matchedTag: true.
export async function getPhotoPool(
  industryCategory: string,
  _vibe: string,
  subType?: string
): Promise<{ urls: string[]; matchedTag: boolean }> {
  const pool = await fetchPool(industryCategory)
  if (!pool.length) return { urls: [], matchedTag: false }

  if (subType) {
    const subTypeLower = subType.toLowerCase()
    const tagged = pool.filter(p => p.tag && p.tag.toLowerCase().includes(subTypeLower))
    if (tagged.length) {
      const general = pool.filter(p => !p.tag)
      return { urls: [...tagged, ...general].map(p => p.url), matchedTag: true }
    }
    return { urls: pool.map(p => p.url), matchedTag: false }
  }

  return { urls: [...pool].sort(() => Math.random() - 0.5).map(p => p.url), matchedTag: true }
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
