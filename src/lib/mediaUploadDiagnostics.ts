/** Recovery telemetry accepts only bounded, non-identifying queue state. */
export const MEDIA_UPLOAD_DIAGNOSTIC_EVENT = "found:upload-recovery-diagnostic"
const reasons = ["capture-backoff", "cycle-cooldown", "context-backoff", "lock-busy", "lease-held", "storage-paused", "authorization", "needs-attention", "browser-offline", "backgrounded"] as const
const categories = ["none", "connection", "timeout", "transient", "auth", "business", "validation", "size", "unknown", "storage", "integrity"] as const
const ownerships = ["none", "own", "other"] as const
export function sanitizeMediaUploadDiagnostic(value: unknown) {
  try {
    if (!value || typeof value !== "object") return null
    const v = value as Record<string, unknown>
    // Read each property once, including when an untrusted object has getters.
    const { reason, attempts, retryInSeconds, category, ownership } = v
    if (!reasons.includes(reason as typeof reasons[number]) || !categories.includes(category as typeof categories[number])
      || !ownerships.includes(ownership as typeof ownerships[number])
      || typeof attempts !== "number" || !Number.isInteger(attempts) || attempts < 0 || attempts > 4
      || typeof retryInSeconds !== "number" || !Number.isInteger(retryInSeconds) || retryInSeconds < 0 || retryInSeconds > 1200) return null
    return { reason: reason as typeof reasons[number], attempts, retryInSeconds,
      category: category as typeof categories[number], ownership: ownership as typeof ownerships[number] }
  } catch { return null }
}
let reports = 0
const lastReport = new Map<string, number>()
export function reportMediaUploadDiagnostic(value: unknown): void {
  try {
    const diagnostic = sanitizeMediaUploadDiagnostic(value)
    if (!diagnostic || typeof window === "undefined" || reports >= 10) return
    const { reason, attempts, category, ownership } = diagnostic
    const key = JSON.stringify({ reason, attempts, category, ownership }), now = Date.now()
    if (now - (lastReport.get(key) ?? -Infinity) < 5 * 60_000) return
    reports++; lastReport.set(key, now)
    window.dispatchEvent(new CustomEvent(MEDIA_UPLOAD_DIAGNOSTIC_EVENT, { detail: diagnostic }))
  } catch { /* Observability must never interrupt recovery or retention. */ }
}
