import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/security/rateLimit"
import { createClient } from "@/lib/supabase/server"
import { fetchStockPhoto } from "@/lib/pexels"

// Called once per company when they have no hero image.
// Fetches a Pexels photo and saves it to website_config so it's never fetched again.
export async function POST(request: NextRequest) {
  try {
    const limit = checkPublicRateLimit(request, { key: "stock-photo", limit: 12, windowMs: 10 * 60 * 1000 })
    if (!limit.allowed) return rateLimitResponse(limit)

    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { companyId, industryCategory, vibe, city } = await request.json()

    if (!companyId || !industryCategory) {
      return NextResponse.json({ error: "companyId and industryCategory required" }, { status: 400 })
    }

    const company = await getCompany(user.id, user.email ?? "")
    if (!company || company.id !== companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    if (!(await requireOwnerAccess(user.id, user.email ?? "", company))) {
      return NextResponse.json({ error: "Not available for your account" }, { status: 403 })
    }

    const photoUrl = await fetchStockPhoto(industryCategory, vibe, city)
    if (!photoUrl) {
      return NextResponse.json({ error: "No photo found" }, { status: 404 })
    }

    // Save to Supabase so this never runs again for this company
    const supabase = await createClient()
    const { error } = await supabase
      .from("website_config")
      .update({ hero_image_url: photoUrl })
      .eq("company_id", companyId)

    if (error) {
      console.error("[stock-photo] Supabase update error:", error)
      return NextResponse.json({ error: "Failed to save photo" }, { status: 500 })
    }

    return NextResponse.json({ url: photoUrl })
  } catch (err) {
    console.error("[stock-photo] route error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
