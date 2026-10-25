import { createHash } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { STOCK_PHOTO_LIBRARY, getAvailableStockPhotos, type StockPhotoMetadata } from "./stockPhotoLibrary"

export type LibraryPhoto = {
  id: string
  company_id: string
  url: string
  storage_path: string
  website_section: string | null
  in_gallery: boolean
  for_website: boolean
  for_social: boolean
}

type LibraryCompany = { id: string; industry_category: string | null; sub_industry: string | null }

export function stockLibraryPhotoId(companyId: string, stockId: string): string {
  const bytes = createHash("sha256").update(JSON.stringify(["found-stock-library-v1", companyId, stockId])).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 15) | 128
  bytes[8] = (bytes[8] & 63) | 128
  const hex = bytes.toString("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function sharedStockAsset(admin: SupabaseClient, photo: StockPhotoMetadata) {
  if (photo.enforcePlacementApproval !== true) throw new Error("This photo's placement approvals are not ready.")
  if (!photo.fullViewUrl || !photo.urls.includes(photo.fullViewUrl)) throw new Error("This photo is not ready for import.")
  const url = new URL(photo.fullViewUrl)
  const bucket = new URL(admin.storage.from("company-assets").getPublicUrl("_library_probe_").data.publicUrl)
  const prefix = bucket.pathname.slice(0, bucket.pathname.lastIndexOf("/") + 1)
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      url.origin !== bucket.origin || !url.pathname.startsWith(prefix)) throw new Error("This photo needs an approved shared original.")
  const storagePath = decodeURIComponent(url.pathname.slice(prefix.length))
  const segments = storagePath.split("/")
  // A tenant-owned original must never become a reusable shared asset.
  if (segments.some(part => !part || part === "." || part === ".." || part.includes("\\") ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part))) {
    throw new Error("This photo needs an approved shared original.")
  }
  return { url: photo.fullViewUrl, storage_path: storagePath }
}

export async function importOwnerStockPhoto(admin: SupabaseClient, company: LibraryCompany, stockId: string): Promise<LibraryPhoto> {
  const photo = getAvailableStockPhotos(company.industry_category, company.sub_industry).find(item => item.id === stockId)
  if (!photo) throw new Error("This photo is not available for your business.")
  const asset = sharedStockAsset(admin, photo)
  const id = stockLibraryPhotoId(company.id, photo.id)
  const { error } = await admin.from("company_photos").upsert({
    id, company_id: company.id, ...asset,
    website_section: null, in_gallery: false, for_website: false, for_social: false,
  }, { onConflict: "id", ignoreDuplicates: true })
  if (error) throw new Error("Could not add this photo. Please try again.")
  // Conflict-ignore is essential: repeated/concurrent imports must not reset owner choices.
  const { data, error: readError } = await admin.from("company_photos").select("*").eq("company_id", company.id).eq("id", id).single()
  if (readError || !data || data.url !== asset.url || data.storage_path !== asset.storage_path) {
    throw new Error("Could not load this photo. Please try again.")
  }
  return data as LibraryPhoto
}

export async function getImportedStockPhotos(admin: SupabaseClient, companyId: string): Promise<LibraryPhoto[]> {
  const ids = STOCK_PHOTO_LIBRARY.map(photo => stockLibraryPhotoId(companyId, photo.id))
  if (!ids.length) return []
  const { data, error } = await admin.from("company_photos").select("*").eq("company_id", companyId).in("id", ids)
  if (error) {
    console.error("Could not load imported stock photos", error.code)
    return []
  }
  return (data ?? []) as LibraryPhoto[]
}
