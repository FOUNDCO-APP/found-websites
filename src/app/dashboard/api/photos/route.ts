import { resolveDashboardIdentity } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { recordCustomerActivity } from "@/lib/customerActivity"
import { mediaKindFromUrl } from "@/lib/mediaKind"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { deletePhotoPlacement, PhotoInUseError } from "@/lib/deletePhotoPlacement"
import { StockPhotoPlacementError } from "@/lib/stockPhotoPlacement"
import { assertStockPhotoAlbum, assertStockPhotoPatch } from "@/lib/stockPhotoPublication"

const BUCKET = "company-assets"

function safeExtension(fileName?: string | null, contentType?: string | null) {
  const fromName = fileName?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (fromName) return fromName
  if (contentType?.includes("mp4")) return "mp4"
  if (contentType?.includes("webm")) return "webm"
  if (contentType?.includes("quicktime")) return "mov"
  if (contentType?.includes("png")) return "png"
  if (contentType?.includes("webp")) return "webp"
  return "jpg"
}

function photoPayload(photo: Record<string, unknown>, mimeType?: string | null) {
  const url = String(photo.url ?? "")
  return {
    ...photo,
    media_type: mediaKindFromUrl(url, mimeType),
    mime_type: mimeType ?? null,
  }
}

export async function GET() {
  const identity = await resolveDashboardIdentity()
  if (!identity) return NextResponse.json({ photos: [] }, { status: 401 })
  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) return NextResponse.json({ photos: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from("company_photos")
    .select("id, url, storage_path, for_website, for_social, website_section, in_gallery, album_id, note, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })

  const photos = (data ?? []).map(photo => photoPayload(photo))

  return NextResponse.json({ photos })
}

const UPLOAD_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UPLOAD_ERROR = "We couldn't confirm your upload saved. Check your connection and try again."
class UploadFailure extends Error {
  constructor(readonly code: string, readonly status: number) { super(UPLOAD_ERROR) }
}
// Convert structured provider fields, never provider messages, into public codes.
function uploadFailure(error: unknown): UploadFailure {
  if (error instanceof UploadFailure) return error
  const value = error && typeof error === "object" ? error as { code?: string; error?: string; status?: number; statusCode?: string | number } : {}
  const code = value.code ?? value.error
  const status = Number(value.statusCode ?? value.status)
  if (status === 401 || status === 403 || code === "InvalidJWT" || code === "AccessDenied") return new UploadFailure("AUTH_REQUIRED", 403)
  if (status === 413 || code === "EntityTooLarge") return new UploadFailure("UPLOAD_TOO_LARGE", 413)
  if (code === "23505") return new UploadFailure("UPLOAD_ID_CONFLICT", 409)
  if (["23503", "22P02", "InvalidRequest", "InvalidBucketName", "InvalidKey", "InvalidMimeType", "InvalidUploadId", "NoSuchBucket", "NoSuchKey"].includes(String(code))
    || [400, 404, 409, 422].includes(status)) return new UploadFailure("INVALID_UPLOAD", 400)
  return new UploadFailure("TRANSIENT", status === 429 ? 429 : status === 408 ? 408 : 503)
}

export async function POST(req: Request) {
  try {
    const identity = await resolveDashboardIdentity()
    if (!identity) return NextResponse.json({ code: "AUTH_REQUIRED", error: "Please sign in to upload." }, { status: 401 })
    const accountId = identity.isAdminView ? "found-admin" : identity.userId
    const company = await getCompany(identity.userId, identity.userEmail)
    if (!company) return NextResponse.json({ code: "INVALID_UPLOAD", error: "This upload couldn't start." }, { status: 404 })
    const json = (req.headers.get("content-type") ?? "").includes("application/json")
    const body = json ? await req.json() : null
    const form = json ? null : await req.formData()
    if (json && (!body || typeof body !== "object" || Array.isArray(body))) throw new UploadFailure("INVALID_UPLOAD", 400)
    const expectedAccount = json ? body.expected_account_id : form?.get("expected_account_id")
    if (expectedAccount != null && expectedAccount !== accountId) {
      return NextResponse.json({ code: "ACCOUNT_CHANGED", error: "Sign in to the original account to continue this upload." }, { status: 409 })
    }
    const expectedCompany = json ? body.expected_company_id : form?.get("expected_company_id")
    if (expectedCompany != null && expectedCompany !== company.id) {
      return NextResponse.json({ code: "BUSINESS_CHANGED", error: "Your business changed. Return to the original business to retry." }, { status: 409 })
    }
    if (json && body.intent === "upload-context") {
      return NextResponse.json({ company_id: company.id, account_id: accountId }, { headers: { "Cache-Control": "no-store" } })
    }
    const rawId = json ? body.upload_id : form?.get("upload_id")
    if (rawId != null && (typeof rawId !== "string" || !UPLOAD_UUID.test(rawId))) {
      return NextResponse.json({ code: "INVALID_UPLOAD", error: "This upload couldn't start." }, { status: 400 })
    }
    const uploadId = typeof rawId === "string" ? rawId.toLowerCase() : null
    if (uploadId && body?.intent !== "reconcile-upload" && expectedCompany !== company.id) {
      return NextResponse.json({ code: "BUSINESS_CHANGED", error: "This upload couldn't be verified." }, { status: 409 })
    }
    if (body?.intent === "resumable-upload" && (!uploadId || expectedAccount !== accountId)) {
      throw new UploadFailure("INVALID_UPLOAD", 400)
    }
    // Older open tabs send stable IDs/company binding but no account field.
    // Authenticate every request above; enforce account binding whenever sent.
    // New device-queue clients always send it, including their first request.
    const admin = createAdminClient()
    const bucket = admin.storage.from(BUCKET)
    const albumId = (json ? body.album_id : form?.get("album_id")) || null
    if (albumId) {
      const { data, error } = await admin.from("photo_albums").select("id")
        .eq("id", albumId).eq("company_id", company.id).maybeSingle()
      if (error) throw uploadFailure(error)
      if (!data) return NextResponse.json({ code: "ALBUM_UNAVAILABLE", error: "This album is unavailable." }, { status: 400 })
    }
    // Never upsert an ID: a global PK collision must not update/disclose another tenant.
    const existing = async () => {
      const { data, error } = await admin.from("company_photos").select("*")
        .eq("id", uploadId!).eq("company_id", company.id).maybeSingle()
      if (error) throw uploadFailure(error)
      return data
    }
    if (uploadId) {
      const photo = await existing()
      if (photo) return NextResponse.json({ company_id: company.id, account_id: accountId, photo: photoPayload(photo) })
    }
    const file = form?.get("file") as File | null
    const name = json ? body.file_name : file?.name
    const mime = json ? (body.content_type || body.mime_type) : file?.type
    const ext = safeExtension(name, mime)
    if (uploadId && !["jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "avif", "mp4", "webm", "mov", "m4v", "ogg"].includes(ext)) {
      return NextResponse.json({ code: "UNSUPPORTED_FILE_TYPE", error: "This file type isn't supported." }, { status: 400 })
    }
    const path = uploadId ? `${company.id}/${uploadId}.${ext}`
      : `${company.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const publicUrlFor = (value: string) => bucket.getPublicUrl(value).data.publicUrl
    // Exact metadata lookup only. Storage errors are not evidence of absence.
    const stored = async (value: string) => {
      const filename = value.slice(company.id.length + 1)
      const { data, error } = await bucket.list(company.id, { search: filename, limit: 100 })
      if (error) throw uploadFailure(error)
      return (data ?? []).some(object => object.name === filename && !!object.id)
    }
    const save = async (storagePath: string, url: string, mimeType?: string) => {
      const { data, error } = await admin.from("company_photos")
        .insert({ ...(uploadId ? { id: uploadId } : {}), company_id: company.id,
          storage_path: storagePath, url, album_id: albumId }).select().single()
      if (error) {
        if (uploadId && error.code === "23505") {
          const photo = await existing()
          if (photo) return NextResponse.json({ photo: photoPayload(photo, mimeType) })
        }
        throw uploadFailure(error)
      }
      try {
        await recordCustomerActivity({ eventType: "photo_uploaded", pathname: "/dashboard/photos",
          metadata: { photo_id: data.id, album_id: albumId, upload_mode: json ? "signed" : "form" } })
      } catch { /* A saved capture remains saved if activity tracking fails. */ }
      return NextResponse.json({ photo: photoPayload(data, mimeType) })
    }
    if (json) {
      if (body.intent === "reconcile-upload") {
        if (!uploadId) return NextResponse.json({ code: "INVALID_UPLOAD", error: "This upload couldn't start." }, { status: 400 })
        const uploaded = await stored(path)
        return NextResponse.json({ company_id: company.id, account_id: accountId, uploaded, path, publicUrl: publicUrlFor(path) })
      }
      if (body.intent === "signed-upload" || body.intent === "resumable-upload") {
        // Keep the historical signed PUT contract intact for already-open tabs.
        // New resumable clients must bind both the capture and its account.
        if (uploadId && await stored(path)) {
          return NextResponse.json({ uploaded: true, path, publicUrl: publicUrlFor(path) })
        }
        const { data, error } = await bucket.createSignedUploadUrl(path)
        if (error) throw uploadFailure(error)
        if (!data) throw new UploadFailure("TRANSIENT", 503)
        let resumableEndpoint: string | undefined
        if (body.intent === "resumable-upload") {
          const url = new URL(data.signedUrl)
          if (url.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(url.hostname)) {
            throw new UploadFailure("INVALID_UPLOAD", 400)
          }
          resumableEndpoint = `https://${url.hostname.replace(".supabase.co", ".storage.supabase.co")}/storage/v1/upload/resumable/sign`
        }
        return NextResponse.json({ bucket: BUCKET, path, token: data.token, signedUrl: data.signedUrl,
          ...(resumableEndpoint ? { resumableEndpoint } : {}),
          publicUrl: publicUrlFor(path), album_id: albumId }, { headers: { "Cache-Control": "no-store" } })
      }
      if (body.storage_path && body.url) {
        if (uploadId) {
          if (body.storage_path !== path || body.url !== publicUrlFor(path)) {
            return NextResponse.json({ code: "INVALID_UPLOAD", error: "This upload couldn't be verified." }, { status: 400 })
          }
          if (!await stored(path)) return NextResponse.json({ code: "STORAGE_NOT_READY", error: UPLOAD_ERROR }, { status: 409 })
          return await save(path, publicUrlFor(path), mime)
        }
        // Separate legacy completion contract; retain stock publication checks.
        const legacyPath = String(body.storage_path)
        const prefix = `${company.id}/`
        const filename = legacyPath.slice(prefix.length)
        if (!legacyPath.startsWith(prefix) || !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filename)
          || body.url !== publicUrlFor(legacyPath) || !await stored(legacyPath)) {
          return NextResponse.json({ code: "INVALID_UPLOAD", error: "This upload couldn't be verified." }, { status: 400 })
        }
        await assertStockPhotoAlbum(admin, company.id, body.url, albumId)
        return await save(legacyPath, publicUrlFor(legacyPath), body.mime_type)
      }
      return NextResponse.json({ code: "INVALID_UPLOAD", error: "This upload couldn't start." }, { status: 400 })
    }
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ code: "INVALID_UPLOAD", error: "Choose a file to upload." }, { status: 400 })
    }
    if (!uploadId || !await stored(path)) {
      const { error } = await bucket.upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false })
      if (error) {
        // Another request may have won storage. Verify; never overwrite.
        if (!uploadId || !await stored(path)) throw uploadFailure(error)
      }
    }
    return await save(path, publicUrlFor(path), file.type)
  } catch (error) {
    const failure = error instanceof SyntaxError ? new UploadFailure("INVALID_UPLOAD", 400) : uploadFailure(error)
    return NextResponse.json({ code: failure.code, error: UPLOAD_ERROR }, { status: failure.status })
  }
}
export async function PATCH(req: Request) {
  const identity = await resolveDashboardIdentity()
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })
  const isOwner = await requireOwnerAccess(identity.userId, identity.userEmail, company)

  const { id, for_website, for_social, website_section, album_id, note } = await req.json()
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 })
  if (!isOwner && (for_website !== undefined || for_social !== undefined || website_section !== undefined)) {
    return NextResponse.json({ error: "Not available for your account" }, { status: 403 })
  }

  const admin = createAdminClient()
  const update: Record<string, unknown> = {}
  if (for_website !== undefined) update.for_website = for_website
  if (for_social !== undefined) update.for_social = for_social
  if (website_section !== undefined) update.website_section = website_section
  if (album_id !== undefined) update.album_id = album_id
  if (note !== undefined) update.note = typeof note === "string" && note.trim() ? note.trim() : null

  try { await assertStockPhotoPatch(admin, company.id, id, update) }
  catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify this photo." }, { status: error instanceof StockPhotoPlacementError ? 403 : 500 })
  }

  const { data, error } = await admin
    .from("company_photos")
    .update(update)
    .eq("id", id)
    .eq("company_id", company.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await recordCustomerActivity({
    eventType: "photo_updated",
    pathname: "/dashboard/photos",
    metadata: { photo_id: id, for_website, for_social, website_section, album_id },
  })
  return NextResponse.json({ photo: data ? photoPayload(data) : data })
}

export async function DELETE(req: Request) {
  const identity = await resolveDashboardIdentity()
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })
  if (!(await requireOwnerAccess(identity.userId, identity.userEmail, company))) {
    return NextResponse.json({ error: "Not available for your account" }, { status: 403 })
  }

  const { id } = await req.json()
  const admin = createAdminClient()
  if (typeof id !== "string" || !id) return NextResponse.json({ error: "Photo id required" }, { status: 400 })
  let deletion: Awaited<ReturnType<typeof deletePhotoPlacement>>
  try {
    deletion = await deletePhotoPlacement(admin, company.id, id)
  } catch (error) {
    if (error instanceof PhotoInUseError) {
      return NextResponse.json({ error: error.message, code: error.code, uses: error.uses }, { status: 409 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete photo" }, { status: 500 })
  }

  await recordCustomerActivity({
    eventType: "photo_deleted",
    pathname: "/dashboard/photos",
    metadata: { photo_id: id, ...deletion },
  })
  return NextResponse.json({ success: true, ...deletion })
}
