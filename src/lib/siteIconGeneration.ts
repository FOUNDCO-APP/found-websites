import sharp from "sharp"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { SiteIconAssetUrls } from "@/lib/siteIconAssets"

const ICON_BUCKET = "company-assets"

type UploadClient = Pick<SupabaseClient, "storage">

function icoFromPng(png: Buffer) {
  const header = Buffer.alloc(22)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  header.writeUInt8(32, 6)
  header.writeUInt8(32, 7)
  header.writeUInt8(0, 8)
  header.writeUInt8(0, 9)
  header.writeUInt16LE(1, 10)
  header.writeUInt16LE(32, 12)
  header.writeUInt32LE(png.length, 14)
  header.writeUInt32LE(22, 18)
  return Buffer.concat([header, png])
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
  const png32 = await squarePng(input.source, 32)
  const png180 = await squarePng(input.source, 180)
  const png192 = await squarePng(input.source, 192)
  const png512 = await squarePng(input.source, 512)
  const ico = icoFromPng(png32)

  const [faviconIcoUrl, favicon32Url, appleTouchIconUrl, pwaIcon192Url, pwaIcon512Url] = await Promise.all([
    uploadIconAsset(input.admin, `${basePath}/favicon.ico`, ico, "image/x-icon"),
    uploadIconAsset(input.admin, `${basePath}/favicon-32x32.png`, png32, "image/png"),
    uploadIconAsset(input.admin, `${basePath}/apple-touch-icon.png`, png180, "image/png"),
    uploadIconAsset(input.admin, `${basePath}/icon-192.png`, png192, "image/png"),
    uploadIconAsset(input.admin, `${basePath}/icon-512.png`, png512, "image/png"),
  ])

  return {
    site_icon_url: input.sourcePublicUrl,
    favicon_ico_url: faviconIcoUrl,
    favicon_32_url: favicon32Url,
    apple_touch_icon_url: appleTouchIconUrl,
    pwa_icon_192_url: pwaIcon192Url,
    pwa_icon_512_url: pwaIcon512Url,
  }
}
