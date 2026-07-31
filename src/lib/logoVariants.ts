// Shared logo-variant generation, used by both onboarding upload and the
// dashboard's post-onboarding logo re-upload. Kept in one place so the two
// paths can never drift into different (and differently broken) logic.

import * as Sentry from "@sentry/nextjs"

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
