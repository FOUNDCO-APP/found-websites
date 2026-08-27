import sharp from "sharp"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { SiteIconAssetUrls } from "@/lib/siteIconAssets"

const ICON_BUCKET = "company-assets"

type UploadClient = Pick<SupabaseClient, "storage">

function icoFromPngs(entries: { size: number; png: Buffer }[]) {
  const directorySize = 6 + entries.length * 16
  const header = Buffer.alloc(directorySize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)

  let offset = directorySize
  entries.forEach((entry, index) => {
    const row = 6 + index * 16
    header.writeUInt8(entry.size >= 256 ? 0 : entry.size, row)
    header.writeUInt8(entry.size >= 256 ? 0 : entry.size, row + 1)
    header.writeUInt8(0, row + 2)
    header.writeUInt8(0, row + 3)
    header.writeUInt16LE(1, row + 4)
    header.writeUInt16LE(32, row + 6)
    header.writeUInt32LE(entry.png.length, row + 8)
    header.writeUInt32LE(offset, row + 12)
    offset += entry.png.length
  })

  return Buffer.concat([header, ...entries.map(entry => entry.png)])
}

async function squarePng(source: Buffer, size: number) {
  return sharp(source, { failOn: "none" })
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer()
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
  const png16 = await squarePng(input.source, 16)
  const png32 = await squarePng(input.source, 32)
  const png48 = await squarePng(input.source, 48)
  const png180 = await squarePng(input.source, 180)
  const png192 = await squarePng(input.source, 192)
  const png512 = await squarePng(input.source, 512)
  const ico = icoFromPngs([
    { size: 16, png: png16 },
    { size: 32, png: png32 },
    { size: 48, png: png48 },
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
