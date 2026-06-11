// Upload all 10 new industry photo pools to Supabase Storage
// Run from project root:
//   $env:SUPABASE_SERVICE_ROLE_KEY="your-key-here"
//   node scripts/upload-photo-pools.mjs
//
// Or with the key inline:
//   SUPABASE_SERVICE_ROLE_KEY=sk-... node scripts/upload-photo-pools.mjs

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = "https://mmctzloztgkbqvofmkou.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required.")
  console.error("   Set it with: $env:SUPABASE_SERVICE_ROLE_KEY='your-key-here'")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const INDUSTRIES = [
  "creative_services",
  "home_based_food",
  "education",
  "music_performance",
  "professional_services",
  "healthcare",
  "childcare",
  "makers_crafts",
  "home_property",
  "nonprofit",
]

async function uploadPool(industry) {
  const filePath = join(__dirname, "photo-pools", `${industry}.json`)
  const content = readFileSync(filePath, "utf8")
  const json = JSON.parse(content)
  const photoCount = json.photos?.length ?? 0

  const storagePath = `photo-pools/${industry}.json`
  const { error } = await supabase.storage
    .from("config")
    .upload(storagePath, Buffer.from(content), {
      contentType: "application/json",
      upsert: true,
    })

  if (error) {
    console.error(`  ❌ ${industry}: ${error.message}`)
    return false
  }

  const { data: { publicUrl } } = supabase.storage
    .from("config")
    .getPublicUrl(storagePath)

  console.log(`  ✓ ${industry} — ${photoCount} photos → ${publicUrl}`)
  return true
}

async function run() {
  console.log(`\nUploading ${INDUSTRIES.length} industry photo pools...\n`)

  let succeeded = 0
  let failed = 0

  for (const industry of INDUSTRIES) {
    const ok = await uploadPool(industry)
    if (ok) succeeded++
    else failed++
  }

  console.log(`\n${succeeded} uploaded, ${failed} failed.`)
  if (failed === 0) {
    console.log("✅ All photo pools live. New industry sites will pull real photos on next visit.\n")
    console.log("Note: Existing sites with stock_images already cached won't update automatically.")
    console.log("To force refresh a site, clear website_config.stock_images in Supabase.\n")
  }
}

run()
