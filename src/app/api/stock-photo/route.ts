import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchStockPhoto } from "@/lib/pexels"

// Called once per company when they have no hero image.
// Fetches a Pexels photo and saves it to website_config so it's never fetched again.
export async function POST(request: NextRequest) {
  try {
    const { companyId, industryCategory, vibe, city } = await request.json()

    if (!companyId || !industryCategory) {
      return NextResponse.json({ error: "companyId and industryCategory required" }, { status: 400 })
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
