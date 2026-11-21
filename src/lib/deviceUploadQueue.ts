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
const sameScope = (row: DeviceCapture, scope: DeviceScope) => row.accountId === scope.accountId && row.companyId === scope.companyId
let database: Promise<IDBDatabase> | null = null

export class DeviceStorageError extends Error {
  constructor(public capture?: DeviceCapture) {
    super("Couldn’t save on this device. Keep Found open.")
    this.name = "DeviceStorageError"
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (database) return database
  database = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new DeviceStorageError()); return }
    let finished = false
    const timer = setTimeout(() => { finished = true; reject(new DeviceStorageError()) }, 8_000)
    const request = indexedDB.open(DATABASE, 2)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        const store = request.result.createObjectStore(STORE, { keyPath: "id" })
        store.createIndex("scope", ["accountId", "companyId"])
      }
      if (!request.result.objectStoreNames.contains(RUNTIME)) request.result.createObjectStore(RUNTIME, { keyPath: "key" })
    }
    request.onerror = () => { clearTimeout(timer); reject(new DeviceStorageError()) }
    request.onblocked = () => { clearTimeout(timer); finished = true; reject(new DeviceStorageError()) }
    request.onsuccess = () => {
      clearTimeout(timer)
      if (finished) { request.result.close(); return }
      const db = request.result
      db.onversionchange = () => { db.close(); database = null }
      resolve(db)
    }
  }).catch(error => { database = null; throw error })
  return database
}

function transaction(db: IDBDatabase, mode: IDBTransactionMode, store = STORE) {
  try { return db.transaction(store, mode, { durability: "strict" }) }
  catch { return db.transaction(store, mode) }
}

async function budget(scope: DeviceScope, value?: { failures: number; notBefore: number }) {
  const db = await openDatabase()
  return new Promise<{ failures: number; notBefore: number }>((resolve, reject) => {
    const tx = transaction(db, value ? "readwrite" : "readonly", RUNTIME)
    const store = tx.objectStore(RUNTIME)
    const request = value ? store.put({ key: scopeKey(scope), ...value }) : store.get(scopeKey(scope))
    tx.oncomplete = () => resolve(value ?? request.result ?? { failures: 0, notBefore: 0 })
    tx.onabort = tx.onerror = () => reject(new DeviceStorageError())
  })
}

// Verification occurs inside the transaction; the promise resolves only after
// commit. Quota/abort/blocked failures never become a "saved" claim.
async function persist(row: DeviceCapture, newCapture = false) {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = transaction(db, "readwrite"), store = tx.objectStore(STORE)
    let verified = false
    tx.oncomplete = () => verified ? resolve() : reject(new DeviceStorageError(row))
    tx.onabort = tx.onerror = () => reject(new DeviceStorageError(row))
    const write = () => {
      try {
        const { photo: _photo, ...stored } = row
        const request = store.put({ ...stored, localSaved: true })
        request.onsuccess = () => {
          const check = store.get(row.id)
          check.onsuccess = () => {
            const value = check.result as DeviceCapture | undefined
            verified = !!value && sameScope(value, row) && value.blob instanceof Blob
              && value.blob.size === row.blob.size && value.mimeType === row.mimeType
            if (!verified) tx.abort()
          }
        }
      } catch { tx.abort() }
    }
    const guarded = (existing?: DeviceCapture) => {
      if (existing && existing.leaseOwner !== row.leaseOwner && (existing.leaseUntil ?? 0) > Date.now()) { tx.abort(); return }
      if (existing && (!sameScope(existing, row) || existing.fileName !== row.fileName
        || existing.albumId !== row.albumId || existing.blob.size !== row.blob.size || existing.mimeType !== row.mimeType)) { tx.abort(); return }
      write()
    }
    if (!newCapture) {
      const request = store.get(row.id)
      request.onsuccess = () => { if (!request.result) tx.abort(); else guarded(request.result) }
      return
    }
    const request = store.getAll()
    request.onsuccess = () => {
      const rows = request.result as DeviceCapture[]
      const existing = rows.find(value => value.id === row.id)
      // Enqueue cannot reset an existing attempt/budget or replace its bytes.
      if (existing) { tx.abort(); return }
      const others = rows.filter(value => value.id !== row.id)
      if (others.length >= MAX_ITEMS || others.reduce((sum, value) => sum + value.blob.size, 0) + row.blob.size > MAX_BYTES) { tx.abort(); return }
      guarded(existing)
    }
  })
}

