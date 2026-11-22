/** Whitelisted diagnostics only: never accept a capture, error message or ID. */
const operations = ["open", "scope", "initial-write", "capture-read", "capture-update", "budget-read", "budget-write", "lease-claim", "lease-release", "remove"] as const
const categories = ["quota", "unavailable", "blocked", "timeout", "aborted", "conflict", "capacity", "unknown"] as const
const names = ["QuotaExceededError", "InvalidStateError", "NotFoundError", "SecurityError", "AbortError", "UnknownError", "DataCloneError", "TransactionInactiveError", "TimeoutError"] as const
export const MEDIA_STORAGE_DIAGNOSTIC_EVENT = "found:device-storage-diagnostic"
export function sanitizeMediaStorageDiagnostic(value: unknown) {
  try {
    if (!value || typeof value !== "object") return null
    const v = value as Record<string, unknown>
    if (!operations.includes(v.operation as typeof operations[number]) || !categories.includes(v.category as typeof categories[number])
      || !names.includes(v.errorName as typeof names[number]) || typeof v.verifiedOriginal !== "boolean") return null
    return { operation: v.operation as typeof operations[number], category: v.category as typeof categories[number],
      errorName: v.errorName as typeof names[number], verifiedOriginal: v.verifiedOriginal }
  } catch { return null }
}
let reports = 0
const lastReport = new Map<string, number>()
export function reportMediaStorageDiagnostic(value: unknown): void {
  const diagnostic = sanitizeMediaStorageDiagnostic(value)
  if (!diagnostic || typeof window === "undefined" || reports >= 10) return
  const key = JSON.stringify(diagnostic), now = Date.now()
  if (now - (lastReport.get(key) ?? -Infinity) < 5 * 60_000) return
  reports++; lastReport.set(key, now)
  try { window.dispatchEvent(new CustomEvent(MEDIA_STORAGE_DIAGNOSTIC_EVENT, { detail: diagnostic })) }
  catch { /* Diagnostics must never change capture retention or queue outcomes. */ }
}
