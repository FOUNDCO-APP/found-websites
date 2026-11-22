import { createDashboardUploadSession, readDashboardUploadContext, type DashboardMediaUpload, type MediaUploadProgress } from "@/lib/uploadDashboardMedia"
import type { ResumableMediaResumeInfo } from "@/lib/resumableMediaUpload"

export type DeviceScope = { accountId: string; companyId: string; endpoint?: string }
export type DeviceCapture = {
  id: string; accountId: string; companyId: string; blob: Blob; fileName: string
  albumId: string | null; mimeType: string; createdAt: number; localSaved: boolean
  state: "saved" | "uploading" | "waiting" | "needs_attention" | "uploaded"
  photo?: DashboardMediaUpload; error?: string; errorCategory?: string
  attempts: number; firstAttemptAt: number | null; nextAttemptAt: number
  leaseOwner?: string; leaseUntil?: number
  leaseMode?: "web-lock" | "fallback"
  resumeInfo?: ResumableMediaResumeInfo | null
  uploadProgress?: MediaUploadProgress
}

const DATABASE = "found-device-captures-v1"
const STORE = "captures"
const RUNTIME = "runtime"
const MAX_BYTES = 250 * 1024 * 1024
const MAX_ITEMS = 50
const CYCLE_MS = 15 * 60_000
const RETRY_MS = [5_000, 15_000, 45_000]
const scopeKey = (scope: DeviceScope) => JSON.stringify([scope.accountId, scope.companyId])
const sameScope = (row: DeviceScope, scope: DeviceScope) => row.accountId === scope.accountId && row.companyId === scope.companyId
let database: Promise<IDBDatabase> | null = null

export type DeviceStorageOperation = "open" | "scope" | "initial-write" | "capture-read" | "capture-update" | "budget-read" | "budget-write" | "lease-claim" | "lease-release" | "remove"
export type DeviceStorageDiagnostic = Readonly<{
  operation: DeviceStorageOperation
  category: "quota" | "unavailable" | "blocked" | "timeout" | "aborted" | "conflict" | "capacity" | "unknown"
  errorName: "QuotaExceededError" | "InvalidStateError" | "NotFoundError" | "SecurityError" | "AbortError" | "UnknownError" | "DataCloneError" | "TransactionInactiveError" | "TimeoutError"
  verifiedOriginal: boolean
}>
const STORAGE_PAUSED = "Uploads paused. Device storage needs attention."
const STORAGE_UNSAVED = "Couldn’t save on this device. Keep Found open."
export class DeviceStorageError extends Error {
  readonly capture?: DeviceCapture
  readonly diagnostic: DeviceStorageDiagnostic
  constructor(capture?: DeviceCapture, operation: DeviceStorageOperation = "initial-write", originalError?: unknown,
    category?: DeviceStorageDiagnostic["category"], verifiedOriginal = false) {
    super(operation === "initial-write" || (capture && !capture.localSaved) ? STORAGE_UNSAVED : STORAGE_PAUSED)
    this.name = "DeviceStorageError"
    // Compatibility for capture retention, never enumerable diagnostic payload.
    Object.defineProperty(this, "capture", { value: capture, enumerable: false })
    let name: unknown
    try { name = (originalError as { name?: unknown } | null)?.name } catch { /* Untrusted error shape. */ }
    const allowed = ["QuotaExceededError", "InvalidStateError", "NotFoundError", "SecurityError", "AbortError", "UnknownError", "DataCloneError", "TransactionInactiveError", "TimeoutError"]
    const errorName = (typeof name === "string" && allowed.includes(name) ? name : "UnknownError") as DeviceStorageDiagnostic["errorName"]
    this.diagnostic = Object.freeze({ operation, errorName, verifiedOriginal,
      category: category ?? (errorName === "QuotaExceededError" ? "quota" : errorName === "AbortError" ? "aborted"
        : errorName === "TimeoutError" ? "timeout" : ["InvalidStateError", "NotFoundError", "SecurityError", "TransactionInactiveError"].includes(errorName) ? "unavailable" : "unknown") })
  }
}
async function storageOperation<T>(operation: DeviceStorageOperation, action: () => Promise<T>, verifiedOriginal = false): Promise<T> {
  try { return await action() }
  catch (caught) {
    if (caught instanceof DeviceStorageError) throw caught
    throw new DeviceStorageError(undefined, operation, caught, undefined, verifiedOriginal)
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (database) return database
  database = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new DeviceStorageError(undefined, "open", undefined, "unavailable")); return }
    let finished = false
    const timer = setTimeout(() => { finished = true; reject(new DeviceStorageError(undefined, "open", undefined, "timeout")) }, 8_000)
    let request: IDBOpenDBRequest
    try { request = indexedDB.open(DATABASE, 2) }
    catch (caught) { clearTimeout(timer); reject(new DeviceStorageError(undefined, "open", caught)); return }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        const store = request.result.createObjectStore(STORE, { keyPath: "id" })
        store.createIndex("scope", ["accountId", "companyId"])
      }
      if (!request.result.objectStoreNames.contains(RUNTIME)) request.result.createObjectStore(RUNTIME, { keyPath: "key" })
    }
    request.onerror = () => { clearTimeout(timer); reject(new DeviceStorageError(undefined, "open", request.error)) }
    request.onblocked = () => { clearTimeout(timer); finished = true; reject(new DeviceStorageError(undefined, "open", undefined, "blocked")) }
    request.onsuccess = () => {
      clearTimeout(timer)
      if (finished) { request.result.close(); return }
      const db = request.result
      db.onversionchange = () => { db.close(); database = null }
      resolve(db)
    }
  }).catch(error => { database = null; throw error instanceof DeviceStorageError ? error : new DeviceStorageError(undefined, "open", error) })
  return database
}

