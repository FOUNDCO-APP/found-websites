import { resolveDashboardIdentity } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const identity = await resolveDashboardIdentity()
  if (!identity) return NextResponse.json({ emailSends: [] }, { status: 401 })

  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) return NextResponse.json({ emailSends: [] })
  if (!(await requireOwnerAccess(identity.userId, identity.userEmail, company))) return NextResponse.json({ emailSends: [] })

  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")
  if (!email) return NextResponse.json({ emailSends: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from("email_sends")
    .select("id, subject, created_at, recipient_name")
    .eq("company_id", company.id)
    .eq("recipient_email", email)
    .order("created_at", { ascending: false })
    .limit(50)

  return NextResponse.json({ emailSends: data ?? [] })
}
