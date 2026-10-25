"use server"

import { randomUUID } from "node:crypto"
import sharp from "sharp"
import { revalidatePath } from "next/cache"
import { resolveDashboardIdentity } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { assertStockPhotoPlacement, StockPhotoPlacementError } from "@/lib/stockPhotoPlacement"
import { isVideoMedia } from "@/lib/mediaKind"

export type HighlightPhoto = {
  id: string
  url: string
  website_section: string | null
  in_gallery?: boolean
  media_type?: "photo" | "video"
}

const MAX_BYTES = 10 * 1024 * 1024
const UNCERTAIN = "The update could not be confirmed. Refresh before trying again; no files were deleted."

async function context() {
  const identity = await resolveDashboardIdentity()
  if (!identity) throw new Error("Not authenticated.")
  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company || !await requireOwnerAccess(identity.userId, identity.userEmail, company)) throw new Error("Owner access required.")
  return { company, admin: createAdminClient() }
}

function refresh(slug: string) {
  revalidatePath(`/${slug}`)
  revalidatePath("/dashboard/site")
  revalidatePath("/dashboard/photos")
}

function photoResult(row: { id: string; url: string; website_section: string | null; in_gallery?: boolean }): HighlightPhoto {
  return { id: row.id, url: row.url, website_section: row.website_section, in_gallery: row.in_gallery, media_type: "photo" }
}

async function imageBytes(file: File) {
  if (!file.size || file.size > MAX_BYTES) throw new Error("Choose a JPEG, PNG or WebP image up to 10 MB.")
  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.length !== file.size || bytes.length > MAX_BYTES) throw new Error("Invalid image size.")
  const format = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "jpeg"
    : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "png"
      : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP" ? "webp" : null
  if (!format || file.type !== `image/${format}`) throw new Error("Choose a valid JPEG, PNG or WebP image.")
  const metadata = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata()
  if (metadata.format !== format || !metadata.width || !metadata.height || metadata.width > 16384 || metadata.height > 16384
    || metadata.width * metadata.height > 40_000_000 || (metadata.pages ?? 1) > 1) throw new Error("Choose a still image no larger than 40 megapixels.")
  // Decode to validate the file, but upload its original bytes without re-encoding.
  await sharp(bytes, { limitInputPixels: 40_000_000 }).stats()
  return { bytes, extension: format === "jpeg" ? "jpg" : format, contentType: `image/${format}` }
}

export async function uploadHighlightImage(formData: FormData): Promise<{ photo: HighlightPhoto } | { error: string }> {
  let uploadStarted = false
  try {
    const { company, admin } = await context()
    const file = formData.get("file")
    if (!(file instanceof File)) return { error: "Choose an image to upload." }
    const { bytes, extension, contentType } = await imageBytes(file)
    const storagePath = `${company.id}/highlights/${randomUUID()}.${extension}`
    const bucket = admin.storage.from("company-assets")
    uploadStarted = true
    const uploaded = await bucket.upload(storagePath, bytes, { contentType, upsert: false })
    if (uploaded.error) return { error: "The upload could not be confirmed. Refresh before trying again." }
    const url = bucket.getPublicUrl(storagePath).data.publicUrl
    const inserted = await admin.from("company_photos").insert({ company_id: company.id, url, storage_path: storagePath,
      note: "Homepage highlight", for_website: false, in_gallery: false, for_social: false, website_section: null, album_id: null }).select("*").single()
    // An uncertain insert must not trigger file deletion: the row may already reference it.
    if (inserted.error || !inserted.data) return { error: UNCERTAIN }
    return { photo: photoResult(inserted.data) }
  } catch (error) {
    return { error: error instanceof Error && ["Not authenticated.", "Owner access required."].includes(error.message)
      ? error.message : uploadStarted ? UNCERTAIN : "Choose a valid JPEG, PNG or WebP image up to 10 MB and 40 megapixels." }
  }
}

export async function publishHomepageHighlight(input: { photoId: string }): Promise<{ photo: HighlightPhoto; clearedPhotoIds: string[] } | { error: string }> {
  try {
    const { company, admin } = await context()
    if (!input || typeof input.photoId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.photoId)) return { error: "Choose a photo first." }
    const sourceResult = await admin.from("company_photos").select("*").eq("company_id", company.id).eq("id", input.photoId).single()
    if (sourceResult.error || !sourceResult.data) return { error: "Photo not found for this company." }
    const source = sourceResult.data
    if (isVideoMedia(source.url) || source.media_type === "video" || source.mime_type?.startsWith("video/")) return { error: "Choose a still image for the highlight." }
    const imageUrl = new URL(source.url)
    if (!["http:", "https:"].includes(imageUrl.protocol) || imageUrl.username || imageUrl.password
      || !/\.(jpe?g|png|webp|avif)$/i.test(imageUrl.pathname)) return { error: "Choose a JPEG, PNG, WebP or AVIF photo." }
    assertStockPhotoPlacement(source.url, "announcement")
    const configResult = await admin.from("website_config").select("updated_at").eq("company_id", company.id).single()
    if (configResult.error || !configResult.data) return { error: "Could not read the current highlight. Refresh and try again." }
    // All publication mutations happen in one transaction. Do not retry an uncertain response.
    const published = await admin.rpc("publish_homepage_highlight", { p_company_id: company.id,
      p_photo_id: source.id, p_expected_url: source.url, p_expected_updated_at: configResult.data.updated_at })
    if (published.error || !published.data) {
      refresh(company.slug)
      return { error: UNCERTAIN }
    }
    const result = published.data as { photo?: HighlightPhoto; clearedPhotoIds?: unknown }
    if (!result.photo || typeof result.photo.id !== "string" || typeof result.photo.url !== "string"
      || result.photo.url !== source.url || result.photo.website_section !== "announcement" || result.photo.in_gallery !== false
      || !Array.isArray(result.clearedPhotoIds) || !result.clearedPhotoIds.every(id => typeof id === "string")) return { error: UNCERTAIN }
    refresh(company.slug)
    return { photo: photoResult(result.photo), clearedPhotoIds: result.clearedPhotoIds }
  } catch (error) {
    return { error: error instanceof StockPhotoPlacementError ? error.message
      : error instanceof Error && ["Not authenticated.", "Owner access required."].includes(error.message)
      ? error.message : UNCERTAIN }
  }
}

export async function disableHomepageHighlight(): Promise<{ success: true } | { error: string }> {
  try {
    const { company, admin } = await context()
    const result = await admin.from("website_config").update({ announcement_enabled: false }).eq("company_id", company.id).select("id")
    if (result.error || result.data?.length !== 1) return { error: UNCERTAIN }
    refresh(company.slug)
    return { success: true }
  } catch { return { error: "Could not turn off the highlight. Refresh and try again." } }
}

export async function removeHomepageHighlight(): Promise<{ success: true } | { error: string }> {
  return disableHomepageHighlight()
}
