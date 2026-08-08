// Shared logo-variant generation, used by both onboarding upload and the
// dashboard's post-onboarding logo re-upload. Kept in one place so the two
// paths can never drift into different (and differently broken) logic.

import * as Sentry from "@sentry/nextjs"

function colorDistance(a: [number, number, number], b: [number, number, number]) {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
    Math.pow(a[1] - b[1], 2) +
    Math.pow(a[2] - b[2], 2),
  )
}

// Many real business logos arrive as "PNG" files flattened onto a white
// canvas. That makes templates put a white box behind the brand on dark
// sections. When the outer edge is clearly a light background, remove only
// the connected edge background and keep the logo artwork intact.
export async function removeLightLogoBackground(bytes: ArrayBuffer, mimeType: string): Promise<Buffer | null> {
  if (mimeType === "image/gif" || mimeType === "image/svg+xml") return null
  try {
    const sharp = (await import("sharp")).default
    const { data, info } = await sharp(Buffer.from(bytes))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { width, height } = info
    const edgeColors: [number, number, number][] = []
    const pushPixel = (x: number, y: number) => {
      const i = (y * width + x) * 4
      if (data[i + 3] > 245) edgeColors.push([data[i], data[i + 1], data[i + 2]])
    }

    for (let x = 0; x < width; x += 1) {
      pushPixel(x, 0)
      pushPixel(x, height - 1)
    }
    for (let y = 1; y < height - 1; y += 1) {
      pushPixel(0, y)
      pushPixel(width - 1, y)
    }
    if (edgeColors.length < Math.max(8, Math.floor((width + height) / 8))) return null

    const bg = edgeColors.reduce<[number, number, number]>((sum, color) => [
      sum[0] + color[0],
      sum[1] + color[1],
      sum[2] + color[2],
    ], [0, 0, 0]).map((v) => Math.round(v / edgeColors.length)) as [number, number, number]

    if (bg[0] < 225 || bg[1] < 225 || bg[2] < 225 || colorDistance(bg, [255, 255, 255]) > 55) return null

    const seen = new Uint8Array(width * height)
    const queue: number[] = []
    const enqueue = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return
      const p = y * width + x
      if (seen[p]) return
      const i = p * 4
      if (data[i + 3] < 10) return
      if (colorDistance([data[i], data[i + 1], data[i + 2]], bg) > 44) return
      seen[p] = 1
      queue.push(p)
    }

    for (let x = 0; x < width; x += 1) {
      enqueue(x, 0)
      enqueue(x, height - 1)
    }
    for (let y = 1; y < height - 1; y += 1) {
      enqueue(0, y)
      enqueue(width - 1, y)
    }

    let removed = 0
    for (let q = 0; q < queue.length; q += 1) {
      const p = queue[q]
      const i = p * 4
      data[i + 3] = 0
      removed += 1
      const x = p % width
      const y = Math.floor(p / width)
      enqueue(x + 1, y)
      enqueue(x - 1, y)
      enqueue(x, y + 1)
      enqueue(x, y - 1)
    }

    const total = width * height
    if (removed < total * 0.08 || removed > total * 0.92) return null

    return sharp(data, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer()
  } catch (err) {
    console.error("[logoVariants] removeLightLogoBackground failed:", err)
    Sentry.captureException(err, { tags: { area: "logoVariants" }, extra: { mimeType, byteLength: bytes.byteLength } })
    return null
  }
}

export async function detectLogoTone(bytes: ArrayBuffer, mimeType: string): Promise<"light" | "dark" | "mixed" | "unknown"> {
  if (mimeType === "image/gif") return "unknown"
  try {
    const sharp = (await import("sharp")).default
    const { data } = await sharp(Buffer.from(bytes))
      .ensureAlpha()
      .resize({ width: 240, height: 240, fit: "inside", withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true })

    let count = 0
    let light = 0
    let dark = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 40) continue
      const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      count += 1
      if (luma > 205) light += 1
      if (luma < 95) dark += 1
    }
    if (count < 20) return "unknown"
    if (light / count > 0.72) return "light"
    if (dark / count > 0.72) return "dark"
    return "mixed"
  } catch (err) {
    console.error("[logoVariants] detectLogoTone failed:", err)
    Sentry.captureException(err, { tags: { area: "logoVariants" }, extra: { mimeType, byteLength: bytes.byteLength } })
    return "unknown"
  }
}

export async function createDarkLogoVariant(bytes: ArrayBuffer, mimeType: string): Promise<Buffer | null> {
  if (mimeType === "image/gif") return null
  try {
    const sharp = (await import("sharp")).default
    const { data, info } = await sharp(Buffer.from(bytes))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        data[i] = 17
        data[i + 1] = 17
        data[i + 2] = 17
      }
    }

    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toBuffer()
  } catch (err) {
    console.error("[logoVariants] createDarkLogoVariant failed:", err)
    Sentry.captureException(err, { tags: { area: "logoVariants" }, extra: { mimeType, byteLength: bytes.byteLength } })
    return null
  }
}

// Auto-generates a white silhouette for use on dark navbars/footers.
// Only safe when the source has a real transparent background — for a
// fully-opaque upload (JPEG, or a PNG flattened onto a solid background)
// there is no way to tell logo from background, and forcing one to white
// would just produce a solid white rectangle (the bug this replaces).
// In that case this returns null and the frontend falls back to showing
// the true-color logo on a small white plate instead of guessing.
export async function createWhiteLogoVariant(bytes: ArrayBuffer, mimeType: string): Promise<Buffer | null> {
  if (mimeType === "image/gif") return null
  try {
    const sharp = (await import("sharp")).default
    const { data, info } = await sharp(Buffer.from(bytes))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    let hasRealTransparency = false
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) { hasRealTransparency = true; break }
    }
    if (!hasRealTransparency) {
      console.warn("[logoVariants] createWhiteLogoVariant: no real transparency detected, skipping", { mimeType, byteLength: bytes.byteLength, width: info.width, height: info.height })
      return null
    }

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        data[i] = 255
        data[i + 1] = 255
        data[i + 2] = 255
      }
    }

    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toBuffer()
  } catch (err) {
    console.error("[logoVariants] createWhiteLogoVariant failed:", err)
    Sentry.captureException(err, { tags: { area: "logoVariants" }, extra: { mimeType, byteLength: bytes.byteLength } })
    return null
  }
}
