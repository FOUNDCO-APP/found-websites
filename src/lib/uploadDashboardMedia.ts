import { isVideoMedia } from "@/lib/mediaKind"
import { createClient } from "@/lib/supabase/client"
import { uploadResumableMedia, ResumableMediaUploadError, type ResumableMediaResumeInfo } from "@/lib/resumableMediaUpload"

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
  fileName?: string; albumId?: string | null; endpoint?: string; uploadId?: string; companyId?: string; accountId?: string
  resumable?: boolean
  previousResumeInfo?: ResumableMediaResumeInfo | null
  onResumeInfo?: (info: ResumableMediaResumeInfo | null) => Promise<void> | void
  onProgress?: (progress: MediaUploadProgress) => void
}
export type MediaUploadProgress = { bytesUploaded: number; bytesTotal: number; stage: "transferring" | "finalizing" }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CONTROL_MS = 60_000
const TRANSFER_MS = 10 * 60_000
export type DashboardUploadErrorCategory = "connection" | "timeout" | "transient" | "auth" | "business" | "validation" | "size" | "unknown"
const MESSAGES: Record<DashboardUploadErrorCategory, string> = {
  connection: "Connection interrupted. We couldn't confirm your upload saved.",
  timeout: "Upload timed out. We couldn't confirm it saved.",
  transient: "The upload service is temporarily unavailable. We couldn't confirm your upload saved.",
  auth: "Sign in to the original account to continue this upload.",
  business: "Return to the original business to continue this upload.",
  validation: "This upload couldn't be completed. Your capture needs attention.",
  size: "This file exceeds the upload limit. Your capture needs attention.",
  unknown: "We couldn't confirm your upload saved. Your capture needs attention.",
}
export class DashboardUploadError extends Error {
  readonly category: DashboardUploadErrorCategory
  readonly retryable: boolean
  readonly retryAfterMs: number
  readonly publicMessage: string
  constructor(category: DashboardUploadErrorCategory, retryAfterMs = 0) {
    super(MESSAGES[category])
    this.name = "DashboardUploadError"
    this.category = category
    this.retryable = ["connection", "timeout", "transient"].includes(category)
    this.retryAfterMs = this.retryable && Number.isFinite(retryAfterMs) ? Math.min(60_000, Math.max(0, retryAfterMs)) : 0
    this.publicMessage = this.message
  }
}
type UploadResponse = {
  company_id?: string; account_id?: string; photo?: DashboardMediaUpload; uploaded?: boolean
  path?: string; publicUrl?: string; signedUrl?: string; Key?: string
  resumableEndpoint?: string; token?: string; bucket?: string
}
const invalidResponse = () => new DashboardUploadError("unknown")
function httpError(status: number, code: unknown, retryAfter: string | null) {
  const seconds = retryAfter == null ? NaN : Number(retryAfter)
  const delay = retryAfter == null ? 0 : Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now()
  if (status === 401 || status === 403) return new DashboardUploadError("auth")
  if (status === 413 || code === "EntityTooLarge" || code === "UPLOAD_TOO_LARGE") return new DashboardUploadError("size")
  if (code === "ACCOUNT_CHANGED" || code === "AUTH_REQUIRED" || code === "InvalidJWT" || code === "AccessDenied") return new DashboardUploadError("auth")
  if (code === "BUSINESS_CHANGED") return new DashboardUploadError("business")
  if (["INVALID_UPLOAD", "UPLOAD_ID_CONFLICT", "ALBUM_UNAVAILABLE", "UNSUPPORTED_FILE_TYPE", "InvalidRequest", "InvalidBucketName", "InvalidKey", "InvalidMimeType", "InvalidUploadId", "NoSuchBucket", "NoSuchKey", "ResourceAlreadyExists", "KeyAlreadyExists"].includes(String(code))) return new DashboardUploadError("validation")
  if (status === 409 && code === "STORAGE_NOT_READY") return new DashboardUploadError("transient", delay)
  if ([400, 404, 409, 422].includes(status)) return new DashboardUploadError("validation")
  if (status === 408) return new DashboardUploadError("timeout", delay)
  if (status === 429 || status >= 500) return new DashboardUploadError("transient", delay)
  return invalidResponse()
}
function photoResult(value: unknown): DashboardMediaUpload {
  if (!value || typeof value !== "object") throw invalidResponse()
  const photo = value as DashboardMediaUpload
  if (![photo.id, photo.url, photo.storage_path].every(field => typeof field === "string" && field.length > 0)) throw invalidResponse()
  if (![photo.for_website, photo.for_social, photo.in_gallery].every(field => typeof field === "boolean")
    || typeof photo.created_at !== "string" || !photo.created_at
    || !(photo.album_id === null || typeof photo.album_id === "string")
    || !(photo.website_section === null || typeof photo.website_section === "string")) throw invalidResponse()
  return photo
}

