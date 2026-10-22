import { NextRequest, NextResponse } from "next/server"
import { resolveDashboardIdentity } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/security/rateLimit"
import { createClient } from "@/lib/supabase/server"
import { fetchStockPhoto } from "@/lib/pexels"
import { getPhotoPool } from "@/lib/photoPool"
import { isSecurityGuardIndustry } from "@/lib/industryDetection"

// Called once per company when they have no hero image.
// Guard businesses use only reviewed inventory; other industries retain Pexels selection.
export async function POST(request: NextRequest) {
  try {
    const limit = checkPublicRateLimit(request, { key: "stock-photo", limit: 12, windowMs: 10 * 60 * 1000 })
    if (!limit.allowed) return rateLimitResponse(limit)

    const identity = await resolveDashboardIdentity()
    if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { companyId } = await request.json()

    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 })
    }

    const company = await getCompany(identity.userId, identity.userEmail)
    if (!company || company.id !== companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    if (!(await requireOwnerAccess(identity.userId, identity.userEmail, company))) {
      return NextResponse.json({ error: "Not available for your account" }, { status: 403 })
    }

    const industryCategory = company.industry_category || ""
    const vibe = company.vibe || "bold"
    const photoUrl = industryCategory === "professional_services" && isSecurityGuardIndustry(company.sub_industry)
      ? (await getPhotoPool(industryCategory, vibe, company.sub_industry || undefined)).urls[0] ?? null
      : await fetchStockPhoto(industryCategory, vibe, company.city)
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
