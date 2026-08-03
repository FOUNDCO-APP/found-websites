// Returns the strongest usable brand colors from a logo image. Skips
// white/black/gray so white logo variants do not create fake palettes.
// Server-only (uses sharp) - call from a server action or route handler.
export async function extractLogoColors(bytes: ArrayBuffer, mimeType: string): Promise<string[]> {
  if (mimeType === "image/svg+xml") return []
  try {
    const sharp = (await import("sharp")).default
    const { data } = await sharp(Buffer.from(bytes))
      .resize(72, 72, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const counts: Record<string, number> = {}
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]
      if (alpha < 40) continue
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      if (r > 220 && g > 220 && b > 220) continue
      if (r < 35 && g < 35 && b < 35) continue
      if (max - min < 28) continue

      const qr = Math.round(r / 24) * 24
      const qg = Math.round(g / 24) * 24
      const qb = Math.round(b / 24) * 24
      const key = `${Math.min(255, qr)},${Math.min(255, qg)},${Math.min(255, qb)}`
      counts[key] = (counts[key] ?? 0) + 1
    }

    const colors: string[] = []
    for (const [key] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      const [r, g, b] = key.split(",").map(Number)
      const tooClose = colors.some((hex) => {
        const existing = hex.match(/\w\w/g)?.map((v) => parseInt(v, 16)) ?? [0, 0, 0]
        return Math.abs(existing[0] - r) + Math.abs(existing[1] - g) + Math.abs(existing[2] - b) < 72
      })
      if (tooClose) continue
      colors.push(`#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`)
      if (colors.length >= 5) break
    }
    return colors
  } catch {
    return []
  }
}
