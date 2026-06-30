import { NextRequest, NextResponse } from "next/server"

type AddressComponent = {
  long_name: string
  short_name: string
  types: string[]
}

function cityFromGeocode(results: Array<{ address_components?: AddressComponent[] }>) {
  for (const result of results) {
    const parts = result.address_components ?? []
    const city = parts.find((p) => p.types.includes("locality"))
      ?? parts.find((p) => p.types.includes("postal_town"))
      ?? parts.find((p) => p.types.includes("administrative_area_level_3"))
      ?? parts.find((p) => p.types.includes("administrative_area_level_2"))
    const state = parts.find((p) => p.types.includes("administrative_area_level_1"))
    if (city?.long_name && state?.short_name) return `${city.long_name}, ${state.short_name}`
  }
  return null
}

export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return NextResponse.json({ predictions: [] })

  const lat = req.nextUrl.searchParams.get("lat")
  const lng = req.nextUrl.searchParams.get("lng")
  if (lat && lng) {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${encodeURIComponent(`${lat},${lng}`)}` +
      `&result_type=locality|administrative_area_level_2|administrative_area_level_1` +
      `&key=${key}`

    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } })
    const data = await res.json()
    return NextResponse.json({ location: cityFromGeocode(data.results ?? []) })
  }

  const q = req.nextUrl.searchParams.get("q") ?? ""
  if (q.length < 2) return NextResponse.json({ predictions: [] })

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