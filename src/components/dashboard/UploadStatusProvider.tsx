"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { GREEN, TYPE } from "@/lib/dashboard/typography"

type Kind = "photo" | "video" | "item"
type Operation = { id: string; kind: Kind; state: "pending" | "added" | "unconfirmed"; startedAt: number; attempt: number; legacy?: boolean; onRetry?: () => void; onReview?: () => void }
type OperationOptions = Pick<Operation, "id" | "kind" | "onRetry" | "onReview">
type UploadStatusContextValue = {
  companyId: string | null
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

// Counts are completed items, not bytes. Retrying replaces only that operation.
export default function UploadStatusProvider({ children, companyId = null }: { children: React.ReactNode; companyId?: string | null }) {
  const [operations, setOperations] = useState<Operation[]>([])
  const [hidden, setHidden] = useState(false)
  const [now, setNow] = useState(Date.now())
  const sequence = useRef(0)
  const start = useCallback((count: number, kind: Kind = "item") => {
    const added: Operation[] = Array.from({ length: Math.max(0, count) }, () => ({ id: `legacy-${++sequence.current}`, kind, state: "pending", legacy: true, startedAt: Date.now(), attempt: 0 }))
    if (!added.length) return
    setHidden(false)
    setOperations(previous => [...(previous.every(op => op.state === "added") ? [] : previous), ...added])
  }, [])
  const complete = useCallback((success: boolean, _errorMessage?: string) => {
    setOperations(previous => {
      const index = previous.findIndex(op => op.legacy && op.state === "pending")
      return previous.map((op, i) => i === index ? { ...op, state: success ? "added" : "unconfirmed" } : op)
    })
  }, [])
  const beginOperation = useCallback((options: OperationOptions) => {
    const attempt = ++sequence.current
    setHidden(false)
    setOperations(previous => [...(previous.every(op => op.state === "added") ? [] : previous).filter(op => op.id !== options.id), { ...options, state: "pending", startedAt: Date.now(), attempt }])
    return (success: boolean, _errorMessage?: string) => setOperations(previous => previous.map(op => op.id === options.id && op.attempt === attempt ? { ...op, state: success ? "added" : "unconfirmed" } : op))
  }, [])
  const detachOperation = useCallback((id: string) => {
    setOperations(previous => previous.map(op => op.id === id ? { ...op, onRetry: undefined, onReview: undefined } : op))
  }, [])
  const pending = operations.filter(op => op.state === "pending")
  const failed = operations.filter(op => op.state === "unconfirmed")
  const added = operations.filter(op => op.state === "added").length
  useEffect(() => {
    if (!pending.length) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [pending.length])
  useEffect(() => {
    if (!operations.length || pending.length || failed.length) return
    const timer = setTimeout(() => setOperations([]), 2600)
    return () => clearTimeout(timer)
  }, [operations, pending.length, failed.length])
  const dismiss = useCallback(() => setHidden(true), [])
  const kind = operations.length === 1 ? operations[0].kind : "item"
  const slow = pending.some(op => now - op.startedAt >= 15000)
  const headline = pending.length
    ? operations.length === 1 ? `Uploading ${kind}…` : `Uploading ${operations.length} items · ${added} added`
    : failed.length ? `${added ? `${added} added · ` : ""}${failed.length} upload${failed.length === 1 ? "" : "s"} not confirmed`
    : operations.length === 1 ? `${kind === "video" ? "Video" : kind === "photo" ? "Photo" : "Item"} added` : `${added} items added`
  const actionStyle: React.CSSProperties = { ...TYPE.subhead, minHeight: 44, padding: "8px 12px", borderRadius: 12, border: "1px solid #56605a", background: "#202622", color: "white", cursor: "pointer" }
  return <UploadStatusContext.Provider value={{ companyId, start, complete, dismiss, beginOperation, detachOperation }}>
    {children}
    {!!operations.length && <aside aria-label="Upload status" style={{ position: "fixed", top: operations.some(op => op.onReview) ? "calc(env(safe-area-inset-top, 0px) + 76px)" : "max(env(safe-area-inset-top, 0px), 14px)", left: "50%", transform: "translateX(-50%)", zIndex: 500, width: "min(92vw, 420px)", maxHeight: "70dvh", overflowY: "auto", padding: hidden ? 8 : 16, borderRadius: 20, background: "rgba(10,12,11,0.97)", border: `1px solid ${failed.length ? "#FF6B5A" : GREEN}`, color: "white", boxShadow: "0 12px 30px #0006" }}>
      <div role="status" aria-live="polite" aria-atomic="true" style={TYPE.headline}>{headline}</div>
      {hidden ? <button style={actionStyle} onClick={() => setHidden(false)}>Show upload status</button> : <>
        {slow && <p style={TYPE.subhead}>Still uploading. Keep Found open until it finishes.</p>}
        {!!failed.length && <p style={TYPE.subhead}>We couldn’t confirm these uploads. Check your connection.{failed.some(op => op.onRetry) ? " Retry items before closing this camera. Refreshing or closing Found can lose items not yet added." : " Check Photos before choosing the files again."}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {failed.filter(op => op.onRetry).map(op => <button key={op.id} style={actionStyle} onClick={op.onRetry}>Retry {op.kind}</button>)}
          {failed.some(op => op.onReview) && <button style={actionStyle} onClick={failed.find(op => op.onReview)?.onReview}>Review uploads</button>}
          <button style={actionStyle} onClick={dismiss}>{pending.length ? "Hide status" : "Dismiss"}</button>
        </div>
      </>}
    </aside>}
  </UploadStatusContext.Provider>
}
