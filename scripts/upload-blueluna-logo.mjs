// Upload Blue Luna Events logo to Supabase Storage + update DB
// Run from project root: node scripts/upload-blueluna-logo.mjs

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"

// Reads from .env.local — SUPABASE_SERVICE_ROLE_KEY must be set
const SUPABASE_URL = "https://mmctzloztgkbqvofmkou.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const LOGO_PATH = "C:/Users/SuperShawn/iCloudDrive/Documents/BUSINESS/BLUE LUNA EVENTS/LOGOS/Logo.png"
const SLUG = "blueluna"
const PRIMARY_COLOR = "#6ECECE"   // Tiffany blue matched from actual logo
const ACCENT_1 = "#B8E8E8"        // light tint
const ACCENT_2 = "#2A9D9D"        // deeper shade

async function run() {
  console.log("Reading logo file...")
  const file = readFileSync(LOGO_PATH)

  console.log("Uploading to Supabase Storage...")
  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(`${SLUG}/logo.png`, file, { contentType: "image/png", upsert: true })

  if (uploadError) {
    console.error("Upload failed:", uploadError.message)
    process.exit(1)
  }

  const { data: { publicUrl } } = supabase.storage
    .from("logos")
    .getPublicUrl(`${SLUG}/logo.png`)

  console.log("Logo URL:", publicUrl)

  const { error: dbError } = await supabase
    .from("companies")
    .update({
      logo_url: publicUrl,
      primary_color: PRIMARY_COLOR,
      accent_color_1: ACCENT_1,
      accent_color_2: ACCENT_2,
    })
    .eq("slug", SLUG)

  if (dbError) {
    console.error("DB update failed:", dbError.message)
    process.exit(1)
  }

  console.log("✓ Logo uploaded and DB updated.")
  console.log(`✓ Primary color set to ${PRIMARY_COLOR}`)
  console.log(`✓ Visit: https://${SLUG}.foundco.app`)
}

run()
