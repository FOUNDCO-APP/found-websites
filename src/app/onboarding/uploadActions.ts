"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const BUCKET = "company-assets"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function ensureBucket(supabase: ReturnType<typeof getAdminClient>) {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 20 * 1024 * 1024,
  })
  if (error && !error.message.toLowerCase().includes("already exists")) {
    console.error("[upload] bucket create error:", error.message)
  }
}

// Returns the most visually dominant non-white/non-black/non-gray color as hex.
// Returns null for SVG (can't decode without rendering) or if no color found.
async function extractDominantColor(bytes: ArrayBuffer, mimeType: string): Promise<string | null> {
  if (mimeType === "image/svg+xml") return null
  try {
    const sharp = (await import("sharp")).default
    const { data } = await sharp(Buffer.from(bytes))
      .resize(40, 40, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const counts: Record<string, number> = {}
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      if (r > 220 && g > 220 && b > 220) continue // skip near-white
      if (r < 35  && g < 35  && b < 35)  continue // skip near-black
      if (Math.max(r, g, b) - Math.min(r, g, b) < 30) continue // skip grays
      // Quantize to 32-step buckets to merge similar shades
      const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`
      counts[key] = (counts[key] ?? 0) + 1
    }

    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (!top) return null
    const [r, g, b] = top[0].split(",").map(Number)
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
  } catch {
    return null
  }
}

export async function uploadLogoFile(
  formData: FormData,
  sessionId: string,
  variant: "primary" | "light" = "primary",
): Promise<{ success: boolean; url?: string; dominantColor?: string; error?: string }> {
  const file = formData.get("file") as File | null
  if (!file || !file.size) return { success: false, error: "No file selected." }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png"
  const allowed = ["png", "jpg", "jpeg", "webp", "svg", "gif"]
  if (!allowed.includes(ext)) return { success: false, error: "PNG, JPG, WEBP, or SVG only." }
  if (file.size > 5 * 1024 * 1024) return { success: false, error: "File must be under 5 MB." }

  const supabase = getAdminClient()
  await ensureBucket(supabase)

  const path = variant === "light"
    ? `logos/${sessionId}/logo-light.${ext}`
    : `logos/${sessionId}/logo.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) {
    console.error("[upload] logo error:", error.message)
    return { success: false, error: "Upload failed — please try again." }
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const dominantColor = await extractDominantColor(bytes, file.type)

  return { success: true, url: publicUrl, dominantColor: dominantColor ?? undefined }
}

export async function uploadHeroFile(
  formData: FormData,
  sessionId: string,
  index = 0,
): Promise<{ success: boolean; url?: string; error?: string }> {
  const file = formData.get("file") as File | null
  if (!file || !file.size) return { success: false, error: "No file selected." }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const allowed = ["jpg", "jpeg", "png", "webp", "heic"]
  if (!allowed.includes(ext)) return { success: false, error: "JPG, PNG, or WEBP only." }
  if (file.size > 20 * 1024 * 1024) return { success: false, error: "File must be under 20 MB." }

  const supabase = getAdminClient()
  await ensureBucket(supabase)

  const path = `hero/${sessionId}/hero-${index + 1}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) {
    console.error("[upload] hero error:", error.message)
    return { success: false, error: "Upload failed — please try again." }
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { success: true, url: publicUrl }
}