function transaction(db: IDBDatabase, mode: IDBTransactionMode, store: string | string[] = STORE) {
  try { return db.transaction(store, mode, { durability: "strict" }) }
  catch { return db.transaction(store, mode) }
}
function transactionError(tx: IDBTransaction, event: Event): unknown {
  // Request errors bubble before tx.error is populated on some engines.
  try { return (event.target as IDBRequest | null)?.error ?? tx.error } catch { return tx.error }
}

async function budget(scope: DeviceScope, value?: { failures: number; notBefore: number }) {
  const operation = value ? "budget-write" : "budget-read"
  return storageOperation(operation, async () => {
  const db = await openDatabase()
  return new Promise<{ failures: number; notBefore: number }>((resolve, reject) => {
    const tx = transaction(db, value ? "readwrite" : "readonly", RUNTIME)
    const store = tx.objectStore(RUNTIME)
    const request = value ? store.put({ key: scopeKey(scope), ...value }) : store.get(scopeKey(scope))
    tx.oncomplete = () => resolve(value ?? request.result ?? { failures: 0, notBefore: 0 })
    tx.onabort = tx.onerror = event => reject(new DeviceStorageError(undefined, operation, transactionError(tx, event)))
  })
  })
}

// Media is immutable binary data. Queue metadata lives separately in the
// existing runtime store: no database upgrade and no Blob-shaped placeholders
// that an older open tab could accidentally upload. Older tabs retain/drain
// their legacy captures, but cannot see captures created by this format.
type CaptureMetadata = Omit<DeviceCapture, "blob" | "photo" | "uploadProgress"> & {
  key: string; format: 1; byteLength: number; digest: string; active: boolean
  legacySource?: boolean
}
type CapturePayload = { key: string; format: 1; accountId: string; companyId: string; id: string; bytes: ArrayBuffer; digest: string }
const META_PREFIX = "found:media:v1:metadata:"
const PAYLOAD_PREFIX = "found:media:v1:payload:"
const mediaKey = (prefix: string, row: DeviceScope & { id: string }) => prefix + JSON.stringify([row.accountId, row.companyId, row.id])
const metadataKey = (row: DeviceScope & { id: string }) => mediaKey(META_PREFIX, row)
const payloadKey = (row: DeviceScope & { id: string }) => mediaKey(PAYLOAD_PREFIX, row)
const metadataRange = () => IDBKeyRange.bound(META_PREFIX, META_PREFIX + "\uffff")
const metadata = (row: DeviceCapture, digest: string, active: boolean): CaptureMetadata => {
  const { blob: _blob, photo: _photo, uploadProgress: _progress, ...values } = row
  return { ...values, key: metadataKey(row), format: 1, byteLength: row.blob.size, digest, active, localSaved: true }
}
function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
function committed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = tx.onerror = event => reject(transactionError(tx, event))
  })
}
async function boundedRead<T>(action: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try { return await Promise.race([action, new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DOMException("Media read timed out", "TimeoutError")), 30_000)
  })]) } finally { clearTimeout(timer) }
}
async function checksum(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), value => value.toString(16).padStart(2, "0")).join("")
}
class UnreadableCaptureError extends Error {
  constructor() { super("Unreadable media"); this.name = "DataCloneError" }
}
async function materialize(blob: Blob) {
  let bytes: ArrayBuffer
  try { bytes = await boundedRead(blob.arrayBuffer()) } catch { throw new UnreadableCaptureError() }
  if (!bytes.byteLength || bytes.byteLength !== blob.size) throw new UnreadableCaptureError()
  return { bytes, digest: await checksum(bytes) }
}
function validIdentity(stored: CaptureMetadata | DeviceCapture, row: DeviceCapture) {
  return sameScope(stored, row) && stored.id === row.id && stored.fileName === row.fileName
    && stored.albumId === row.albumId && stored.mimeType === row.mimeType
    && ("byteLength" in stored ? stored.byteLength : stored.blob.size) === row.blob.size
}
const mutableMetadata = (row: DeviceCapture) => ({ state: row.state, attempts: row.attempts, firstAttemptAt: row.firstAttemptAt,
  nextAttemptAt: row.nextAttemptAt, resumeInfo: row.resumeInfo, error: row.error, errorCategory: row.errorCategory,
  leaseOwner: row.leaseOwner, leaseUntil: row.leaseUntil, leaseMode: row.leaseMode })
