import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? ""
  if (q.length < 2) return NextResponse.json({ predictions: [] })

  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return NextResponse.json({ predictions: [] })

  const url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
    `?input=${encodeURIComponent(q)}` +
    `&types=(regions)` +
    `&components=country:us` +
    `&key=${key}`

  const res = await fetch(url, { next: { revalidate: 60 } })
  const data = await res.json()

  return NextResponse.json({ predictions: data.predictions ?? [] })
}
