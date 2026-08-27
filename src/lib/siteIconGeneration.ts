import sharp from "sharp"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { SiteIconAssetUrls } from "@/lib/siteIconAssets"

const ICON_BUCKET = "company-assets"

type UploadClient = Pick<SupabaseClient, "storage">

// iOS Safari's .ico decoder only understands classic BMP/DIB data - it cannot
// read PNG-compressed frames inside an .ico container. Our old encoder embedded
// PNGs, which desktop browsers accept but iPhone/iPad render as a broken-image
// glyph. This builds a real 32-bit BGRA BMP icon instead, which every browser
// including mobile Safari can decode.
function bmpIcoDib(rgbaTopDown: Buffer, size: number) {
  const rowBytes = size * 4
  const xor = Buffer.alloc(rowBytes * size)
  // BMP rows are bottom-up; pixels are BGRA, not RGBA.
  for (let y = 0; y < size; y++) {
    const srcRow = (size - 1 - y) * rowBytes
    const dstRow = y * rowBytes
    for (let x = 0; x < size; x++) {
      const s = srcRow + x * 4
      const d = dstRow + x * 4
      xor[d] = rgbaTopDown[s + 2]
      xor[d + 1] = rgbaTopDown[s + 1]
      xor[d + 2] = rgbaTopDown[s]
      xor[d + 3] = rgbaTopDown[s + 3]
    }
  }

  // 1bpp AND mask, rows padded to a 32-bit boundary. Left all-zero (opaque) so
  // decoders use the real alpha channel from the 32-bit XOR bitmap.
  const andRowBytes = Math.ceil(size / 32) * 4
  const and = Buffer.alloc(andRowBytes * size)

  const header = Buffer.alloc(40)
  header.writeUInt32LE(40, 0)
  header.writeInt32LE(size, 4)
  header.writeInt32LE(size * 2, 8)
  header.writeUInt16LE(1, 12)
  header.writeUInt16LE(32, 14)
  header.writeUInt32LE(0, 16)
  header.writeUInt32LE(xor.length + and.length, 20)

  return Buffer.concat([header, xor, and])
}

function buildIco(entries: { size: number; dib: Buffer }[]) {
  const dir = Buffer.alloc(6 + entries.length * 16)
  dir.writeUInt16LE(0, 0)
  dir.writeUInt16LE(1, 2)
  dir.writeUInt16LE(entries.length, 4)

  let offset = dir.length
  entries.forEach((entry, index) => {
    const row = 6 + index * 16
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, row)
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, row + 1)
    dir.writeUInt8(0, row + 2)
    dir.writeUInt8(0, row + 3)
    dir.writeUInt16LE(1, row + 4)
    dir.writeUInt16LE(32, row + 6)
    dir.writeUInt32LE(entry.dib.length, row + 8)
    dir.writeUInt32LE(offset, row + 12)
    offset += entry.dib.length
  })

  return Buffer.concat([dir, ...entries.map(entry => entry.dib)])
}

function resizeBackground(opaque: boolean) {
  return opaque
    ? { r: 255, g: 255, b: 255, alpha: 1 }
    : { r: 0, g: 0, b: 0, alpha: 0 }
}

// Favicons stay transparent so the mark is not trapped in a white box on the
// browser tab. apple-touch-icon and PWA icons need an opaque field because iOS
// paints black behind any transparency on the home screen.
async function squarePng(source: Buffer, size: number, opaque: boolean) {
  return sharp(source, { failOn: "none" })
    .resize(size, size, { fit: "contain", background: resizeBackground(opaque) })
    .png()
    .toBuffer()
}

async function squareRgba(source: Buffer, size: number) {
  const { data } = await sharp(source, { failOn: "none" })
    .resize(size, size, { fit: "contain", background: resizeBackground(false) })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return data
}

async function uploadIconAsset(
  admin: UploadClient,
  path: string,
  body: Buffer,
  contentType: string,
) {
  const { error } = await admin.storage
    .from(ICON_BUCKET)
    .upload(path, body, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    })

  if (error) throw new Error(error.message)
  return admin.storage.from(ICON_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function generateAndUploadSiteIconAssets(input: {
  admin: UploadClient
  companyId: string
  source: Buffer
  sourcePublicUrl: string
  version: string
}): Promise<SiteIconAssetUrls> {
  const basePath = `site-icons/${input.companyId}/generated/${input.version}`

  const [rgba16, rgba32, rgba48, png16, png32, png48, png180, png192, png512] = await Promise.all([
    squareRgba(input.source, 16),
    squareRgba(input.source, 32),
    squareRgba(input.source, 48),
    squarePng(input.source, 16, false),
    squarePng(input.source, 32, false),
    squarePng(input.source, 48, false),
    squarePng(input.source, 180, true),
    squarePng(input.source, 192, true),
    squarePng(input.source, 512, true),
  ])

  const ico = buildIco([
    { size: 16, dib: bmpIcoDib(rgba16, 16) },
    { size: 32, dib: bmpIcoDib(rgba32, 32) },
    { size: 48, dib: bmpIcoDib(rgba48, 48) },
  ])

  const [faviconIcoUrl, favicon16Url, favicon32Url, favicon48Url, appleTouchIconUrl, pwaIcon192Url, pwaIcon512Url] = await Promise.all([
    uploadIconAsset(input.admin, `${basePath}/favicon.ico`, ico, "image/x-icon"),
    uploadIconAsset(input.admin, `${basePath}/favicon-16x16.png`, png16, "image/png"),
    uploadIconAsset(input.admin, `${basePath}/favicon-32x32.png`, png32, "image/png"),
    uploadIconAsset(input.admin, `${basePath}/favicon-48x48.png`, png48, "image/png"),
    uploadIconAsset(input.admin, `${basePath}/apple-touch-icon.png`, png180, "image/png"),
    uploadIconAsset(input.admin, `${basePath}/android-chrome-192x192.png`, png192, "image/png"),
    uploadIconAsset(input.admin, `${basePath}/android-chrome-512x512.png`, png512, "image/png"),
  ])

  return {
    site_icon_url: input.sourcePublicUrl,
    favicon_ico_url: faviconIcoUrl,
    favicon_16_url: favicon16Url,
    favicon_32_url: favicon32Url,
    favicon_48_url: favicon48Url,
    apple_touch_icon_url: appleTouchIconUrl,
    pwa_icon_192_url: pwaIcon192Url,
    pwa_icon_512_url: pwaIcon512Url,
  }
}
