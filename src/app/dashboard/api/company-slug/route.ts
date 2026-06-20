import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ slug: null }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  return NextResponse.json({ slug: company?.slug ?? null })
}
