// Upload RC Bicycle logo + client photos to Supabase Storage
// Run from project root: node scripts/upload-rcbicycles.mjs

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"

const SUPABASE_URL = "https://mmctzloztgkbqvofmkou.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const SLUG = "rcbicycles"
const COMPANY_ID = "c3d4e5f6-a7b8-9012-cdef-123456789012"
const BASE = "C:/Users/SuperShawn/iCloudDrive/Documents/BUSINESS/CLIENTS - Boxie/RC Bicycles"
const PRIMARY_COLOR = "#1565C0"
const ACCENT_1 = "#E53935"
const ACCENT_2 = "#0D47A1"

const LOGO = {
  path: `${BASE}/rc-concept-1-logo.png`,
  storagePath: `${SLUG}/logo.png`,
  type: "image/png",
}

// Real client photos — these become stock_images for the site
// mtn-bike goes first — best hero candidate
const PHOTOS = [
  { path: `${BASE}/NEW SITE/images/mtn-bike.jpg`,            name: "mtn-bike.jpg",            desc: "Mountain biker on trail against blue sky" },
  { path: `${BASE}/NEW SITE/images/bike-rider.jpg`,          name: "bike-rider.jpg",           desc: "Racing cyclist in motion — speed and precision" },
  { path: `${BASE}/NEW SITE/images/bikes-on-university.jpg`, name: "bikes-on-university.jpg",  desc: "Cyclists riding on University Avenue, Tucson" },
  { path: `${BASE}/NEW SITE/images/slide bg blue.jpg`,        name: "slide-bg-blue.jpg",        desc: "Bike wheel close-up with blue tones" },
  { path: `${BASE}/NEW SITE/images/slide bg.jpg`,             name: "slide-bg.jpg",             desc: "Bike wheel spokes close-up detail" },
  { path: `${BASE}/NEW SITE/images/bike rentals.jpg`,         name: "bike-rentals.jpg",         desc: "Group of riders at a community bike rental event" },
  { path: `${BASE}/NEW SITE/images/bike tuneup.jpg`,          name: "bike-tuneup.jpg",          desc: "Mechanic performing precision chain repair" },
  { path: `${BASE}/NEW SITE/images/bike accesories.jpg`,      name: "bike-accessories.jpg",     desc: "Cyclist adjusting wheel — accessories and maintenance" },
  { path: `${BASE}/NEW SITE/images/bike bars.jpg`,            name: "bike-bars.jpg",            desc: "Handlebars and cockpit detail" },
  { path: `${BASE}/NEW SITE/images/bike brakes.jpg`,          name: "bike-brakes.jpg",          desc: "Brake system close-up" },
  { path: `${BASE}/NEW SITE/images/bike derailleurs.jpg`,     name: "bike-derailleurs.jpg",     desc: "Derailleur and drivetrain detail" },
  { path: `${BASE}/NEW SITE/images/bike drive train.jpg`,     name: "bike-drivetrain.jpg",      desc: "Full drivetrain — chain, cassette, and gears" },
  { path: `${BASE}/NEW SITE/images/bike headsets.jpg`,        name: "bike-headsets.jpg",        desc: "Headset and fork detail" },
  { path: `${BASE}/NEW SITE/images/bike wheels.jpg`,          name: "bike-wheels.jpg",          desc: "Wheel set — rims and spokes" },
  { path: `${BASE}/NEW SITE/images/bike bottom brackets.jpg`, name: "bike-bottom-brackets.jpg", desc: "Bottom bracket and crank installation" },
]

async function uploadFile(filePath, storagePath, contentType) {
  const file = readFileSync(filePath)
  const { error } = await supabase.storage
    .from("logos")
    .upload(storagePath, file, { contentType, upsert: true })
  if (error) throw new Error(`Upload failed for ${storagePath}: ${error.message}`)
  const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(storagePath)
  return publicUrl
}

async function run() {
  console.log("Uploading RC Bicycle assets...\n")

  // Upload logo
  console.log("Logo...")
  const logoUrl = await uploadFile(LOGO.path, LOGO.storagePath, LOGO.type)
  console.log(`✓ Logo: ${logoUrl}`)

  // Upload all photos
  const photoUrls = []
  for (const photo of PHOTOS) {
    console.log(`Photo: ${photo.name}...`)
    const url = await uploadFile(
      photo.path,
      `${SLUG}/photos/${photo.name}`,
      "image/jpeg"
    )
    photoUrls.push(url)
    console.log(`✓ ${photo.name}`)
  }

  // Update company: logo + colors
  const { error: companyErr } = await supabase
    .from("companies")
    .update({ logo_url: logoUrl, primary_color: PRIMARY_COLOR, accent_color_1: ACCENT_1, accent_color_2: ACCENT_2 })
    .eq("id", COMPANY_ID)
  if (companyErr) throw new Error(`Company update failed: ${companyErr.message}`)

  // Update website_config: stock_images (hero_image_url = null so shuffle drives everything)
  const { error: configErr } = await supabase
    .from("website_config")
    .update({ stock_images: photoUrls, hero_image_url: null })
    .eq("company_id", COMPANY_ID)
  if (configErr) throw new Error(`Config update failed: ${configErr.message}`)

  console.log(`\n✓ All done.`)
  console.log(`✓ Logo uploaded + colors set`)
  console.log(`✓ ${photoUrls.length} real client photos in stock_images pool`)
  console.log(`✓ Visit: https://${SLUG}.foundco.app`)
}

run().catch((err) => { console.error(err.message); process.exit(1) })
