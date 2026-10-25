import type { SupabaseClient } from "@supabase/supabase-js"
import { assertStockPhotoPlacement, canPlaceStockPhoto } from "./stockPhotoPlacement"

type PhotoClient = Pick<SupabaseClient, "from">

export async function assertStockPhotoAlbum(admin: PhotoClient, companyId: string, url: string, albumId: unknown) {
  if (!albumId || canPlaceStockPhoto(url, "gallery")) return
  const { data, error } = await admin.from("photo_albums").select("show_on_website_gallery")
    .eq("company_id", companyId).eq("id", albumId).single()
  if (error || !data) throw new Error("Could not verify the album's visibility. Please try again.")
  if (data.show_on_website_gallery) assertStockPhotoPlacement(url, "gallery")
}

export async function assertStockPhotoPatch(admin: PhotoClient, companyId: string, photoId: string, update: Record<string, unknown>) {
  if (!("website_section" in update) && update.for_website !== true && !update.album_id) return
  const { data, error } = await admin.from("company_photos").select("url, website_section, for_website")
    .eq("company_id", companyId).eq("id", photoId).single()
  if (error || !data) throw new Error("Could not verify this photo. Please try again.")
  const section = "website_section" in update ? update.website_section : data.website_section
  if (typeof section === "string" && section) assertStockPhotoPlacement(data.url, section)
  const onWebsite = "for_website" in update ? update.for_website : data.for_website
  if (onWebsite && !section) assertStockPhotoPlacement(data.url, "gallery")
  await assertStockPhotoAlbum(admin, companyId, data.url, update.album_id)
}

export async function assertStockAlbumPublication(admin: PhotoClient, companyId: string, albumId: string) {
  const { data, error } = await admin.from("company_photos").select("url").eq("company_id", companyId).eq("album_id", albumId)
  if (error) throw new Error("Could not verify the album photos. Please try again.")
  for (const photo of data ?? []) assertStockPhotoPlacement(photo.url, "gallery")
}
