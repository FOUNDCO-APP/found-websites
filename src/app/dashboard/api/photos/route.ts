import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ photos: [] }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ photos: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from("company_photos")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })

  return NextResponse.json({ photos: data ?? [] })
}

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  const admin = createAdminClient()
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${company.id}/${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from("company-assets")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage
    .from("company-assets")
    .getPublicUrl(path)

  const { data, error } = await admin
    .from("company_photos")
    .insert({ company_id: company.id, storage_path: path, url: publicUrl })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ photo: data })
}

export async function PATCH(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

  const { id, for_website, for_social, website_section, album_id } = await req.json()
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 })

  const admin = createAdminClient()
  const update: Record<string, unknown> = {}
  if (for_website !== undefined) update.for_website = for_website
  if (for_social !== undefined) update.for_social = for_social
  if (website_section !== undefined) update.website_section = website_section
  if (album_id !== undefined) update.album_id = album_id

  const { data, error } = await admin
    .from("company_photos")
    .update(update)
    .eq("id", id)
    .eq("company_id", company.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ photo: data })
}

export async function DELETE(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

  const { id, storage_path } = await req.json()
  const admin = createAdminClient()

  await admin.storage.from("company-assets").remove([storage_path])
  await admin.from("company_photos").delete().eq("id", id).eq("company_id", company.id)

  return NextResponse.json({ success: true })
}