async function readPayload(db: IDBDatabase, meta: CaptureMetadata): Promise<Blob> {
  const tx = transaction(db, "readonly", RUNTIME), done = committed(tx)
  const value = await Promise.all([requestValue(tx.objectStore(RUNTIME).get(payloadKey(meta))) as Promise<CapturePayload | undefined>, done]).then(values => values[0])
  if (!value || value.format !== 1 || !sameScope(value, meta) || value.id !== meta.id
    || !(value.bytes instanceof ArrayBuffer) || value.bytes.byteLength !== meta.byteLength
    || value.digest !== meta.digest || await checksum(value.bytes) !== meta.digest) throw new UnreadableCaptureError()
  return new Blob([value.bytes], { type: meta.mimeType })
}
// Prepared payloads survive interruption. Activation and legacy removal are one
// atomic switch, only after full byte readback in a fresh committed transaction.
async function activate(db: IDBDatabase, meta: CaptureMetadata) {
  await readPayload(db, meta)
  const tx = transaction(db, "readwrite", [STORE, RUNTIME]), done = committed(tx)
  const legacy = tx.objectStore(STORE), runtime = tx.objectStore(RUNTIME)
  let activated: CaptureMetadata | undefined
  const check = runtime.get(metadataKey(meta))
  check.onsuccess = () => {
    try {
    const current = check.result as CaptureMetadata | undefined
    if (!current || current.digest !== meta.digest || !sameScope(current, meta)) { tx.abort(); return }
    const old = legacy.get(meta.id)
    old.onsuccess = () => {
      try {
      const row = old.result as DeviceCapture | undefined
      // A concurrently leased legacy capture must remain under its owner.
      if ((current.legacySource && !row) || (row && (!validIdentity(current, row) || (row.leaseUntil ?? 0) > Date.now()))) { tx.abort(); return }
      // An older tab may have advanced retry/resume state while preparation was
      // interrupted. Carry its latest metadata, never reset its durable budget.
      const latest = row ? mutableMetadata(row) : {}
      activated = { ...current, ...latest, active: true }
      runtime.put(activated)
      if (row) legacy.delete(meta.id)
      } catch { tx.abort() }
    }
    } catch { tx.abort() }
  }
  await done
  if (!activated) throw new DOMException("Activation incomplete", "AbortError")
  return activated
}

async function persist(row: DeviceCapture, newCapture = false) {
  const operation = newCapture ? "initial-write" : "capture-update"
  return storageOperation(operation, async () => {
  const db = await openDatabase()
  // Read/materialize before any legacy lease/state rewrite. Never re-store a
  // rendered native Blob; every new payload is detached bytes written once.
  const read = transaction(db, "readonly", RUNTIME), readDone = committed(read)
  const existing = await Promise.all([requestValue(read.objectStore(RUNTIME).get(metadataKey(row))) as Promise<CaptureMetadata | undefined>, readDone]).then(values => values[0])
  const binary = existing ? null : await materialize(row.blob)
  if (existing && !existing.active && existing.digest !== (await materialize(row.blob)).digest)
    throw new DeviceStorageError(undefined, operation, undefined, "conflict", false)
  let prepared: CaptureMetadata | undefined
  let failure: unknown
  const tx = transaction(db, "readwrite", [STORE, RUNTIME]), done = committed(tx)
  const runtime = tx.objectStore(RUNTIME), legacy = tx.objectStore(STORE)
  const request = runtime.get(metadataKey(row))
  request.onsuccess = () => {
    try {
      const current = request.result as CaptureMetadata | undefined
      const oldRequest = legacy.get(row.id)
      oldRequest.onsuccess = () => {
        try {
          const old = oldRequest.result as DeviceCapture | undefined
          const conflictingLease = (value?: CaptureMetadata | DeviceCapture) => value && value.leaseOwner !== row.leaseOwner && (value.leaseUntil ?? 0) > Date.now()
          if ((current && !validIdentity(current, row)) || (old && !validIdentity(old, row)) || conflictingLease(current) || conflictingLease(old)
            || (newCapture && (current?.active || old))) throw new DeviceStorageError(undefined, operation, undefined, "conflict", !newCapture && row.localSaved)
          if (current) {
            const next = { ...metadata(row, current.digest, current.active), legacySource: current.legacySource }
            runtime.put(next)
            if (!current.active) prepared = next
            return
          }
          if (!binary || (!newCapture && !old)) throw new DeviceStorageError(undefined, operation, undefined, "conflict", !newCapture && row.localSaved)
          const write = () => {
            const meta = { ...metadata(row, binary.digest, false), legacySource: !!old }
            runtime.put({ key: payloadKey(row), format: 1, accountId: row.accountId, companyId: row.companyId, id: row.id, bytes: binary.bytes, digest: binary.digest } satisfies CapturePayload)
            runtime.put(meta); prepared = meta
          }
          if (!newCapture) { write(); return }
          const oldRows = legacy.getAll(), newRows = runtime.getAll(metadataRange())
          let legacyRows: DeviceCapture[] | undefined, metas: CaptureMetadata[] | undefined
          const capacity = () => {
            if (!legacyRows || !metas) return
            try {
              const sizes = new Map<string, number>()
              for (const value of legacyRows) sizes.set(value.id, value.blob.size)
              for (const value of metas) sizes.set(value.id, value.byteLength)
              if (sizes.size >= MAX_ITEMS || [...sizes.values()].reduce((sum, size) => sum + size, 0) + row.blob.size > MAX_BYTES)
                throw new DeviceStorageError(undefined, operation, undefined, "capacity")
              write()
            } catch (caught) { failure = caught; tx.abort() }
          }
          oldRows.onsuccess = () => { legacyRows = oldRows.result; capacity() }
          newRows.onsuccess = () => { metas = newRows.result; capacity() }
        } catch (caught) { failure = caught; tx.abort() }
      }
    } catch (caught) { failure = caught; tx.abort() }
  }
  try { await done } catch (caught) { throw failure ?? caught }
  if (prepared) await activate(db, prepared)
  }, !newCapture && row.localSaved)
}