// The deadline includes reading the response body. Abort the underlying request,
// rather than merely racing a promise and leaving a transfer running unnoticed.
async function request(url: string, init: RequestInit, milliseconds: number, signal?: AbortSignal) {
  if (signal?.aborted) throw new DashboardUploadError("connection")
  const controller = new AbortController()
  let timedOut = false
  const abort = () => controller.abort()
  signal?.addEventListener("abort", abort, { once: true })
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, milliseconds)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const text = await response.text()
    if (controller.signal.aborted) throw new DashboardUploadError(timedOut ? "timeout" : "connection")
    let data: unknown
    try { data = JSON.parse(text) } catch { /* Non-JSON errors still have an HTTP status. */ }
    const object = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : null
    if (!response.ok) throw httpError(response.status, object?.code ?? object?.error, response.headers.get("Retry-After"))
    if (!object) throw invalidResponse()
    return object as UploadResponse
  } catch (error) {
    if (error instanceof DashboardUploadError) throw error
    throw new DashboardUploadError(timedOut ? "timeout" : "connection")
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort) }
}

export async function readDashboardUploadContext(endpoint = "/api/photos"): Promise<{ companyId: string; accountId: string }> {
  const context = await request(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent: "upload-context" }) }, CONTROL_MS)
  if (typeof context.company_id !== "string" || !context.company_id || typeof context.account_id !== "string" || !context.account_id) throw invalidResponse()
  return { companyId: context.company_id, accountId: context.account_id }
}

