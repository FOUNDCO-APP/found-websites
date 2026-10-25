import type { SupabaseClient } from "@supabase/supabase-js"

type PhotoAsset = {
  id: string; url: string; storage_path: string | null
  for_website: boolean | null; website_section: string | null; in_gallery: boolean | null; album_id: string | null
}
type PhotoClient = Pick<SupabaseClient, "from" | "storage">

export class PhotoInUseError extends Error {
  readonly code = "PHOTO_IN_USE"
  constructor(readonly uses: string[]) {
    super(`This photo is still used on ${uses.join(", ")}. Remove or replace it there before deleting it.`)
    this.name = "PhotoInUseError"
  }
}

const pageLabels: Record<string, string> = {
  hero: "Home", about: "About", services: "Services", contact: "Contact", cta: "Home bottom and shared page backgrounds",
  gallery: "Gallery", gallery_hero: "Gallery header", announcement: "Featured update", shop: "Products", order: "Online ordering",
  book: "Booking", estimate: "Estimate", menu: "Menu",
}

function sameAsset(row: { url?: string | null; storage_path?: string | null }, photo: PhotoAsset) {
  return Boolean(row.url && identity(row.url) === identity(photo.url)
    || photo.storage_path && row.storage_path === photo.storage_path)
}

async function photoUses(admin: PhotoClient, companyId: string, photo: PhotoAsset): Promise<string[]> {
  const results = await Promise.all([
    admin.from("company_photos").select("id,url,storage_path,for_website,website_section,in_gallery,album_id").eq("company_id", companyId),
    admin.from("media").select("url,thumbnail_url,website_flag").eq("company_id", companyId),
    admin.from("companies").select("logo_url,logo_white_url").eq("id", companyId),
    admin.from("website_config").select("*").eq("company_id", companyId),
    admin.from("photo_albums").select("id,name,cover_photo_id,show_on_website_gallery").eq("company_id", companyId),
  ])
  for (const result of results) if (result.error) throw new Error(`Could not verify photo references: ${result.error.message}`)
  const uses = new Set<string>()
  const photos = (results[0].data ?? []).filter(row => sameAsset(row, photo))
  for (const row of photos) {
    if (row.for_website && row.website_section) uses.add(pageLabels[row.website_section] ?? "Website page")
    if (row.in_gallery) uses.add("Gallery")
  }
  const matchingIds = new Set(photos.map(row => row.id))
  const matchingAlbums = new Set(photos.map(row => row.album_id).filter(Boolean))
  for (const album of results[4].data ?? []) {
    if (album.show_on_website_gallery && (matchingAlbums.has(album.id) || matchingIds.has(album.cover_photo_id))) {
      uses.add(`Gallery album: ${album.name || "Untitled album"}`)
    }
  }
  if ((results[1].data ?? []).some(row => row.website_flag && (references(row.url, photo.url) || references(row.thumbnail_url, photo.url)))) {
    uses.add("Website photos")
  }
  if (references(results[2].data, photo.url)) uses.add("Business logo")
  const configLabels: Record<string, string> = {
    hero_image_url: "Home", hero_images: "Home", hero_video_url: "Home",
    stock_images: "Website stock photos", site_icon_url: "Site icon", site_icon_source_url: "Site icon",
  }
  for (const config of results[3].data ?? []) {
    for (const [field, value] of Object.entries(config)) {
      if (references(value, photo.url)) uses.add(configLabels[field] ?? "Saved website content")
    }
  }
  return [...uses]
}

function identity(url: string) {
  try { const parsed = new URL(url); return `${parsed.origin}${parsed.pathname}` } catch { return url }
}
function references(value: unknown, url: string): boolean {
  if (typeof value === "string") return identity(value) === identity(url)
  if (Array.isArray(value)) return value.some(item => references(item, url))
  if (value && typeof value === "object") return Object.values(value).some(item => references(item, url))
  return false
}
async function hasReferences(admin: PhotoClient, companyId: string, photo: PhotoAsset) {
  const checks = [
    admin.from("company_photos").select("id,url,storage_path").eq("company_id", companyId).neq("id", photo.id),
    admin.from("media").select("url,thumbnail_url").eq("company_id", companyId),
    admin.from("companies").select("logo_url,logo_white_url").eq("id", companyId),
    admin.from("website_config").select("*").eq("company_id", companyId),
  ]
  // Exact-path checks also retain a shared asset referenced outside this company's photo library.
  if (photo.storage_path) checks.push(admin.from("company_photos").select("id").eq("storage_path", photo.storage_path).neq("id", photo.id))
  const results = await Promise.all(checks)
  for (const result of results) if (result.error) throw new Error(`Could not verify photo references: ${result.error.message}`)
  const photos = results[0].data ?? []
  return photos.some(row => row.storage_path && row.storage_path === photo.storage_path || references(row.url, photo.url))
    || results.slice(1, 4).some(result => references(result.data, photo.url))
    || Boolean(photo.storage_path && results[4]?.data?.length)
}

export async function deletePhotoPlacement(admin: PhotoClient, companyId: string, photoId: string) {
  const original = await admin.from("company_photos").select("id,url,storage_path,for_website,website_section,in_gallery,album_id")
    .eq("company_id", companyId).eq("id", photoId).single()
  if (original.error || !original.data) throw new Error(original.error?.message || "Photo not found")
  const photo = original.data as PhotoAsset
  const uses = await photoUses(admin, companyId, photo)
  if (uses.length) throw new PhotoInUseError(uses)
  const referencedBefore = await hasReferences(admin, companyId, photo)
  let removal = admin.from("company_photos").delete().eq("company_id", companyId).eq("id", photo.id).eq("url", photo.url)
  for (const field of ["storage_path", "for_website", "website_section", "in_gallery", "album_id"] as const) {
    removal = photo[field] == null ? removal.is(field, null) : removal.eq(field, photo[field])
  }
  const removed = await removal.select("id").single()
  if (removed.error || !removed.data) throw new Error(removed.error?.message || "Photo changed before deletion")
  // A placement never owns someone else's/shared-library storage path.
  const bucket = admin.storage.from("company-assets")
  const ownedPath = photo.storage_path?.startsWith(`${companyId}/`) && !photo.storage_path.split("/").includes("..")
    && identity(bucket.getPublicUrl(photo.storage_path).data.publicUrl) === identity(photo.url)
  if (referencedBefore || !ownedPath) return { storageRetained: true, storageCleanupPending: false }
  try {
    if (await hasReferences(admin, companyId, photo)) return { storageRetained: true, storageCleanupPending: false }
    const removedFile = await bucket.remove([photo.storage_path!])
    if (removedFile.error) return { storageRetained: true, storageCleanupPending: true }
    return { storageRetained: false, storageCleanupPending: false }
  } catch {
    // Reference/read failures retain bytes; never risk another placement to clean up storage.
    return { storageRetained: true, storageCleanupPending: true }
  }
}
