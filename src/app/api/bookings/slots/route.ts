import { NextRequest, NextResponse } from "next/server"
import { getAvailableSlots } from "@/lib/bookings/getAvailableSlots"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get("company_id")?.trim()
  const date = searchParams.get("date")?.trim()

  if (!companyId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "company_id and date (YYYY-MM-DD) are required" }, { status: 400 })
  }

  const slots = await getAvailableSlots(companyId, date)
  return NextResponse.json({ slots })
}
