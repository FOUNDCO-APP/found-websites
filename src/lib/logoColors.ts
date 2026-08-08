// Returns the strongest usable brand colors from a logo image. Skips
// white/black/gray so white logo variants do not create fake palettes.
// Server-only (uses sharp) - call from a server action or route handler.
export async function extractLogoColors(bytes: ArrayBuffer, mimeType: string): Promise<string[]> {
  try {
    const sharp = (await import("sharp")).default
    const { data } = await sharp(Buffer.from(bytes))
      .resize(180, 180, { fit: "inside", withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const buckets: Record<string, { count: number; r: number; g: number; b: number; score: number }> = {}
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]
      if (alpha < 55) continue
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      if (r > 220 && g > 220 && b > 220) continue
      if (r < 35 && g < 35 && b < 35) continue
      const saturation = max - min
      if (saturation < 34) continue

      const qr = Math.round(r / 16) * 16
      const qg = Math.round(g / 16) * 16
      const qb = Math.round(b / 16) * 16
      const key = `${Math.min(255, qr)},${Math.min(255, qg)},${Math.min(255, qb)}`
      const bucket = buckets[key] ?? { count: 0, r: 0, g: 0, b: 0, score: 0 }
      bucket.count += 1
      bucket.r += r
      bucket.g += g
      bucket.b += b
      bucket.score += saturation * (alpha / 255)
      buckets[key] = bucket
    }

    const colors: string[] = []
    const ranked = Object.values(buckets)
      .filter((bucket) => bucket.count >= 3)
      .sort((a, b) => (b.count * b.score) - (a.count * a.score))

    for (const bucket of ranked) {
      const r = Math.round(bucket.r / bucket.count)
      const g = Math.round(bucket.g / bucket.count)
      const b = Math.round(bucket.b / bucket.count)
      const tooClose = colors.some((hex) => {
        const existing = hex.match(/\w\w/g)?.map((v) => parseInt(v, 16)) ?? [0, 0, 0]
        return Math.abs(existing[0] - r) + Math.abs(existing[1] - g) + Math.abs(existing[2] - b) < 56
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
