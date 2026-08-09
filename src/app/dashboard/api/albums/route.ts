import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
}

async function uniqueAlbumSlug(admin: ReturnType<typeof createAdminClient>, companyId: string, name: string, exceptId?: string) {
  const base = toSlug(name) || "album"
  const { data: existing } = await admin
    .from("photo_albums")
    .select("id, slug")
    .eq("company_id", companyId)
    .like("slug", `${base}%`)

  const taken = new Set(
    (existing ?? [])
      .filter(row => row.id !== exceptId)
      .map(row => row.slug)
  )

  if (!taken.has(base)) return base

  let index = 2
  while (taken.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}

type AlbumRow = {
  id: string
  name: string
  slug: string
  album_type?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  customer_email?: string | null
  service_address?: string | null
  cover_photo_id?: string | null
  created_at: string
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ albums: [] }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ albums: [] })

  const admin = createAdminClient()
  let { data, error }: { data: AlbumRow[] | null; error: { message: string } | null } = await admin
    .from("photo_albums")
    .select("id, name, slug, album_type, customer_name, customer_phone, customer_email, service_address, cover_photo_id, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })

  if (error) {
    const fallback = await admin
      .from("photo_albums")
      .select("id, name, slug, created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
    data = fallback.data
  }

  const albumIds = (data ?? []).map((a: { id: string }) => a.id)
  let coverMap: Record<string, string> = {}
  if (albumIds.length > 0) {
    const { data: covers } = await admin
      .from("company_photos")
      .select("album_id, url")
      .eq("company_id", company.id)
      .in("album_id", albumIds)
      .order("created_at", { ascending: false })
      .limit(albumIds.length * 2)
    for (const c of (covers ?? [])) {
      if (c.album_id && !coverMap[c.album_id]) coverMap[c.album_id] = c.url
    }
  }

  const albums = (data ?? []).map((a: AlbumRow) => ({
    ...a,
    cover_url: coverMap[a.id] ?? null,
  }))

  return NextResponse.json({ albums })
}

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

  const { name, album_type, customer_name, customer_phone, customer_email, service_address, cover_photo_id } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const admin = createAdminClient()
  const slug = await uniqueAlbumSlug(admin, company.id, name)

  const insertPayload = {
    company_id: company.id,
    name: name.trim(),
    slug,
    album_type: album_type === "job" ? "job" : "album",
    customer_name: customer_name?.trim() || null,
    customer_phone: customer_phone?.trim() || null,
    customer_email: customer_email?.trim() || null,
    service_address: service_address?.trim() || null,
    cover_photo_id: cover_photo_id || null,
  }

  const { data, error }: { data: AlbumRow | null; error: { message: string } | null } = await admin
    .from("photo_albums")
    .insert(insertPayload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ album: data })
}

export async function PATCH(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

  const body = await req.json()
  const { id, name, customer_name, customer_phone, customer_email, service_address, cover_photo_id } = body
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const admin = createAdminClient()
  const updates: Record<string, string | null> = {}

  if (typeof name === "string") {
    const nextName = name.trim()
    if (!nextName) return NextResponse.json({ error: "Name required" }, { status: 400 })
    updates.name = nextName
    updates.slug = await uniqueAlbumSlug(admin, company.id, nextName, id)
  }

  if ("customer_name" in body) updates.customer_name = typeof customer_name === "string" && customer_name.trim() ? customer_name.trim() : null
  if ("customer_phone" in body) updates.customer_phone = typeof customer_phone === "string" && customer_phone.trim() ? customer_phone.trim() : null
  if ("customer_email" in body) updates.customer_email = typeof customer_email === "string" && customer_email.trim() ? customer_email.trim() : null
  if ("service_address" in body) updates.service_address = typeof service_address === "string" && service_address.trim() ? service_address.trim() : null
  if ("cover_photo_id" in body) updates.cover_photo_id = typeof cover_photo_id === "string" && cover_photo_id.trim() ? cover_photo_id.trim() : null

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "No updates" }, { status: 400 })

  const { data, error } = await admin
    .from("photo_albums")
    .update(updates)
    .eq("id", id)
    .eq("company_id", company.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ album: data })
}

export async function DELETE(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 })

  const admin = createAdminClient()
  await admin.from("photo_albums").delete().eq("id", id).eq("company_id", company.id)

  return NextResponse.json({ success: true })
}
