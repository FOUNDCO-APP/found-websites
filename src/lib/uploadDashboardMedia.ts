import { isVideoMedia } from "@/lib/mediaKind"
import { createClient } from "@/lib/supabase/client"

export async function ensureFreshSession() {
  try { await createClient().auth.getSession() } catch { /* Individual uploads report failure. */ }
}

export type DashboardMediaUpload = {
  id: string; url: string; storage_path: string
  for_website: boolean; for_social: boolean; website_section: string | null
  in_gallery: boolean; album_id: string | null; created_at: string
  media_type?: "photo" | "video"; mime_type?: string | null
}

export type DashboardUploadOptions = {
  fileName?: string; albumId?: string | null; endpoint?: string; uploadId?: string; companyId?: string
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CONTROL_MS = 60_000
const TRANSFER_MS = 10 * 60_000
const UNCONFIRMED = "We couldn't confirm your upload saved. Check your connection and try again."
class UploadRequestError extends Error {}
type UploadResponse = {
  company_id?: string; photo?: DashboardMediaUpload; uploaded?: boolean
  path?: string; publicUrl?: string; signedUrl?: string
}

// The deadline includes reading the response body. Abort the underlying request,
// rather than merely racing a promise and leaving a transfer running unnoticed.
async function request(url: string, init: RequestInit, milliseconds: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), milliseconds)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const text = await response.text()
    if (controller.signal.aborted) throw new Error()
    let data: UploadResponse = {}
    try { data = JSON.parse(text) } catch { /* No provider text is user-facing. */ }
    if (!response.ok) throw new Error()
    return data
  } catch {
    throw new UploadRequestError(controller.signal.aborted
      ? "Upload timed out. We couldn't confirm it saved. Check your connection and try again."
      : UNCONFIRMED)
  } finally { clearTimeout(timer) }
}

/** In-memory only. Retain this session to retry the same immutable capture. */
export function createDashboardUploadSession(file: File | Blob, supplied: DashboardUploadOptions = {}) {
  const options = Object.freeze({
    fileName: supplied.fileName ?? (file instanceof File ? file.name : "media"),
    albumId: supplied.albumId ?? null, endpoint: supplied.endpoint ?? "/api/photos",
    uploadId: supplied.uploadId ?? crypto.randomUUID(),
    companyId: supplied.companyId,
  })
  if (!UUID.test(options.uploadId)) throw new Error("This upload couldn't start. Please capture it again.")
  const mimeType = file.type || "application/octet-stream"
  const metadata = { upload_id: options.uploadId, file_name: options.fileName,
    content_type: mimeType, album_id: options.albumId }
  type Transfer = { path: string; publicUrl: string; signedUrl?: string; uploaded?: boolean }
  let transfer: Transfer | undefined
  let companyId: string | undefined = options.companyId
  let active: Promise<DashboardMediaUpload> | undefined
  const json = (body: object) => request(options.endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, ...(companyId ? { expected_company_id: companyId } : {}) }),
  }, CONTROL_MS)
  async function finish() {
    if (!transfer) throw new Error(UNCONFIRMED)
    const result = await json({ ...metadata, storage_path: transfer.path, url: transfer.publicUrl, mime_type: mimeType })
    if (!result.photo) throw new Error(UNCONFIRMED)
    return result.photo as DashboardMediaUpload
  }
  async function attempt() {
    // Reconcile before every attempt, including after a response was lost. A
    // missing row is not proof the previous transfer failed: inspect storage too.
    const status = await json({ ...metadata, intent: "reconcile-upload" })
    if (!status.company_id || (companyId && companyId !== status.company_id)) throw new Error(UNCONFIRMED)
    companyId = status.company_id
    if (status.photo) return status.photo as DashboardMediaUpload
    if (status.uploaded) {
      if (!status.path || !status.publicUrl) throw new Error(UNCONFIRMED)
      transfer = { path: status.path, publicUrl: status.publicUrl, uploaded: true }
      return finish()
    }
    if (!isVideoMedia(options.fileName, mimeType)) {
      const form = new FormData()
      form.append("file", file, options.fileName)
      form.append("upload_id", options.uploadId)
      form.append("expected_company_id", companyId!)
      if (options.albumId) form.append("album_id", options.albumId)
      const result = await request(options.endpoint, { method: "POST", body: form }, TRANSFER_MS)
      if (!result.photo) throw new Error(UNCONFIRMED)
      return result.photo as DashboardMediaUpload
    }
    if (!transfer?.uploaded) {
      // Refresh an expired capability on manual retry, retaining the same path.
      const intent = await json({ ...metadata, intent: "signed-upload" })
      if (intent.photo) return intent.photo as DashboardMediaUpload
      if (!intent.path || !intent.publicUrl || (!intent.uploaded && !intent.signedUrl)) throw new Error(UNCONFIRMED)
      if (transfer && transfer.path !== intent.path) throw new Error(UNCONFIRMED)
      transfer = { path: intent.path, publicUrl: intent.publicUrl, signedUrl: intent.signedUrl, uploaded: intent.uploaded }
      if (!transfer.uploaded) {
        // The installed SDK drops AbortSignal for uploadToSignedUrl. Use its
        // signed PUT/FormData contract directly; no browser auth lock is needed.
        const body = new FormData()
        body.append("cacheControl", "3600")
        body.append("", file)
        await request(transfer.signedUrl!, { method: "PUT", headers: { "x-upsert": "false" }, body }, TRANSFER_MS)
        transfer.uploaded = true
      }
    }
    return finish()
  }
  return Object.freeze({ uploadId: options.uploadId, options,
    run(): Promise<DashboardMediaUpload> {
      if (active) return active
      active = attempt().catch(error => {
        // All provider/API errors are intentionally withheld from owner-facing UI.
        throw error instanceof UploadRequestError ? error : new Error(UNCONFIRMED)
      }).finally(() => { active = undefined })
      return active
    },
  })
}

export function uploadDashboardMedia(file: File | Blob, options?: DashboardUploadOptions): Promise<DashboardMediaUpload> {
  return createDashboardUploadSession(file, options).run()
}
