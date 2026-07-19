import { isVideoMedia } from "@/lib/mediaKind"
import { createClient } from "@/lib/supabase/client"

export type DashboardMediaUpload = {
  id: string
  url: string
  storage_path: string
  for_website: boolean
  for_social: boolean
  website_section: string | null
  album_id: string | null
  created_at: string
  media_type?: "photo" | "video"
  mime_type?: string | null
}

export async function uploadDashboardMedia(file: File | Blob, options?: { fileName?: string; albumId?: string | null; endpoint?: string }) {
  const endpoint = options?.endpoint ?? "/api/photos"
  const fileName = options?.fileName ?? (file instanceof File ? file.name : "media")
  const mimeType = file.type || "application/octet-stream"
  const albumId = options?.albumId ?? null

  if (!isVideoMedia(fileName, mimeType)) {
    const form = new FormData()
    form.append("file", file, fileName)
    if (albumId) form.append("album_id", albumId)
    const res = await fetch(endpoint, { method: "POST", body: form })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.photo) throw new Error(data.error || "Upload failed")
    return data.photo as DashboardMediaUpload
  }

  const intentRes = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent: "signed-upload", file_name: fileName, content_type: mimeType, album_id: albumId }),
  })
  const intent = await intentRes.json().catch(() => ({}))
  if (!intentRes.ok || !intent.path || !intent.token || !intent.bucket || !intent.publicUrl) {
    throw new Error(intent.error || "Video upload could not start")
  }

  const supabase = createClient()
  const { error: uploadError } = await supabase.storage
    .from(intent.bucket)
    .uploadToSignedUrl(intent.path, intent.token, file)
  if (uploadError) throw new Error(uploadError.message)

  const completeRes = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storage_path: intent.path, url: intent.publicUrl, mime_type: mimeType, album_id: albumId }),
  })
  const complete = await completeRes.json().catch(() => ({}))
  if (!completeRes.ok || !complete.photo) throw new Error(complete.error || "Video saved to storage but could not be added to Photos")

  return complete.photo as DashboardMediaUpload
}
