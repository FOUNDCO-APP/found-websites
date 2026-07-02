import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/getAuthUser"

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ predictions: [] }, { status: 401 })

  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 2) return NextResponse.json({ predictions: [] })

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return NextResponse.json({ predictions: [] })

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json")
  url.searchParams.set("input", q)
  url.searchParams.set("key", apiKey)
  url.searchParams.set("types", "address")
  url.searchParams.set("components", "country:us")
  url.searchParams.set("language", "en")

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) return NextResponse.json({ predictions: [] })

  const data = await res.json()
  const predictions = (data.predictions ?? []).slice(0, 5).map((p: { description: string; place_id: string }) => ({
    description: p.description,
    place_id: p.place_id,
  }))

  return NextResponse.json({ predictions })
}