async function list(scope: DeviceScope): Promise<DeviceCapture[]> {
  return storageOperation("capture-read", async () => {
  const db = await openDatabase()
  const tx = transaction(db, "readonly", [STORE, RUNTIME]), done = committed(tx)
  const [legacy, all] = await Promise.all([
    requestValue(tx.objectStore(STORE).index("scope").getAll(IDBKeyRange.only([scope.accountId, scope.companyId]))) as Promise<DeviceCapture[]>,
    requestValue(tx.objectStore(RUNTIME).getAll(metadataRange())) as Promise<CaptureMetadata[]>, done,
  ])
  const rows = new Map<string, DeviceCapture>()
  for (const row of legacy.filter(value => sameScope(value, scope))) {
    try {
      const { bytes } = await materialize(row.blob)
      rows.set(row.id, { ...row, blob: new Blob([bytes], { type: row.mimeType }), localSaved: true })
    } catch (caught) {
      if (!(caught instanceof UnreadableCaptureError)) throw caught
      rows.set(row.id, { ...row, localSaved: false, state: "needs_attention", errorCategory: "integrity", error: "Couldn’t read this capture." })
    }
  }
  for (const meta of all.filter(value => sameScope(value, scope))) {
    const original = rows.get(meta.id)
    const legacyOriginal = legacy.find(value => value.id === meta.id && sameScope(value, scope))
    // A deleted legacy original is not a new capture. Keep its prepared bytes
    // untouched, but never resurrect or automatically upload that orphan.
    if (meta.legacySource && !meta.active && !original) continue
    // Healthy legacy migrations remain owned by the lock holder. A readable
    // prepared backup may rescue unreadable legacy bytes. The same verified
    // atomic switch retires the old representation, preventing an older fallback
    // tab from independently leasing it after the new owner starts uploading.
    if (!meta.active && original && original.errorCategory !== "integrity") continue
    try {
      const blob = await readPayload(db, meta)
      // Preview a verified backup during an older tab's live lease, but never
      // steal that lease by activating under its copied owner identifier.
      const effective = !meta.active
        ? legacyOriginal && (legacyOriginal.leaseUntil ?? 0) > Date.now()
          ? { ...meta, ...mutableMetadata(legacyOriginal) }
          : await activate(db, meta)
        : meta
      const { key: _key, format: _format, digest: _digest, byteLength: _length, active: _active, ...row } = effective
      rows.set(meta.id, { ...row, blob, localSaved: true })
    } catch (caught) {
      if (!(caught instanceof UnreadableCaptureError)) throw caught
      // An active payload is authoritative. Never silently substitute a legacy
      // duplicate after its checksum fails; retain both for explicit recovery.
      if (meta.active || !rows.has(meta.id)) rows.set(meta.id, { ...meta, blob: original?.blob ?? new Blob([], { type: meta.mimeType }), localSaved: false, state: "needs_attention", errorCategory: "integrity", error: "Couldn’t read this capture." })
    }
  }
  return [...rows.values()]
  })
}

async function remove(scope: DeviceScope, id: string) {
  return storageOperation("remove", async () => {
  const db = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const tx = transaction(db, "readwrite", [STORE, RUNTIME]), store = tx.objectStore(STORE), runtime = tx.objectStore(RUNTIME)
    const request = store.get(id)
    request.onsuccess = () => {
      try {
        if (request.result && sameScope(request.result, scope)) store.delete(id)
        runtime.delete(metadataKey({ ...scope, id })); runtime.delete(payloadKey({ ...scope, id }))
      }
      catch (caught) { reject(new DeviceStorageError(undefined, "remove", caught)); tx.abort() }
    }
    tx.oncomplete = () => resolve()
    tx.onabort = tx.onerror = event => reject(new DeviceStorageError(undefined, "remove", transactionError(tx, event)))
  })
  })
}

