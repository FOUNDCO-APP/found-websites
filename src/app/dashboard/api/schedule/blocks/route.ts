import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ blocks: [] }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ blocks: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from("availability_blocks")
    .select("id, block_date, range_start, range_end, label, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })

  return NextResponse.json({ blocks: data ?? [] })
}
