"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createDarkLogoVariant, createWhiteLogoVariant, removeLightLogoBackground } from "@/lib/logoVariants"
import { extractLogoColors } from "@/lib/logoColors"

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

export async function uploadLogoFile(
  formData: FormData,
  sessionId: string,
  variant: "primary" | "light" | "lightBackground" = "primary",
): Promise<{ success: boolean; url?: string; autoDarkUrl?: string; autoWhiteUrl?: string; dominantColor?: string; dominantColors?: string[]; error?: string }> {
  const file = formData.get("file") as File | null
  if (!file || !file.size) return { success: false, error: "No file selected." }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png"
  const allowed = ["png", "jpg", "jpeg", "webp", "svg", "gif"]
  if (!allowed.includes(ext)) return { success: false, error: "PNG, JPG, WEBP, or SVG only." }
  if (file.size > 5 * 1024 * 1024) return { success: false, error: "File must be under 5 MB." }

  const supabase = getAdminClient()
  await ensureBucket(supabase)

  const originalBytes = await file.arrayBuffer()
  const cleanedBytes = variant === "primary" || variant === "lightBackground"
    ? await removeLightLogoBackground(originalBytes, file.type)
    : null
  const bytes = cleanedBytes ?? Buffer.from(originalBytes)
  const analysisBytes = new Uint8Array(bytes).buffer
  const storedExt = cleanedBytes ? "png" : ext
  const contentType = cleanedBytes ? "image/png" : file.type
  const path = variant === "light"
    ? `logos/${sessionId}/logo-light.${storedExt}`
    : variant === "lightBackground"
      ? `logos/${sessionId}/logo-light-background.${storedExt}`
      : `logos/${sessionId}/logo.${storedExt}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true })

  if (error) {
    console.error("[upload] logo error:", error.message)
    return { success: false, error: "Upload failed — please try again." }
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

  let autoDarkUrl: string | undefined
  let autoWhiteUrl: string | undefined
  if (variant === "primary") {
    const darkBytes = await createDarkLogoVariant(analysisBytes, contentType)
    if (darkBytes) {
      const darkPath = `logos/${sessionId}/logo-dark.png`
      const { error: darkError } = await supabase.storage
        .from(BUCKET)
        .upload(darkPath, darkBytes, { contentType: "image/png", upsert: true })
      if (!darkError) {
        autoDarkUrl = supabase.storage.from(BUCKET).getPublicUrl(darkPath).data.publicUrl
      }
    }

    const whiteBytes = await createWhiteLogoVariant(analysisBytes, contentType)
    if (whiteBytes) {
      const whitePath = `logos/${sessionId}/logo-white-auto.png`
      const { error: whiteError } = await supabase.storage
        .from(BUCKET)
        .upload(whitePath, whiteBytes, { contentType: "image/png", upsert: true })
      if (!whiteError) {
        autoWhiteUrl = supabase.storage.from(BUCKET).getPublicUrl(whitePath).data.publicUrl
      }
    }
  }

  const dominantColors = await extractLogoColors(analysisBytes, contentType)
  const dominantColor = dominantColors[0]

  return { success: true, url: publicUrl, autoDarkUrl, autoWhiteUrl, dominantColor, dominantColors: dominantColors.length ? dominantColors : undefined }
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