async function claimLease(scope: DeviceScope, id: string, owner: string, webLockHeld = false) {
  return storageOperation("lease-claim", async () => {
  const db = await openDatabase()
  return new Promise<boolean>((resolve, reject) => {
    const tx = transaction(db, "readwrite", [STORE, RUNTIME]), store = tx.objectStore(STORE), runtime = tx.objectStore(RUNTIME)
    let claimed = false
    const request = runtime.get(metadataKey({ ...scope, id }))
    request.onsuccess = () => {
      try {
        const meta = request.result as CaptureMetadata | undefined
        const available = (value: DeviceCapture | CaptureMetadata) => sameScope(value, scope) && !(value.leaseOwner !== owner && (value.leaseUntil ?? 0) > Date.now())
        const old = store.get(id)
        old.onsuccess = () => {
          try {
            const row = old.result as DeviceCapture | undefined
            if (row && !available(row)) return
            if (meta?.active) {
              // Holding the real Web Lock proves a former Web-Locks owner is
              // gone after reload. Never override an unknown/fallback lease.
              if (!available(meta) && !(webLockHeld && sameScope(meta, scope) && meta.leaseMode === "web-lock")) return
              runtime.put({ ...meta, leaseOwner: owner, leaseUntil: Date.now() + 20 * 60_000, leaseMode: webLockHeld ? "web-lock" : "fallback" }); claimed = true
            } else if (row && available(row)) {
              store.put({ ...row, leaseOwner: owner, leaseUntil: Date.now() + 20 * 60_000 }); claimed = true
            }
          } catch (caught) { reject(new DeviceStorageError(undefined, "lease-claim", caught)); tx.abort() }
        }
      } catch (caught) { reject(new DeviceStorageError(undefined, "lease-claim", caught)); tx.abort() }
    }
    tx.oncomplete = () => resolve(claimed)
    tx.onabort = tx.onerror = event => reject(new DeviceStorageError(undefined, "lease-claim", transactionError(tx, event)))
  })
  })
}

async function releaseLease(scope: DeviceScope, id: string, owner: string) {
  return storageOperation("lease-release", async () => {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = transaction(db, "readwrite", [STORE, RUNTIME]), store = tx.objectStore(STORE), runtime = tx.objectStore(RUNTIME)
    const request = runtime.get(metadataKey({ ...scope, id }))
    request.onsuccess = () => {
      try {
        const meta = request.result as CaptureMetadata | undefined
        if (meta && sameScope(meta, scope) && meta.leaseOwner === owner) runtime.put({ ...meta, leaseOwner: undefined, leaseUntil: undefined, leaseMode: undefined })
        if (meta?.active) return
        const old = store.get(id)
        old.onsuccess = () => {
          try {
            const row = old.result as DeviceCapture | undefined
            if (row && sameScope(row, scope) && row.leaseOwner === owner) store.put({ ...row, leaseOwner: undefined, leaseUntil: undefined })
          } catch (caught) { reject(new DeviceStorageError(undefined, "lease-release", caught)); tx.abort() }
        }
      } catch (caught) { reject(new DeviceStorageError(undefined, "lease-release", caught)); tx.abort() }
    }
    tx.oncomplete = () => resolve()
    tx.onabort = tx.onerror = event => reject(new DeviceStorageError(undefined, "lease-release", transactionError(tx, event)))
  })
  })
}

export type DeviceUploadQueue = ReturnType<typeof createQueue>
const queues = new Map<string, DeviceUploadQueue>()
export function getDeviceUploadQueue(scope: DeviceScope): DeviceUploadQueue {
  if (!scope.accountId || !scope.companyId) throw new DeviceStorageError(undefined, "scope")
  const key = scopeKey(scope)
  let queue = queues.get(key)
  if (!queue) { queue = createQueue(Object.freeze({ ...scope })); queues.set(key, queue) }
  return queue
}

