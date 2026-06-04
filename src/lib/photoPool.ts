export type PoolPhoto = {
  url: string
  desc: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const BUCKET = "config"
const POOL_PATH = (industry: string) => `photo-pools/${industry}.json`

// Read curated photo pool from Supabase Storage JSON file
export async function getPhotoPool(
  industryCategory: string,
  _vibe: string  // reserved for future vibe-specific pools
): Promise<string[]> {
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${POOL_PATH(industryCategory)}`
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = await res.json()
    const photos: PoolPhoto[] = data.photos || []
    return photos.map((p) => p.url)
  } catch {
    return []
  }
}

export async function getPhotoPoolWithDesc(
  industryCategory: string,
  _vibe: string
): Promise<PoolPhoto[]> {
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${POOL_PATH(industryCategory)}`
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = await res.json()
    return data.photos || []
  } catch {
    return []
  }
}