async function list(scope: DeviceScope): Promise<DeviceCapture[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = transaction(db, "readonly")
    const request = tx.objectStore(STORE).index("scope").getAll(IDBKeyRange.only([scope.accountId, scope.companyId]))
    tx.oncomplete = () => resolve((request.result as DeviceCapture[]).filter(row => sameScope(row, scope)))
    tx.onabort = tx.onerror = () => reject(new DeviceStorageError())
  })
}

async function remove(scope: DeviceScope, id: string) {
  const db = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const tx = transaction(db, "readwrite"), store = tx.objectStore(STORE)
    const request = store.get(id)
    request.onsuccess = () => { if (request.result && sameScope(request.result, scope)) store.delete(id) }
    tx.oncomplete = () => resolve()
    tx.onabort = tx.onerror = () => reject(new DeviceStorageError())
  })
}

async function claimLease(scope: DeviceScope, id: string, owner: string) {
  const db = await openDatabase()
  return new Promise<boolean>((resolve, reject) => {
    const tx = transaction(db, "readwrite"), store = tx.objectStore(STORE)
    let claimed = false
    const request = store.get(id)
    request.onsuccess = () => {
      const row = request.result as DeviceCapture | undefined
      if (!row || !sameScope(row, scope) || (row.leaseOwner !== owner && (row.leaseUntil ?? 0) > Date.now())) return
      store.put({ ...row, leaseOwner: owner, leaseUntil: Date.now() + 20 * 60_000 })
      claimed = true
    }
    tx.oncomplete = () => resolve(claimed)
    tx.onabort = tx.onerror = () => reject(new DeviceStorageError())
  })
}

async function releaseLease(scope: DeviceScope, id: string, owner: string) {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = transaction(db, "readwrite"), store = tx.objectStore(STORE)
    const request = store.get(id)
    request.onsuccess = () => {
      const row = request.result as DeviceCapture | undefined
      if (row && sameScope(row, scope) && row.leaseOwner === owner) store.put({ ...row, leaseOwner: undefined, leaseUntil: undefined })
    }
    tx.oncomplete = () => resolve()
    tx.onabort = tx.onerror = () => reject(new DeviceStorageError())
  })
}

