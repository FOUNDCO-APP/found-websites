// Creates an all-white transparent-bg version of the RC Bicycle logo
// then uploads both versions and updates the DB
// Run: node scripts/create-white-logo-rc.mjs

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import sharp from "sharp"

const SUPABASE_URL = "https://mmctzloztgkbqvofmkou.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const COMPANY_ID = "c3d4e5f6-a7b8-9012-cdef-123456789012"
const SLUG = "rcbicycles"
const LOGO_PATH = "C:/Users/SuperShawn/iCloudDrive/Documents/BUSINESS/CLIENTS - Boxie/RC Bicycles/NEW SITE/images/logo_v1.png"

async function createWhiteLogo(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = Buffer.from(data)

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
    if (r > 230 && g > 230 && b > 230) {
      // Near-white → transparent (background removal)
      pixels[i + 3] = 0
    } else {
      // All colored pixels → solid white
      pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255; pixels[i + 3] = 255
    }
  }

  return sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer()
}

async function upload(buffer, path, type = "image/png") {
  const { error } = await supabase.storage
    .from("logos")
    .upload(path, buffer, { contentType: type, upsert: true })
  if (error) throw new Error(`Upload failed ${path}: ${error.message}`)
  return supabase.storage.from("logos").getPublicUrl(path).data.publicUrl
}

async function run() {
  console.log("Reading logo_v1.png...")
  const logoBuffer = readFileSync(LOGO_PATH)

  console.log("Uploading primary logo (logo_v1.png)...")
  const logoUrl = await upload(logoBuffer, `${SLUG}/logo.png`)
  console.log(`✓ Primary logo: ${logoUrl}`)

  console.log("Creating white version...")
  const whiteBuffer = await createWhiteLogo(logoBuffer)

  console.log("Uploading white logo...")
  const whiteUrl = await upload(whiteBuffer, `${SLUG}/logo-white.png`)
  console.log(`✓ White logo: ${whiteUrl}`)

  const { error } = await supabase
    .from("companies")
    .update({ logo_url: logoUrl, logo_white_url: whiteUrl })
    .eq("id", COMPANY_ID)
  if (error) throw new Error(`DB update failed: ${error.message}`)

  console.log("\n✓ Both logos saved to DB.")
  console.log(`✓ Visit: https://${SLUG}.foundco.app`)
}

run().catch(e => { console.error(e.message); process.exit(1) })
