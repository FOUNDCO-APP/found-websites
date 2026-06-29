import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

type SocialFormat = "square" | "portrait" | "story"
type SocialStatus = "draft" | "shared" | "downloaded" | "archived"

type PhotoRow = {
  id: string
  url: string
  created_at: string
}

type DraftRow = {
  id: string
  company_id: string
  photo_id: string
  format: SocialFormat
  caption: string
  status: SocialStatus
  generated_image_url: string | null
  created_at: string
  updated_at: string
}

const FORMATS: SocialFormat[] = ["square", "portrait", "story"]

function tableMissing(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || error?.message?.toLowerCase().includes("social_post_drafts")
}

function industryCaption(company: NonNullable<Awaited<ReturnType<typeof getCompany>>>) {
  const name = company.name || "our team"
  const city = [company.city, company.state].filter(Boolean).join(", ")
  const locationLine = city ? ` in ${city}` : ""

  switch (company.industry_category) {
    case "food":
    case "home_based_food":
      return `Fresh from ${name}${locationLine}.\n\nOrder, visit, or message us today.\n\n#localfood #supportlocal`
    case "retail":
    case "makers_crafts":
      return `New from ${name}${locationLine}.\n\nSee what is available and message us if you want one.\n\n#shoplocal #smallbusiness`
    case "beauty":
    case "wellness":
      return `A fresh look from ${name}${locationLine}.\n\nAppointments are available. Message us to book.\n\n#localbusiness #selfcare`
    case "creative_services":
      return `Recent work from ${name}${locationLine}.\n\nIf you need something like this, let us know.\n\n#creativework #localbusiness`
    case "home_services":
    case "landscaping":
    case "cleaning":
    case "home_property":
      return `Another job wrapped by ${name}${locationLine}.\n\nNeed help with yours? Send us a message.\n\n#localbusiness #homeimprovement`
    default:
      return `Recent work from ${name}${locationLine}.\n\nNeed help with something similar? Send us a message.\n\n#localbusiness #supportlocal`
  }
}

async function draftsForCompany(companyId: string) {
  const admin = createAdminClient()
  const { data: drafts, error } = await admin
    .from("social_post_drafts")
    .select("id, company_id, photo_id, format, caption, status, generated_image_url, created_at, updated_at")
    .eq("company_id", companyId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })

  if (error) return { drafts: [], error }

  const photoIds = Array.from(new Set((drafts ?? []).map((d: DraftRow) => d.photo_id)))
  let photoMap: Record<string, PhotoRow> = {}
  if (photoIds.length > 0) {
    const { data: photos } = await admin
      .from("company_photos")
      .select("id, url, created_at")
      .eq("company_id", companyId)
      .in("id", photoIds)
    for (const photo of (photos ?? []) as PhotoRow[]) photoMap[photo.id] = photo
  }

  return {
    drafts: ((drafts ?? []) as DraftRow[]).map((draft) => ({
      ...draft,
      photo_url: photoMap[draft.photo_id]?.url ?? null,
      photo_created_at: photoMap[draft.photo_id]?.created_at ?? null,
    })),
    error: null,
  }
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ drafts: [] }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ drafts: [] })

  const result = await draftsForCompany(company.id)
  if (tableMissing(result.error)) return NextResponse.json({ drafts: [], tableReady: false })
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json({ drafts: result.drafts, tableReady: true })
}

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const requestedPhotoIds = Array.isArray(body.photoIds) ? body.photoIds.filter(Boolean) : []

  const admin = createAdminClient()
  let photoQuery = admin
    .from("company_photos")
    .select("id, url, created_at")
    .eq("company_id", company.id)
    .eq("for_social", true)
    .order("created_at", { ascending: false })

  if (requestedPhotoIds.length > 0) photoQuery = photoQuery.in("id", requestedPhotoIds)

  const { data: photos, error: photosError } = await photoQuery
  if (photosError) return NextResponse.json({ error: photosError.message }, { status: 500 })

  const caption = industryCaption(company)
  const rows = ((photos ?? []) as PhotoRow[]).flatMap((photo) =>
    FORMATS.map((format) => ({ company_id: company.id, photo_id: photo.id, format, caption, status: "draft" as SocialStatus }))
  )

  if (rows.length > 0) {
    const { error } = await admin
      .from("social_post_drafts")
      .upsert(rows, { onConflict: "company_id,photo_id,format", ignoreDuplicates: true })
    if (tableMissing(error)) return NextResponse.json({ error: "Social drafts table is not ready.", tableReady: false }, { status: 503 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const result = await draftsForCompany(company.id)
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json({ drafts: result.drafts, tableReady: true })
}

export async function PATCH(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

  const { id, caption, status } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing draft id" }, { status: 400 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof caption === "string") update.caption = caption
  if (["draft", "shared", "downloaded", "archived"].includes(status)) update.status = status

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("social_post_drafts")
    .update(update)
    .eq("id", id)
    .eq("company_id", company.id)
    .select("id, company_id, photo_id, format, caption, status, generated_image_url, created_at, updated_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft: data })
}