export type DeviceUploadQueue = ReturnType<typeof createQueue>
const queues = new Map<string, DeviceUploadQueue>()
export function getDeviceUploadQueue(scope: DeviceScope): DeviceUploadQueue {
  if (!scope.accountId || !scope.companyId) throw new DeviceStorageError()
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
  const owner = crypto.randomUUID()
  let ready = false, error: string | null = null, starts = 0, generation = 0
  let draining = false, signedOut = false, authorized = true, contextBlocked = false
  let contextFailures = 0, contextNotBefore = 0
  const resumedAttention = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let channel: BroadcastChannel | undefined
  const eligible = () => starts > 0 && !signedOut && !contextBlocked && navigator.onLine !== false && document.visibilityState !== "hidden"
  const snapshot = () => authorized ? [...cache.values()].map(row => ({ ...row, uploadProgress: progress.get(row.id) })).sort((a, b) => b.createdAt - a.createdAt) : []
  const emit = () => { const rows = snapshot(); for (const listener of listeners) listener(rows) }
  const broadcast = () => channel?.postMessage({ scope: scopeKey(scope) })
  const clearTimer = () => { if (timer) clearTimeout(timer); timer = undefined }
  async function refresh() {
    const rows = await list(scope), ids = new Set(rows.map(row => row.id))
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
    const session = createDashboardUploadSession(row.blob, { uploadId: row.id, accountId: scope.accountId,
      companyId: scope.companyId, endpoint: scope.endpoint, fileName: row.fileName, albumId: row.albumId,
      resumable: true, previousResumeInfo: row.resumeInfo,
      onResumeInfo: async info => {
        // Only persist a new resume identity, never a token or every byte event.
        // This closure belongs to this attempt and its durable lease.
        if (signedOut || generation !== attemptGeneration) throw new DeviceStorageError()
        row = { ...row, resumeInfo: info }
        await update(row, false)
      },
      onProgress: value => {
        if (signedOut || generation !== attemptGeneration || cache.get(row.id)?.state !== "uploading") return
        progress.set(row.id, value)
        if (value.stage === "finalizing" || Date.now() - lastProgress >= 250) { lastProgress = Date.now(); emit() }
      },
    })
    sessions.set(row.id, session)
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
      const failure = caught as { retryable?: boolean; category?: string; retryAfterMs?: number }
      const retryable = failure?.retryable === true
      const backoff = RETRY_MS[Math.min(row.attempts - 1, RETRY_MS.length - 1)]
      const delay = Math.max(backoff + Math.floor(Math.random() * 1_000), Math.min(failure?.retryAfterMs ?? 0, 60_000))
      await update({ ...row, state: retryable ? "waiting" : "needs_attention", errorCategory: failure?.category ?? "unknown",
        error: retryable ? "Waiting to upload" : "Upload needs attention", nextAttemptAt: Date.now() + delay,
        leaseOwner: row.leaseOwner, leaseUntil: row.leaseUntil }, !signedOut && generation === attemptGeneration)
    }
  }
  async function withLock(id: string, action: () => Promise<void>) {
    const lockGeneration = generation
    if (navigator.locks) {
      let acquired = false
      await navigator.locks.request(`found-upload:${id}`, { ifAvailable: true }, async lock => {
        if (!lock || !eligible() || generation !== lockGeneration) return
        acquired = true; await action()
      })
      return acquired
    }
    // Older browsers: an atomic durable lease spans the request deadlines. A
    // crashed owner expires; modern Web Locks release immediately on tab death.
    if (!await claimLease(scope, id, owner)) return false
    try { if (eligible() && generation === lockGeneration) await action() } finally { await releaseLease(scope, id, owner) }
    return true
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
      authorized = true; error = null
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
      const failure = caught as { retryable?: boolean }
      error = caught instanceof DeviceStorageError ? caught.message : failure?.retryable ? "Waiting for a connection" : "Sign in to finish uploading."
      if (!failure?.retryable) contextBlocked = true
      emit()
      if (failure?.retryable && eligible()) {
        const delay = contextFailures < RETRY_MS.length ? RETRY_MS[contextFailures++] : CYCLE_MS
        contextNotBefore = Date.now() + delay
        try { await budget(scope, { failures: contextFailures, notBefore: contextNotBefore }) }
        catch { contextBlocked = true; error = "Device storage couldn’t update. Keep Found open."; emit() }
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
    for (const session of sessions.values()) session.cancel?.()
    progress.clear(); emit()
  }
  return {
    get ready() { return ready }, get error() { return error }, getSnapshot: snapshot,
    subscribe(listener: (rows: DeviceCapture[]) => void) { listeners.add(listener); listener(snapshot()); return () => { listeners.delete(listener) } },
    start() {
      starts++
      if (starts === 1) {
        signedOut = false; contextBlocked = false; authorized = true; resumedAttention.clear(); generation++
        window.addEventListener("online", wake); window.addEventListener("offline", pause)
        document.addEventListener("visibilitychange", wake); window.addEventListener("found:signing-out", signingOut)
        if (typeof BroadcastChannel !== "undefined") {
          channel = new BroadcastChannel("found-device-captures-v1")
          channel.onmessage = event => { if (event.data?.scope === scopeKey(scope)) { void refresh().then(wake).catch(() => {}) } }
        }
        void refresh().catch(() => { error = "Device storage couldn’t open. Keep Found open for new captures." }).finally(() => { ready = true; emit(); wake() })
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
        cache.set(row.id, row); emit(); broadcast(); wake()
        return row
      } catch {
        const failed: DeviceCapture = { ...row, localSaved: false, state: "needs_attention", error: "Couldn’t save on this device. Keep Found open.", errorCategory: "storage" }
        cache.set(row.id, failed); emit()
        throw new DeviceStorageError(failed)
      }
    },
    async retry(id: string) {
      const row = cache.get(id)
      if (!row || row.state === "uploaded") return
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
