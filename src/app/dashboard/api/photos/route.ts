import { resolveDashboardIdentity } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { recordCustomerActivity } from "@/lib/customerActivity"
import { mediaKindFromUrl } from "@/lib/mediaKind"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

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

export async function POST(req: Request) {
  const identity = await resolveDashboardIdentity()
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

  const admin = createAdminClient()
  const contentType = req.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    const body = await req.json()
    const albumId = body.album_id || null

    if (body.intent === "signed-upload") {
      const ext = safeExtension(body.file_name, body.content_type)
      const path = `${company.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
      if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not prepare upload" }, { status: 500 })
      const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)
      return NextResponse.json({ bucket: BUCKET, path, token: data.token, publicUrl, album_id: albumId })
    }

    if (body.storage_path && body.url) {
      const { data, error } = await admin
        .from("company_photos")
        .insert({ company_id: company.id, storage_path: body.storage_path, url: body.url, album_id: albumId })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      await recordCustomerActivity({
        eventType: "photo_uploaded",
        pathname: "/dashboard/photos",
        metadata: { photo_id: data.id, album_id: albumId, upload_mode: "signed" },
      })
      return NextResponse.json({ photo: photoPayload(data, body.mime_type) })
    }

    return NextResponse.json({ error: "Invalid media upload request" }, { status: 400 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const albumId = (formData.get("album_id") as string | null) || null
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  const ext = safeExtension(file.name, file.type)
  const path = `${company.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage
    .from(BUCKET)
    .getPublicUrl(path)

  const { data, error } = await admin
    .from("company_photos")
    .insert({ company_id: company.id, storage_path: path, url: publicUrl, album_id: albumId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const payload = photoPayload(data, file.type)
  await recordCustomerActivity({
    eventType: "photo_uploaded",
    pathname: "/dashboard/photos",
    metadata: { photo_id: data.id, album_id: albumId, upload_mode: "form", media_type: payload.media_type },
  })
  return NextResponse.json({ photo: payload })
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

  const { data: photo } = await admin
    .from("company_photos")
    .select("url, storage_path")
    .eq("id", id)
    .eq("company_id", company.id)
    .single()

  if (photo?.storage_path) await admin.storage.from(BUCKET).remove([photo.storage_path])
  await admin.from("company_photos").delete().eq("id", id).eq("company_id", company.id)
  if (photo?.url) {
    await admin.from("media").delete().eq("company_id", company.id).eq("url", photo.url)
    await admin.from("media").delete().eq("company_id", company.id).eq("thumbnail_url", photo.url)
  }

  await recordCustomerActivity({
    eventType: "photo_deleted",
    pathname: "/dashboard/photos",
    metadata: { photo_id: id },
  })
  return NextResponse.json({ success: true })
}
