import type { SupabaseClient } from "@supabase/supabase-js"

export type PlacementPhoto = { id: string; url: string; website_section: string | null; [key: string]: unknown }

export function isPhotoPlacementResult(value: unknown): value is { photo: PlacementPhoto; clearedPhotoIds: string[] } {
  if (!value || typeof value !== "object") return false
  const result = value as { photo?: PlacementPhoto; clearedPhotoIds?: unknown }
  return Boolean(result.photo && typeof result.photo.id === "string" && typeof result.photo.url === "string"
    && Array.isArray(result.clearedPhotoIds) && result.clearedPhotoIds.every(id => typeof id === "string"))
}

export function mergePhotoPlacement<T extends { id: string; url: string; website_section: string | null }>(photos: T[], assigned: PlacementPhoto, clearedIds: string[]): T[] {
  const next = photos.map(photo => photo.id === assigned.id ? { ...photo, ...assigned } as T
    : clearedIds.includes(photo.id) ? { ...photo, website_section: null } : photo)
  if (!next.some(photo => photo.id === assigned.id)) next.unshift({ ...photos.find(photo => photo.url === assigned.url), ...assigned } as T)
  return next
}

export async function assignIndependentPhoto(admin: Pick<SupabaseClient, "from">, companyId: string, photoId: string, section: string) {
  const sourceResult = await admin.from("company_photos").select("*").eq("company_id", companyId).eq("id", photoId).single()
  if (sourceResult.error || !sourceResult.data) throw new Error(sourceResult.error?.message || "Photo not found")
  const source = sourceResult.data
  const occupantsResult = await admin.from("company_photos").select("*").eq("company_id", companyId).eq("website_section", section)
  if (occupantsResult.error) throw new Error(occupantsResult.error.message)
  const occupants = occupantsResult.data ?? []
  const existing = occupants.find(photo => photo.url === source.url)
  const duplicate = !existing && Boolean(source.website_section && source.website_section !== section)
  const original = existing ?? source
  // One row is one placement. Reuse the file without moving its existing placement or gallery membership.
  const result = duplicate
    ? await admin.from("company_photos").insert({ company_id: companyId, url: source.url, storage_path: source.storage_path,
      note: source.note ?? null, website_section: section, for_website: true, in_gallery: false, for_social: false, album_id: null }).select("*").single()
    : await admin.from("company_photos").update({ website_section: section, for_website: true })
      .eq("company_id", companyId).eq("id", original.id).eq("url", original.url).select("*").single()
  if (result.error || !result.data) throw new Error(result.error?.message || "Could not assign photo")
  const assigned = result.data as PlacementPhoto
  const clearedPhotoIds = occupants.filter(photo => photo.id !== assigned.id).map(photo => photo.id as string)
  if (clearedPhotoIds.length) {
    const cleared = await admin.from("company_photos").update({ website_section: null })
      .eq("company_id", companyId).eq("website_section", section).in("id", clearedPhotoIds)
    if (cleared.error) {
      // Only undo the new placement. Never remove the shared storage file or change the original slot.
      const compensation = duplicate
        ? await admin.from("company_photos").delete().eq("company_id", companyId).eq("id", assigned.id).eq("website_section", section)
        : await admin.from("company_photos").update({ website_section: original.website_section, for_website: original.for_website })
          .eq("company_id", companyId).eq("id", assigned.id).eq("website_section", section)
      throw new Error(compensation.error ? "Photo replacement needs a refresh before retrying." : cleared.error.message)
    }
  }
  return { photo: assigned, clearedPhotoIds }
}
