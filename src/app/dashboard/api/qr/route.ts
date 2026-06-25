import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const data = searchParams.get("data")
  if (!data) return NextResponse.json({ error: "Missing data" }, { status: 400 })

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(data)}&margin=20`

  try {
    const res = await fetch(qrUrl)
    if (!res.ok) return NextResponse.json({ error: "QR generation failed" }, { status: 502 })

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'attachment; filename="subscribe-qr.png"',
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 })
  }
}
