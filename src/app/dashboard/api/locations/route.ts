import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { recordCustomerActivity } from "@/lib/customerActivity"
import { createAdminClient } from "@/lib/supabase/admin"

function clean(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : ""
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ locations: [] }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ locations: [] })
  if (!(await requireOwnerAccess(user.id, user.email ?? "", company))) return NextResponse.json({ locations: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from("company_locations")
    .select("id, name, address, phone, hours, sort_order")
    .eq("company_id", company.id)
    .order("sort_order", { ascending: true })

  return NextResponse.json({ locations: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })
  if (!(await requireOwnerAccess(user.id, user.email ?? "", company))) return NextResponse.json({ error: "Not available for your account" }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const name    = clean(body.name, 100)
  const address = clean(body.address, 300)
  const phone   = clean(body.phone, 40)
  const hours   = clean(body.hours, 300)

  if (!name) return NextResponse.json({ error: "Location name is required" }, { status: 400 })

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("company_locations")
    .select("id")
    .eq("company_id", company.id)
  const sortOrder = (existing ?? []).length

  const { data, error } = await admin
    .from("company_locations")
    .insert({ company_id: company.id, name, address: address || null, phone: phone || null, hours: hours || null, sort_order: sortOrder })
    .select("id, name, address, phone, hours, sort_order")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await recordCustomerActivity({
    eventType: "location_created",
    pathname: "/dashboard/locations",
    metadata: { location_id: data.id },
  })
  return NextResponse.json({ location: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })
  if (!(await requireOwnerAccess(user.id, user.email ?? "", company))) return NextResponse.json({ error: "Not available for your account" }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const updates: Record<string, string | null> = {}
  if ("name"    in body) updates.name    = clean(body.name, 100) || null
  if ("address" in body) updates.address = clean(body.address, 300) || null
  if ("phone"   in body) updates.phone   = clean(body.phone, 40) || null
  if ("hours"   in body) updates.hours   = clean(body.hours, 300) || null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("company_locations")
    .update(updates)
    .eq("id", body.id)
    .eq("company_id", company.id)
    .select("id, name, address, phone, hours, sort_order")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await recordCustomerActivity({
    eventType: "location_updated",
    pathname: "/dashboard/locations",
    metadata: { location_id: data.id },
  })
  return NextResponse.json({ location: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })
  if (!(await requireOwnerAccess(user.id, user.email ?? "", company))) return NextResponse.json({ error: "Not available for your account" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const admin = createAdminClient()
  await admin.from("company_locations").delete().eq("id", id).eq("company_id", company.id)
  await recordCustomerActivity({
    eventType: "location_deleted",
    pathname: "/dashboard/locations",
    metadata: { location_id: id },
  })
  return NextResponse.json({ ok: true })
}
