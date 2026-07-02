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

// Returns the strongest usable brand colors from the logo.
// Skips white/black/gray so white logo variants do not create fake palettes.
async function extractLogoColors(bytes: ArrayBuffer, mimeType: string): Promise<string[]> {
  if (mimeType === "image/svg+xml") return []
  try {
    const sharp = (await import("sharp")).default
    const { data } = await sharp(Buffer.from(bytes))
      .resize(72, 72, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const counts: Record<string, number> = {}
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]
      if (alpha < 40) continue
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      if (r > 220 && g > 220 && b > 220) continue
      if (r < 35 && g < 35 && b < 35) continue
      if (max - min < 28) continue

      const qr = Math.round(r / 24) * 24
      const qg = Math.round(g / 24) * 24
      const qb = Math.round(b / 24) * 24
      const key = `${Math.min(255, qr)},${Math.min(255, qg)},${Math.min(255, qb)}`
      counts[key] = (counts[key] ?? 0) + 1
    }

    const colors: string[] = []
    for (const [key] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      const [r, g, b] = key.split(",").map(Number)
      const tooClose = colors.some((hex) => {
        const existing = hex.match(/\w\w/g)?.map((v) => parseInt(v, 16)) ?? [0, 0, 0]
        return Math.abs(existing[0] - r) + Math.abs(existing[1] - g) + Math.abs(existing[2] - b) < 72
      })
      if (tooClose) continue
      colors.push(`#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`)
      if (colors.length >= 5) break
    }
    return colors
  } catch {
    return []
  }
}

async function createDarkLogoVariant(bytes: ArrayBuffer, mimeType: string): Promise<Buffer | null> {
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
  } catch {
    return null
  }
}
export async function uploadLogoFile(
  formData: FormData,
  sessionId: string,
  variant: "primary" | "light" | "lightBackground" = "primary",
): Promise<{ success: boolean; url?: string; autoDarkUrl?: string; dominantColor?: string; dominantColors?: string[]; error?: string }> {
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
    : variant === "lightBackground"
      ? `logos/${sessionId}/logo-light-background.${ext}`
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

  let autoDarkUrl: string | undefined
  if (variant === "primary") {
    const darkBytes = await createDarkLogoVariant(bytes, file.type)
    if (darkBytes) {
      const darkPath = `logos/${sessionId}/logo-dark.png`
      const { error: darkError } = await supabase.storage
        .from(BUCKET)
        .upload(darkPath, darkBytes, { contentType: "image/png", upsert: true })
      if (!darkError) {
        autoDarkUrl = supabase.storage.from(BUCKET).getPublicUrl(darkPath).data.publicUrl
      }
    }
  }

  const dominantColors = await extractLogoColors(bytes, file.type)
  const dominantColor = dominantColors[0]

  return { success: true, url: publicUrl, autoDarkUrl, dominantColor, dominantColors: dominantColors.length ? dominantColors : undefined }
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