function createQueue(scope: DeviceScope) {
  const cache = new Map<string, DeviceCapture>()
  const progress = new Map<string, MediaUploadProgress>()
  const listeners = new Set<(rows: DeviceCapture[]) => void>()
  const sessions = new Map<string, ReturnType<typeof createDashboardUploadSession>>()
  const activeTransfers = new Set<string>()
  let storageDiagnostic: DeviceStorageDiagnostic | null = null
  const owner = crypto.randomUUID()
  let ready = false, error: string | null = null, starts = 0, generation = 0
  let draining = false, signedOut = false, authorized = true, contextBlocked = false
  let contextFailures = 0, contextNotBefore = 0
  const resumedAttention = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let channel: BroadcastChannel | undefined
  const eligible = () => starts > 0 && !signedOut && !contextBlocked && navigator.onLine !== false && document.visibilityState !== "hidden"
  // Presentation only: an old durable "uploading" state is not a live transfer.
  // Do not rewrite bytes, attempt counters or leases while storage is failing.
  const snapshot = () => authorized ? [...cache.values()].map(row => ({ ...row,
    ...(row.state === "uploading" && !activeTransfers.has(row.id)
      ? { state: "waiting" as const, ...(contextBlocked && storageDiagnostic ? { error: STORAGE_PAUSED } : {}) } : {}),
    uploadProgress: activeTransfers.has(row.id) ? progress.get(row.id) : undefined,
  })).sort((a, b) => b.createdAt - a.createdAt) : []
  const emit = () => {
    const rows = snapshot()
    for (const listener of listeners) { try { listener(rows) } catch { /* Observers cannot change persistence truth or stop other observers. */ } }
  }
  const broadcast = () => { try { channel?.postMessage({ scope: scopeKey(scope) }) } catch { /* Cross-tab notification is optional, never a failed save. */ } }
  const clearTimer = () => { if (timer) clearTimeout(timer); timer = undefined }
  function publishStorageDiagnostic(diagnostic: DeviceStorageDiagnostic) {
    storageDiagnostic = diagnostic
  }
  function storagePaused(caught: DeviceStorageError) {
    const previouslyVerified = caught.diagnostic.verifiedOriginal || [...cache.values()].some(row => row.localSaved && row.state !== "uploaded")
    publishStorageDiagnostic(Object.freeze({ ...caught.diagnostic, verifiedOriginal: previouslyVerified }))
    error = STORAGE_PAUSED
    contextBlocked = true
    clearTimer()
    for (const id of progress.keys()) if (!activeTransfers.has(id)) progress.delete(id)
    emit()
  }
  async function refresh() {
    const refreshGeneration = generation
    const rows = await list(scope), ids = new Set(rows.map(row => row.id))
    if (signedOut || generation !== refreshGeneration) return
    for (const [id, row] of cache) if (row.localSaved && row.state !== "uploaded" && !ids.has(id)) cache.delete(id)
    for (const row of rows) cache.set(row.id, row)
    emit()
  }
  function schedule(delay = 0) {
    clearTimer()
    if (!eligible()) return
    timer = setTimeout(() => { timer = undefined; void pump() }, Math.max(0, delay))
  }
  async function update(row: DeviceCapture, present = true) {
    await persist(row)
    cache.set(row.id, row); if (present) emit(); broadcast()
  }
  async function attempt(row: DeviceCapture, resumeAttention = false) {
    if (!eligible()) return
    const attemptGeneration = generation
    // Another tab may have uploaded/deleted this record while this tab waited.
    const current = (await list(scope)).find(item => item.id === row.id)
    if (!eligible() || generation !== attemptGeneration) return
    if (!current) { cache.delete(row.id); emit(); return }
    row = current
    if (resumeAttention && row.state === "needs_attention" && ["auth", "business"].includes(row.errorCategory ?? "") && !resumedAttention.has(row.id)) {
      resumedAttention.add(row.id)
      row = { ...row, state: "saved", attempts: 0, firstAttemptAt: null, nextAttemptAt: 0, error: undefined }
      await update(row)
      if (!eligible() || generation !== attemptGeneration) return
    }
    const now = Date.now()
    if (row.nextAttemptAt > now || row.state === "needs_attention") return
    if (row.attempts >= 4 || (row.firstAttemptAt && now - row.firstAttemptAt >= CYCLE_MS)) {
      await update({ ...row, state: "waiting", attempts: 0, firstAttemptAt: null, nextAttemptAt: now + CYCLE_MS })
      return
    }
    row = { ...row, state: "uploading", attempts: row.attempts + 1, firstAttemptAt: row.firstAttemptAt ?? now, error: undefined }
    await update(row)
    if (!eligible() || generation !== attemptGeneration) return
    let lastProgress = 0
    let resumeStorageFailure: DeviceStorageError | undefined
    const session = createDashboardUploadSession(row.blob, { uploadId: row.id, accountId: scope.accountId,
      companyId: scope.companyId, endpoint: scope.endpoint, fileName: row.fileName, albumId: row.albumId,
      resumable: true, previousResumeInfo: row.resumeInfo,
      onResumeInfo: async info => {
        // Only persist a new resume identity, never a token or every byte event.
        // This closure belongs to this attempt and its durable lease.
        if (signedOut || generation !== attemptGeneration) throw new DeviceStorageError()
        row = { ...row, resumeInfo: info }
        try { await update(row, false) }
        catch (caught) {
          // The helper intentionally sanitizes callback failures; retain the
          // stage locally so this storage failure cannot become an auth error.
          if (caught instanceof DeviceStorageError) resumeStorageFailure = caught
          throw caught
        }
      },
      onProgress: value => {
        if (signedOut || generation !== attemptGeneration || cache.get(row.id)?.state !== "uploading") return
        progress.set(row.id, value)
        if (value.stage === "finalizing" || Date.now() - lastProgress >= 250) { lastProgress = Date.now(); emit() }
      },
    })
    sessions.set(row.id, session)
    activeTransfers.add(row.id)
    emit()
    try {
      const photo = await session.run()
      progress.delete(row.id)
      // Cloud confirmation precedes local deletion. A failed deletion leaves a
      // reconcilable durable record, never a second cloud upload identity.
      let cleaned = true
      try { await remove(scope, row.id) } catch { cleaned = false }
      if (signedOut || generation !== attemptGeneration) {
        cache.delete(row.id); sessions.delete(row.id); broadcast(); return
      }
      cache.set(row.id, { ...row, state: "uploaded", photo, localSaved: !cleaned, error: undefined, leaseOwner: undefined, leaseUntil: undefined })
      sessions.delete(row.id); emit(); broadcast()
    } catch (caught) {
      progress.delete(row.id)
      if (resumeStorageFailure) throw resumeStorageFailure
      if (caught instanceof DeviceStorageError) throw caught
      const failure = caught as { retryable?: boolean; category?: string; retryAfterMs?: number }
      const retryable = failure?.retryable === true
      const backoff = RETRY_MS[Math.min(row.attempts - 1, RETRY_MS.length - 1)]
      const delay = Math.max(backoff + Math.floor(Math.random() * 1_000), Math.min(failure?.retryAfterMs ?? 0, 60_000))
      await update({ ...row, state: retryable ? "waiting" : "needs_attention", errorCategory: failure?.category ?? "unknown",
        error: retryable ? "Waiting to upload" : "Upload needs attention", nextAttemptAt: Date.now() + delay,
        leaseOwner: row.leaseOwner, leaseUntil: row.leaseUntil }, !signedOut && generation === attemptGeneration)
    } finally {
      activeTransfers.delete(row.id)
      sessions.delete(row.id)
    }
  }
  async function withLock(id: string, action: () => Promise<void>) {
    const lockGeneration = generation
    const leasedAction = async (webLockHeld = false) => {
      // Use the durable protocol even with Web Locks, so an older fallback tab
      // and a newer Web-Locks tab cannot both own the same upload.
      const beforeLease = (await list(scope)).find(row => row.id === id)
      if (!beforeLease || !eligible() || generation !== lockGeneration) return false
      if (beforeLease.leaseOwner !== owner && (beforeLease.leaseUntil ?? 0) > Date.now()
        && !(webLockHeld && beforeLease.leaseMode === "web-lock")) return false
      // Convert readable legacy bytes before a lease write touches its Blob.
      if (beforeLease.localSaved && beforeLease.errorCategory !== "integrity") await persist(beforeLease)
      if (!eligible() || generation !== lockGeneration) return false
      if (!await claimLease(scope, id, owner, webLockHeld)) return false
      try { if (eligible() && generation === lockGeneration) await action() }
      finally { await releaseLease(scope, id, owner) }
      return true
    }
    if (navigator.locks) {
      let acquired = false
      await navigator.locks.request(`found-upload:${id}`, { ifAvailable: true }, async lock => {
        if (!lock || !eligible() || generation !== lockGeneration) return
        acquired = await leasedAction(true)
      })
      return acquired
    }
    // Older browsers: an atomic durable lease spans the request deadlines. A
    // crashed owner expires; modern Web Locks release immediately on tab death.
    return leasedAction()
  }
  async function pump() {
    if (draining || !eligible()) return
    if (contextNotBefore > Date.now()) { schedule(contextNotBefore - Date.now()); return }
    draining = true
    const currentGeneration = generation
    let waitForLock = false
    try {
      const savedBudget = await budget(scope)
      if (!eligible() || generation !== currentGeneration) return
      contextFailures = savedBudget.failures; contextNotBefore = savedBudget.notBefore
      if (contextNotBefore > Date.now()) { schedule(contextNotBefore - Date.now()); return }
      const context = await readDashboardUploadContext(scope.endpoint)
      if (!eligible() || generation !== currentGeneration) return
      if (context.companyId !== scope.companyId || context.accountId !== scope.accountId) {
        authorized = false; contextBlocked = true; error = "Return to the original account and business to finish uploading."; emit(); return
      }
      authorized = true; error = null; storageDiagnostic = null
      if (contextFailures || contextNotBefore) await budget(scope, { failures: 0, notBefore: 0 })
      if (!eligible() || generation !== currentGeneration) return
      contextFailures = 0; contextNotBefore = 0
      await refresh()
      for (const row of snapshot().filter(item => item.localSaved && item.state !== "uploaded").sort((a, b) => a.createdAt - b.createdAt)) {
        if (!eligible() || generation !== currentGeneration) break
        // Reopening after a successful sign-in or returning to the original
        // business may resolve an auth pause. Recheck it once per mount only.
        const resumeAttention = row.state === "needs_attention" && ["auth", "business"].includes(row.errorCategory ?? "") && !resumedAttention.has(row.id)
        if (row.state === "needs_attention" && !resumeAttention) continue
        if (row.nextAttemptAt > Date.now() && !resumeAttention) continue
        if (!await withLock(row.id, () => attempt(row, resumeAttention))) waitForLock = true
      }
    } catch (caught) {
      if (signedOut || generation !== currentGeneration) return
      if (caught instanceof DeviceStorageError) { storagePaused(caught); return }
      const failure = caught as { retryable?: boolean }
      error = failure?.retryable ? "Waiting for a connection" : "Sign in to finish uploading."
      if (!failure?.retryable) contextBlocked = true
      emit()
      if (failure?.retryable && eligible()) {
        const delay = contextFailures < RETRY_MS.length ? RETRY_MS[contextFailures++] : CYCLE_MS
        contextNotBefore = Date.now() + delay
        try { await budget(scope, { failures: contextFailures, notBefore: contextNotBefore }) }
        catch (caught) {
          storagePaused(caught instanceof DeviceStorageError ? caught : new DeviceStorageError(undefined, "budget-write", caught))
        }
        schedule(delay)
      }
    } finally {
      draining = false
      if (eligible() && !timer) {
        const pending = snapshot().filter(row => row.localSaved && row.state !== "uploaded" && row.state !== "needs_attention")
        if (pending.length) schedule(waitForLock ? 5_000 : Math.max(1_000, Math.min(...pending.map(row => row.nextAttemptAt)) - Date.now()))
      }
    }
  }
  const wake = () => { if (eligible()) schedule() }
  const pause = () => { clearTimer() }
  const signingOut = () => {
    signedOut = true; authorized = false; generation++; pause()
    storageDiagnostic = null
    for (const session of sessions.values()) session.cancel?.()
    progress.clear(); emit()
  }
  return {
    get ready() { return ready }, get error() { return error },
    get storageDiagnostic() { return authorized && !signedOut ? storageDiagnostic : null }, getSnapshot: snapshot,
    subscribe(listener: (rows: DeviceCapture[]) => void) {
      listeners.add(listener)
      try { listener(snapshot()) } catch { /* Keep the subscription without failing queue setup. */ }
      return () => { listeners.delete(listener) }
    },
    start() {
      starts++
      if (starts === 1) {
        signedOut = false; contextBlocked = false; authorized = true; resumedAttention.clear(); generation++
        window.addEventListener("online", wake); window.addEventListener("offline", pause)
        document.addEventListener("visibilitychange", wake); window.addEventListener("found:signing-out", signingOut)
        if (typeof BroadcastChannel !== "undefined") {
          channel = new BroadcastChannel("found-device-captures-v1")
          channel.onmessage = event => {
            if (event.data?.scope !== scopeKey(scope)) return
            const refreshGeneration = generation
            void refresh().then(wake).catch(caught => {
              if (!signedOut && generation === refreshGeneration && caught instanceof DeviceStorageError) storagePaused(caught)
            })
          }
        }
        const startGeneration = generation
        void refresh().catch(caught => {
          if (!signedOut && generation === startGeneration && caught instanceof DeviceStorageError) storagePaused(caught)
        }).finally(() => { if (generation === startGeneration) { ready = true; emit(); wake() } })
        // Best effort only; a browser may deny persistence without a prompt.
        // Safari/Chromium decide silently; Firefox can prompt, so don't add a
        // storage-permission decision to every dashboard visit there.
        if (!/Firefox\//.test(navigator.userAgent)) void navigator.storage?.persist?.().catch(() => false)
      }
      let stopped = false
      return () => {
        if (stopped) return; stopped = true; starts--
        if (starts) return
        generation++; pause(); channel?.close(); channel = undefined
        storageDiagnostic = null
        for (const session of sessions.values()) session.cancel?.()
        progress.clear()
        window.removeEventListener("online", wake); window.removeEventListener("offline", pause)
        document.removeEventListener("visibilitychange", wake); window.removeEventListener("found:signing-out", signingOut)
      }
    },
    async enqueue(blob: Blob, options: { fileName: string; albumId?: string | null; id?: string }) {
      const row: DeviceCapture = { id: options.id ?? crypto.randomUUID(), accountId: scope.accountId, companyId: scope.companyId,
        blob, fileName: options.fileName, mimeType: blob.type, albumId: options.albumId ?? null, createdAt: Date.now(),
        localSaved: true, state: "saved", attempts: 0, firstAttemptAt: null, nextAttemptAt: 0 }
      try {
        await persist(row, true)
      } catch (caught) {
        const failed: DeviceCapture = { ...row, localSaved: false, state: "needs_attention", error: "Couldn’t save on this device. Keep Found open.", errorCategory: "storage" }
        const failure = caught instanceof DeviceStorageError ? caught : new DeviceStorageError(undefined, "initial-write", caught)
        publishStorageDiagnostic(Object.freeze({ ...failure.diagnostic, verifiedOriginal: false }))
        cache.set(row.id, failed); emit()
        throw new DeviceStorageError(failed, failure.diagnostic.operation, { name: failure.diagnostic.errorName }, failure.diagnostic.category, false)
      }
      // Only persistence failure can classify an original as unsaved.
      cache.set(row.id, row); emit(); broadcast(); wake()
      return row
    },
    async retry(id: string) {
      const row = cache.get(id)
      if (!row || row.state === "uploaded" || row.errorCategory === "integrity") return
      contextBlocked = false
      if (!row.localSaved) {
        const next: DeviceCapture = { ...row, state: "saved", attempts: 0, firstAttemptAt: null, nextAttemptAt: 0, localSaved: true, error: undefined }
        await persist(next, true); cache.set(id, next); emit(); broadcast(); wake(); return
      }
      await withLock(id, async () => {
        const current = (await list(scope)).find(item => item.id === id)
        if (!current) { cache.delete(id); emit(); return }
        const next: DeviceCapture = { ...current, state: "saved", attempts: 0, firstAttemptAt: null, nextAttemptAt: 0, error: undefined }
        await update(next)
      })
      wake()
    },
    async discard(id: string) {
      const row = cache.get(id)
      if (!row || row.state === "uploading") return
      await withLock(id, async () => {
        await remove(scope, id); cache.delete(id); sessions.delete(id); emit(); broadcast()
      })
    },
    releaseUploaded() { for (const [id, row] of cache) if (row.state === "uploaded") cache.delete(id); emit() },
  }
}
