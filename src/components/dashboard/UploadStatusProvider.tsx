"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { getDeviceUploadQueue, type DeviceCapture } from "@/lib/deviceUploadQueue"
import { TYPE } from "@/lib/dashboard/typography"

export function getUploadAttentionLabel(category?: string): string {
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
  if (error.startsWith("Device storage") || error.startsWith("Couldn’t save")) return "Couldn’t save. Keep Found open."
  if (error === "Waiting for a connection") return "Waiting to upload."
  return "Upload needs attention"
}

type Kind = "photo" | "video" | "item"
type Operation = { id: string; kind: Kind; state: "pending" | "added" | "unconfirmed"; startedAt: number; attempt: number; legacy?: boolean; local?: boolean; onRetry?: () => void; onReview?: () => void }
type OperationOptions = Pick<Operation, "id" | "kind" | "local" | "onRetry" | "onReview">
type UploadStatusContextValue = {
  accountId: string | null
  companyId: string | null
  deviceQueue: ReturnType<typeof getDeviceUploadQueue> | null
  queueRows: DeviceCapture[]
  queueReady: boolean
  queueError: string | null
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
  const cameraCountRef = useRef(0)
  const scope = JSON.stringify([accountId, companyId])
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
    const notified = new Set<string>()
    const unsubscribe = controller.subscribe(rows => {
      if (!alive) return
      const scoped = rows.filter(row => row.accountId === accountId && row.companyId === companyId)
      setQueueBinding({ scope, controller, rows: [...scoped], ready: controller.ready, error: controller.error })
      let release = false
      for (const row of scoped) {
        if (row.state !== "uploaded" || !row.photo || notified.has(row.id)) continue
        notified.add(row.id)
        if (!cameraCountRef.current) {
          window.dispatchEvent(new CustomEvent("found:photo-uploaded", { detail: { photo: row.photo } }))
          release = true
        }
      }
      if (release) controller.releaseUploaded()
    })
    const stop = controller.start()
    setQueueBinding({ scope, controller, rows: controller.getSnapshot(), ready: controller.ready, error: controller.error })
    return () => { alive = false; unsubscribe(); stop() }
  }, [accountId, companyId, scope])
  const [operations, setOperations] = useState<Operation[]>([])
  const [now, setNow] = useState(Date.now())
  const sequence = useRef(0)
  const start = useCallback((count: number, kind: Kind = "item") => {
    const added: Operation[] = Array.from({ length: Math.max(0, count) }, () => ({ id: `legacy-${++sequence.current}`, kind, state: "pending", legacy: true, startedAt: Date.now(), attempt: 0 }))
    if (!added.length) return
    setOperations(previous => [...previous.filter(op => op.local || op.state !== "added"), ...added])
  }, [])
  const complete = useCallback((success: boolean, _errorMessage?: string) => {
    setOperations(previous => {
      const index = previous.findIndex(op => op.legacy && op.state === "pending")
      return previous.map((op, i) => i === index ? { ...op, state: success ? "added" : "unconfirmed" } : op)
    })
  }, [])
  const beginOperation = useCallback((options: OperationOptions) => {
    const attempt = ++sequence.current
    setOperations(previous => [...previous.filter(op => op.id !== options.id), { ...options, state: "pending", startedAt: Date.now(), attempt }])
    return (success: boolean, _errorMessage?: string) => setOperations(previous => previous.map(op => op.id === options.id && op.attempt === attempt ? { ...op, state: success ? "added" : "unconfirmed" } : op))
  }, [])
  const detachOperation = useCallback((id: string) => {
    setOperations(previous => previous.filter(op => op.id !== id || !op.local).map(op => op.id === id ? { ...op, onRetry: undefined, onReview: undefined } : op))
  }, [])
  const visible = operations.filter(op => !op.local)
  const pending = visible.filter(op => op.state === "pending")
  const failed = visible.filter(op => op.state === "unconfirmed")
  const added = visible.filter(op => op.state === "added").length
  useEffect(() => {
    if (!pending.length) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [pending.length])
  useEffect(() => {
    if (!visible.length || pending.length || failed.length) return
    const timer = setTimeout(() => setOperations(previous => previous.filter(op => op.local || op.state !== "added")), 2600)
    return () => clearTimeout(timer)
  }, [operations, visible.length, pending.length, failed.length])
  // Retained for existing callers; never removes an active operation.
  const dismiss = useCallback(() => setOperations(previous => previous.filter(op => op.local || op.state === "pending")), [])
  const kind = visible.length === 1 ? visible[0].kind : "item"
  const slow = pending.some(op => now - op.startedAt >= 15000)
  const headline = visible.length === 1
    ? pending.length ? `Uploading ${kind}…` : failed.length ? "Upload not confirmed" : `${kind === "video" ? "Video" : kind === "photo" ? "Photo" : "Item"} added`
    : [pending.length ? `${pending.length} uploading` : "", added ? `${added} added` : "", failed.length ? `${failed.length} not confirmed` : ""].filter(Boolean).join(" · ")
  const queued = cameraCount ? [] : queueRows.filter(row => row.state !== "uploaded")
  const queueHeadline = getQueueErrorLabel(queueError) ?? (queued.length === 1
    ? queued[0].state === "uploading" ? `Uploading ${queued[0].mimeType.startsWith("video/") ? "video" : "photo"}…` : queued[0].state === "needs_attention" ? getUploadAttentionLabel(queued[0].errorCategory) : "Saved on this device"
    : [queued.filter(row => row.state === "uploading").length ? `${queued.filter(row => row.state === "uploading").length} uploading` : "", queued.filter(row => row.state === "saved" || row.state === "waiting").length ? `${queued.filter(row => row.state === "saved" || row.state === "waiting").length} saved on this device` : "", queued.filter(row => row.state === "needs_attention").length ? `${queued.filter(row => row.state === "needs_attention").length} need attention` : ""].filter(Boolean).join(" · "))
  return <UploadStatusContext.Provider value={{ accountId, companyId, deviceQueue, queueRows, queueReady, queueError, registerCameraPresentation, start, complete, dismiss, beginOperation, detachOperation }}>
    {children}
    {(!!visible.length || !!queued.length || (!cameraCount && !!queueError)) && <aside aria-label="Upload status" style={{ position: "fixed", top: "max(env(safe-area-inset-top, 0px), 14px)", left: "50%", transform: "translateX(-50%)", zIndex: 500, width: "max-content", maxWidth: "calc(100vw - 32px)", padding: "10px 14px", borderRadius: 14, background: "rgba(22,25,23,0.94)", color: "#eee", boxShadow: "0 4px 16px #0003" }}>
      <div role="status" aria-live="polite" aria-atomic="true" style={{ ...TYPE.subhead, display: "flex", alignItems: "center", gap: 8 }}>
        {(pending.length > 0 || queued.some(row => row.state === "uploading")) && <span aria-hidden="true" className="shared-upload-spinner" />}
        <span>{visible.length ? headline : queueHeadline}{visible.length > 0 && queued.length > 0 ? ` · ${queueHeadline}` : ""}{slow ? " · Keep Found open." : ""}{failed.length && !pending.length ? " · Check Photos." : ""}</span>
      </div>
      <style>{`
        .shared-upload-spinner { display: inline-block; flex-shrink: 0; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff40; border-top-color: #ddd; animation: shared-upload-spin 1s linear infinite; }
        @keyframes shared-upload-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .shared-upload-spinner { animation: none; } }
      `}</style>
    </aside>}
  </UploadStatusContext.Provider>
}
