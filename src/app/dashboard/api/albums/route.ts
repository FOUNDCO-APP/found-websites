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

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ albums: [] }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ albums: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from("photo_albums")
    .select("id, name, slug, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })

  const albumIds = (data ?? []).map((a: { id: string }) => a.id)
  let coverMap: Record<string, string> = {}
  if (albumIds.length > 0) {
    const { data: covers } = await admin
      .from("company_photos")
      .select("album_id, url")
      .eq("company_id", company.id)
      .in("album_id", albumIds)
      .order("created_at", { ascending: false })
    for (const c of (covers ?? [])) {
      if (c.album_id && !coverMap[c.album_id]) coverMap[c.album_id] = c.url
    }
  }

  const albums = (data ?? []).map((a: { id: string; name: string; slug: string; created_at: string }) => ({
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

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const admin = createAdminClient()
  let slug = toSlug(name)

  // ensure unique slug within company
  const { data: existing } = await admin
    .from("photo_albums")
    .select("slug")
    .eq("company_id", company.id)
    .like("slug", `${slug}%`)

  if (existing && existing.length > 0) {
    slug = `${slug}-${existing.length + 1}`
  }

  const { data, error } = await admin
    .from("photo_albums")
    .insert({ company_id: company.id, name: name.trim(), slug })
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

  const { id, name } = await req.json()
  if (!id || !name?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("photo_albums")
    .update({ name: name.trim() })
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
