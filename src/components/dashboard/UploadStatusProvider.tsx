"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { getDeviceUploadQueue, type DeviceCapture } from "@/lib/deviceUploadQueue"
import { reportMediaStorageDiagnostic } from "@/lib/mediaStorageDiagnostics"
import { reportMediaUploadDiagnostic } from "@/lib/mediaUploadDiagnostics"

export function getUploadAttentionLabel(category?: string): string {
  if (category === "integrity") return "Couldn’t read this capture."
  if (category === "auth") return "Sign in to finish uploading."
  if (category === "size") return "File too large to upload."
  if (category === "business") return "Return to the original business."
  return "Upload needs attention"
}

// Only translate the queue's known safe messages; never echo transport text.
export function getQueueErrorLabel(error: string | null): string | null {
  if (!error) return null
  if (error === "Sign in to finish uploading.") return "Sign in to finish uploading."
  if (error === "Return to the original account and business to finish uploading.") return "Return to the original business."
  if (error === "Upload paused.") return error
  if (error === "Uploads paused. Device storage needs attention.") return "Upload paused."
  // A queue open/read/update failure does not establish loss of a capture.
  // Only its verified localSaved flag can justify original-loss guidance.
  if (error.startsWith("Device storage") || error.startsWith("Couldn’t save")) return "Upload paused."
  if (error === "Waiting for a connection") return "Waiting to upload."
  return "Upload needs attention"
}

type Kind = "photo" | "video" | "item"
type Operation = { id: string; scope: string; kind: Kind; state: "pending" | "added" | "unconfirmed"; startedAt: number; finishedAt?: number; attempt: number; legacy?: boolean; local?: boolean; onRetry?: () => void; onReview?: () => void }
type OperationOptions = Pick<Operation, "id" | "kind" | "local" | "onRetry" | "onReview">
type UploadStatusContextValue = {
  accountId: string | null
  companyId: string | null
  deviceQueue: ReturnType<typeof getDeviceUploadQueue> | null
  queueRows: DeviceCapture[]
  queueReady: boolean
  queueError: string | null
  inlineStatus: { text: string; busy: boolean; captureId?: string; legacyAttention: boolean; priority: "routine" | "attention"; completed: boolean } | null
  homeStatusTarget: HTMLElement | null
  cameraPresentationActive: boolean
  registerHomeStatusTarget: (element: HTMLElement | null) => void
  registerCameraPresentation: () => () => void
  start: (count: number, kind?: Kind) => void
  complete: (success: boolean, errorMessage?: string) => void
  dismiss: () => void
  beginOperation: (options: OperationOptions) => (success: boolean, errorMessage?: string) => void
  detachOperation: (id: string) => void
}
const UploadStatusContext = createContext<UploadStatusContextValue | null>(null)
export function useUploadStatus() {
  const ctx = useContext(UploadStatusContext)
  if (!ctx) throw new Error("useUploadStatus must be used within UploadStatusProvider")
  return ctx
}