/** In-memory only. Retain this session to retry the same immutable capture. */
export function createDashboardUploadSession(file: File | Blob, supplied: DashboardUploadOptions = {}) {
  const options = Object.freeze({
    fileName: supplied.fileName ?? (file instanceof File ? file.name : "media"),
    albumId: supplied.albumId ?? null, endpoint: supplied.endpoint ?? "/api/photos",
    uploadId: supplied.uploadId ?? crypto.randomUUID(),
    companyId: supplied.companyId,
    accountId: supplied.accountId,
    resumable: supplied.resumable === true,
  })
  if (!UUID.test(options.uploadId)) throw new DashboardUploadError("validation")
  const mimeType = file.type || "application/octet-stream"
  const metadata = { upload_id: options.uploadId, file_name: options.fileName,
    content_type: mimeType, album_id: options.albumId }
  type Transfer = { path: string; publicUrl: string; signedUrl?: string; uploaded?: boolean }
  let transfer: Transfer | undefined
  let companyId: string | undefined = options.companyId
  let accountId: string | undefined = options.accountId
  let active: Promise<DashboardMediaUpload> | undefined
  let resumeInfo = supplied.previousResumeInfo
  const cancellation = new AbortController()
  const json = async (body: object) => {
    if (cancellation.signal.aborted) throw new DashboardUploadError("connection")
    const result = await request(options.endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, ...(companyId ? { expected_company_id: companyId } : {}),
        ...(accountId ? { expected_account_id: accountId } : {}) }),
    }, CONTROL_MS, cancellation.signal)
    if (cancellation.signal.aborted) throw new DashboardUploadError("connection")
    return result
  }
  async function finish() {
    if (!transfer) throw invalidResponse()
    supplied.onProgress?.({ bytesUploaded: file.size, bytesTotal: file.size, stage: "finalizing" })
    const result = await json({ ...metadata, storage_path: transfer.path, url: transfer.publicUrl, mime_type: mimeType })
    return verifiedPhoto(result.photo)
  }
  function verifiedPhoto(value: unknown) {
    const photo = photoResult(value)
    if (photo.id !== options.uploadId.toLowerCase()) throw invalidResponse()
    return photo
  }
  async function attempt() {
    // Reconcile before every attempt, including after a response was lost. A
    // missing row is not proof the previous transfer failed: inspect storage too.
    const status = await json({ ...metadata, intent: "reconcile-upload" })
    if (typeof status.company_id !== "string" || !status.company_id || typeof status.account_id !== "string" || !status.account_id) throw invalidResponse()
    if (companyId && companyId !== status.company_id) throw new DashboardUploadError("business")
    if (accountId && accountId !== status.account_id) throw new DashboardUploadError("auth")
    companyId = status.company_id
    accountId = status.account_id
    if (status.photo) return verifiedPhoto(status.photo)
    if (typeof status.uploaded !== "boolean") throw invalidResponse()
    if (status.uploaded) {
      if (typeof status.path !== "string" || !status.path || typeof status.publicUrl !== "string" || !status.publicUrl) throw invalidResponse()
      transfer = { path: status.path, publicUrl: status.publicUrl, uploaded: true }
      return finish()
    }
    // Leave room for multipart overhead beneath Vercel's 4.5 MB body limit.
    // TUS chunks go directly to storage; its 6 MiB chunk size is not a minimum.
    const useResumable = options.resumable && (isVideoMedia(options.fileName, mimeType) || file.size >= 4 * 1024 * 1024)
    if (!isVideoMedia(options.fileName, mimeType) && !useResumable) {
      const form = new FormData()
      form.append("file", file, options.fileName)
      form.append("upload_id", options.uploadId)
      form.append("expected_company_id", companyId!)
      form.append("expected_account_id", accountId!)
      if (options.albumId) form.append("album_id", options.albumId)
      const result = await request(options.endpoint, { method: "POST", body: form }, TRANSFER_MS, cancellation.signal)
      return verifiedPhoto(result.photo)
    }
    if (!transfer?.uploaded) {
      // Refresh an expired capability on manual retry, retaining the same path.
      const intent = await json({ ...metadata, intent: useResumable ? "resumable-upload" : "signed-upload" })
      if (intent.photo) return verifiedPhoto(intent.photo)
      if (intent.uploaded !== undefined && typeof intent.uploaded !== "boolean") throw invalidResponse()
      if (typeof intent.path !== "string" || !intent.path || typeof intent.publicUrl !== "string" || !intent.publicUrl
        || (!intent.uploaded && (typeof intent.signedUrl !== "string" || !intent.signedUrl))) throw invalidResponse()
      if (transfer && transfer.path !== intent.path) throw invalidResponse()
      transfer = { path: intent.path, publicUrl: intent.publicUrl, signedUrl: intent.signedUrl, uploaded: intent.uploaded }
      if (!transfer.uploaded) {
        if (useResumable) {
          if (typeof intent.resumableEndpoint !== "string" || typeof intent.token !== "string" || intent.bucket !== "company-assets") throw invalidResponse()
          try {
            await uploadResumableMedia(file, {
              endpoint: intent.resumableEndpoint, objectPath: transfer.path, bucket: intent.bucket,
              token: intent.token, uploadId: options.uploadId, accountId: accountId!, companyId: companyId!,
              apiKey: typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) : undefined,
              previousResumeInfo: resumeInfo,
              signal: cancellation.signal,
              onResumeInfo: async info => { await supplied.onResumeInfo?.(info); resumeInfo = info },
              onProgress: (bytesUploaded, bytesTotal) => supplied.onProgress?.({ bytesUploaded, bytesTotal, stage: "transferring" }),
            })
          } catch (error) {
            if (!(error instanceof ResumableMediaUploadError)) throw invalidResponse()
            if (["expired", "invalid_resume"].includes(error.code)) {
              resumeInfo = null
              await supplied.onResumeInfo?.(null)
              throw new DashboardUploadError("transient")
            }
            if (error.code === "auth") throw new DashboardUploadError("auth")
            if (error.code === "too_large") throw new DashboardUploadError("size")
            if (error.code === "timeout") throw new DashboardUploadError("timeout")
            if (error.code === "network" || error.code === "aborted") throw new DashboardUploadError("connection")
            // A completed transfer can lose its final response or race an old
            // tab. Reconcile on the next bounded queue attempt before new bytes.
            if (error.code === "conflict" || error.retryable) throw new DashboardUploadError("transient")
            throw new DashboardUploadError("validation")
          }
          transfer.uploaded = true
        } else {
          // Preserve the signed PUT contract for existing library callers.
          const body = new FormData()
          body.append("cacheControl", "3600")
          body.append("", file)
          const uploaded = await request(transfer.signedUrl!, { method: "PUT", headers: { "x-upsert": "false" }, body }, TRANSFER_MS, cancellation.signal)
          if (typeof uploaded.Key !== "string" || !uploaded.Key) throw invalidResponse()
          transfer.uploaded = true
        }
      }
    }
    return finish()
  }
  return Object.freeze({ uploadId: options.uploadId, options,
    cancel() { cancellation.abort() },
    run(): Promise<DashboardMediaUpload> {
      if (active) return active
      active = attempt().catch(error => {
        // All provider/API errors are intentionally withheld from owner-facing UI.
        throw error instanceof DashboardUploadError ? error : invalidResponse()
      }).finally(() => { active = undefined })
      return active
    },
  })
}

export function uploadDashboardMedia(file: File | Blob, options?: DashboardUploadOptions): Promise<DashboardMediaUpload> {
  return createDashboardUploadSession(file, options).run()
}
