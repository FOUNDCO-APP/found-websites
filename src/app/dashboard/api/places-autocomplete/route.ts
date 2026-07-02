import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/getAuthUser"

async function geocodeBias(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    const loc = data.results?.[0]?.geometry?.location
    return loc ? { lat: loc.lat, lng: loc.lng } : null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ predictions: [] }, { status: 401 })

  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 2) return NextResponse.json({ predictions: [] })

  const bias = req.nextUrl.searchParams.get("bias")?.trim()

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return NextResponse.json({ predictions: [] })

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json")
  url.searchParams.set("input", q)
  url.searchParams.set("key", apiKey)
  url.searchParams.set("types", "address")
  url.searchParams.set("components", "country:us")
  url.searchParams.set("language", "en")

  if (bias) {
    const loc = await geocodeBias(bias, apiKey)
    if (loc) {
      url.searchParams.set("location", `${loc.lat},${loc.lng}`)
      url.searchParams.set("radius", "80000")
    }
  }

  const res = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!res.ok) return NextResponse.json({ predictions: [] })

  const data = await res.json()
  const predictions = (data.predictions ?? []).slice(0, 5).map((p: { description: string; place_id: string }) => ({
    description: p.description,
    place_id: p.place_id,
  }))

  return NextResponse.json({ predictions })
}