// Counts describe confirmed items, never transferred bytes. Camera renders its
// own local operations; legacy navigation/library callers keep this shared status.
export default function UploadStatusProvider({ children, companyId = null, accountId = null }: { children: React.ReactNode; companyId?: string | null; accountId?: string | null }) {
  const [queueBinding, setQueueBinding] = useState<{ scope: string; controller: ReturnType<typeof getDeviceUploadQueue>; rows: DeviceCapture[]; ready: boolean; error: string | null } | null>(null)
  const [cameraCount, setCameraCount] = useState(0)
  // Presentation destination only. Queue ownership stays in this shared provider
  // while the Home slot mounts/unmounts during navigation.
  const [homeStatusTarget, setHomeStatusTarget] = useState<HTMLElement | null>(null)
  const registerHomeStatusTarget = useCallback((element: HTMLElement | null) => setHomeStatusTarget(element), [])
  const savedAcknowledgements = useRef(new Map<string, number>())
  const [queueSuccess, setQueueSuccess] = useState<{ scope: string; until: number } | null>(null)
  const cameraCountRef = useRef(0)
  const scope = JSON.stringify([accountId, companyId])
  const currentScope = useRef(scope)
  currentScope.current = scope
  const binding = queueBinding?.scope === scope ? queueBinding : null
  const deviceQueue = binding?.controller ?? null
  const queueRows = binding?.rows ?? []
  const queueReady = binding?.ready ?? false
  const queueError = binding?.error ?? null
  const registerCameraPresentation = useCallback(() => {
    cameraCountRef.current++
    setCameraCount(cameraCountRef.current)
    let registered = true
    return () => {
      if (!registered) return
      registered = false
      cameraCountRef.current = Math.max(0, cameraCountRef.current - 1)
      setCameraCount(cameraCountRef.current)
    }
  }, [])
  useEffect(() => {
    if (!accountId || !companyId) { setQueueBinding(null); return }
    const endpoint = window.location.pathname.startsWith("/dashboard") ? "/dashboard/api/photos" : "/api/photos"
    const controller = getDeviceUploadQueue({ accountId, companyId, endpoint })
    let alive = true
    const reportRecovery = () => {
      try {
        // The queue getter enforces authorization, mounted state and pending work.
        reportMediaUploadDiagnostic(controller.recoveryDiagnostic)
      } catch { /* A diagnostic getter/observer cannot interrupt queue updates. */ }
    }
    const notified = new Set<string>()
    const observed = new Set<string>()
    const pendingSeen = new Set<string>()
    const unsubscribe = controller.subscribe(rows => {
      if (!alive || currentScope.current !== scope) return
      const scoped = rows.filter(row => row.accountId === accountId && row.companyId === companyId)
      reportMediaStorageDiagnostic(controller.storageDiagnostic)
      reportRecovery()
      for (const row of scoped) {
        if (row.state !== "uploaded") pendingSeen.add(row.id)
        if (row.localSaved && !observed.has(row.id)) {
          observed.add(row.id)
          // Recovered captures are waiting work, not a fresh save celebration.
          if (Date.now() - row.createdAt < 2600) savedAcknowledgements.current.set(`${scope}:${row.id}`, Date.now() + 2600)
        }
      }
      setQueueBinding({ scope, controller, rows: [...scoped], ready: controller.ready, error: controller.error })
      let release = false
      for (const row of scoped) {
        if (row.state !== "uploaded" || !row.photo || notified.has(row.id)) continue
        notified.add(row.id)
        if (!cameraCountRef.current) {
          if (pendingSeen.has(row.id)) setQueueSuccess({ scope, until: Date.now() + 2600 })
          window.dispatchEvent(new CustomEvent("found:photo-uploaded", { detail: { photo: row.photo } }))
          release = true
        }
      }
      if (release) controller.releaseUploaded()
    })
    const stop = controller.start()
    if (alive && currentScope.current === scope) {
      const rows = controller.getSnapshot().filter(row => row.accountId === accountId && row.companyId === companyId)
      reportMediaStorageDiagnostic(controller.storageDiagnostic)
      reportRecovery()
      setQueueBinding({ scope, controller, rows, ready: controller.ready, error: controller.error })
    }
    return () => { alive = false; unsubscribe(); stop() }
  }, [accountId, companyId, scope])
  const [operations, setOperations] = useState<Operation[]>([])
  useEffect(() => { setOperations(previous => previous.filter(op => op.scope === scope)) }, [scope])
  const [now, setNow] = useState(Date.now())
  const sequence = useRef(0)
  const start = useCallback((count: number, kind: Kind = "item") => {
    const added: Operation[] = Array.from({ length: Math.max(0, count) }, () => ({ id: `legacy-${++sequence.current}`, scope, kind, state: "pending", legacy: true, startedAt: Date.now(), attempt: 0 }))
    if (added.length) setOperations(previous => [...previous.filter(op => op.scope === scope && (op.local || op.state !== "added")), ...added])
  }, [scope])
  const complete = useCallback((success: boolean, _errorMessage?: string) => {
    setOperations(previous => {
      const index = previous.findIndex(op => op.scope === scope && op.legacy && op.state === "pending")
      return previous.map((op, i) => i === index ? { ...op, state: success ? "added" : "unconfirmed", finishedAt: Date.now() } : op)
    })
  }, [scope])
  const beginOperation = useCallback((options: OperationOptions) => {
    const attempt = ++sequence.current
    setOperations(previous => [...previous.filter(op => op.scope === scope && op.id !== options.id), { ...options, scope, state: "pending", startedAt: Date.now(), attempt }])
    return (success: boolean, _errorMessage?: string) => setOperations(previous => previous.map(op => op.scope === scope && op.id === options.id && op.attempt === attempt ? { ...op, state: success ? "added" : "unconfirmed", finishedAt: Date.now() } : op))
  }, [scope])
  const detachOperation = useCallback((id: string) => {
    setOperations(previous => previous.filter(op => op.scope !== scope || op.id !== id || !op.local).map(op => op.scope === scope && op.id === id ? { ...op, onRetry: undefined, onReview: undefined } : op))
  }, [scope])
  const dismiss = useCallback(() => setOperations(previous => previous.filter(op => op.scope !== scope || op.local || op.state === "pending")), [scope])
  const visible = operations.filter(op => op.scope === scope && !op.local)
  const pending = visible.filter(op => op.state === "pending")
  const failed = visible.filter(op => op.state === "unconfirmed")
  const added = visible.filter(op => op.state === "added" && (op.finishedAt ?? 0) + 2600 > now)
  const queued = queueRows.filter(row => row.state !== "uploaded")
  // Only presentation deadlines run here. They never mutate or retry queue work.
  const deadlines = [...added.map(op => (op.finishedAt ?? 0) + 2600), ...pending.map(op => op.startedAt + 15000), ...queued.map(row => savedAcknowledgements.current.get(`${scope}:${row.id}`) ?? 0), queueSuccess?.scope === scope ? queueSuccess.until : 0].filter(until => until > now)
  const nextDeadline = deadlines.length ? Math.min(...deadlines) : 0
  useEffect(() => {
    if (!nextDeadline) return
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, nextDeadline - Date.now()) + 1)
    return () => clearTimeout(timer)
  }, [nextDeadline])
  useEffect(() => {
    // Drop presentation-only legacy completions after their acknowledgement.
    setOperations(previous => previous.filter(op => op.state !== "added" || (op.finishedAt ?? 0) + 2600 > now))
  }, [now])
  const attention = queued.filter(row => row.state === "needs_attention" || !row.localSaved)
  const transferring = queued.filter(row => row.state === "uploading")
  const waiting = queued.filter(row => row.localSaved && row.state !== "needs_attention" && row.state !== "uploading")
  const affected = attention[0] ?? queued[0]
  const queueLabel = getQueueErrorLabel(queueError)
  const unreadable = queued.filter(row => row.errorCategory === "integrity")
  const unverified = queued.filter(row => !row.localSaved && row.errorCategory !== "integrity")
  const verified = queued.filter(row => row.localSaved && row.errorCategory !== "integrity")
  const savedPrefix = verified.length === 1 ? "Saved on this device" : `${verified.length} saved on this device`
  const queueBlocked = !!queueError
  let text: string | null = null
  if (queued.length || pending.length || failed.length || queueLabel) {
    if (unverified.length) text = "Couldn’t save on this device. Keep this camera open."
    else if (unreadable.length) text = queued.length === 1 ? "Couldn’t read this capture." : "A capture needs attention."
    else if (queueLabel) text = verified.length ? `${savedPrefix} · ${queueLabel}` : queueLabel
    else if (queued.length === 1 && !pending.length && !failed.length) {
      const row = queued[0]
      if (row.state === "needs_attention") text = `${savedPrefix} · ${row.errorCategory === "storage" ? "Upload paused." : getUploadAttentionLabel(row.errorCategory)}`
      else if (row.state === "uploading") {
        const progress = row.uploadProgress
        const percent = progress && Number.isFinite(progress.bytesUploaded) && Number.isFinite(progress.bytesTotal) && progress.bytesTotal > 0 ? Math.max(0, Math.min(100, Math.floor(progress.bytesUploaded / progress.bytesTotal * 100))) : null
        text = progress?.stage === "finalizing" ? "Finishing upload…" : `Uploading ${row.mimeType.startsWith("video/") ? "video" : "photo"}${percent === null ? "…" : ` · ${percent}%`}`
      } else text = (savedAcknowledgements.current.get(`${scope}:${row.id}`) ?? 0) > now ? "Saved on this device" : "1 waiting to upload"
    } else {
      text = [transferring.length + pending.length ? `${transferring.length + pending.length} uploading` : "", waiting.length ? `${waiting.length} waiting to upload` : "", attention.length + failed.length ? `${attention.length + failed.length} need attention` : ""].filter(Boolean).join(" · ")
    }
  } else if (added.length || (queueSuccess?.scope === scope && queueSuccess.until > now)) text = "Uploaded"
  // File-picker uploads still rely on an open page; their existing guidance stays.
  if (text && !unverified.length && !unreadable.length && !queueBlocked && pending.some(op => now - op.startedAt >= 15000)) text += " · Keep Found open."
  const priority = unverified.length || unreadable.length || attention.length || failed.length || (queueBlocked && queueError !== "Waiting for a connection") ? "attention" as const : "routine" as const
  const inlineStatus = !cameraCount && text ? { text, busy: !queueBlocked && !unverified.length && !unreadable.length && (pending.length > 0 || transferring.length > 0), captureId: affected?.id, legacyAttention: failed.length > 0, priority,
    completed: !queued.length && !pending.length && !failed.length && !queueLabel } : null
  return <UploadStatusContext.Provider value={{ accountId, companyId, deviceQueue, queueRows, queueReady, queueError, inlineStatus, homeStatusTarget, cameraPresentationActive: cameraCount > 0, registerHomeStatusTarget, registerCameraPresentation, start, complete, dismiss, beginOperation, detachOperation }}>
    {children}
  </UploadStatusContext.Provider>
}
