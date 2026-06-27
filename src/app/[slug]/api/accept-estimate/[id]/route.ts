import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ slug: string; id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { slug, id } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({})) as { paid?: boolean }

  const admin = createAdminClient()
  const { data: estimate } = await admin
    .from("estimates")
    .select("id, status")
    .eq("id", id)
    .eq("company_id", company.id)
    .single()

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (estimate.status === "accepted" && !body.paid) return NextResponse.json({ success: true })

  const now = new Date().toISOString()
  const patch: Record<string, string> = {
    status: "accepted",
    accepted_at: now,
    updated_at: now,
  }
  if (body.paid) patch.deposit_paid_at = now

  await admin.from("estimates").update(patch).eq("id", id)

  return NextResponse.json({ success: true })
}
