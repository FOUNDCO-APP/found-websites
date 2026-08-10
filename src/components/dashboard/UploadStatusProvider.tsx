"use client"

import React, { createContext, useCallback, useContext, useRef, useState } from "react"
import { GREEN as SIGNAL_GREEN, TYPE } from "@/lib/dashboard/typography"

type UploadBatch = {
  total: number
  done: number
  failed: number
  settledAt: number | null
}

type UploadStatusContextValue = {
  start: (count: number) => void
  complete: (success: boolean) => void
  dismiss: () => void
}

const UploadStatusContext = createContext<UploadStatusContextValue | null>(null)

// One shared upload-status banner for the whole dashboard - camera capture,
// job/album library upload, and the global nav upload all report into this
// same system instead of each screen building its own indicator. Team
// direction 2026-08-10: big and impossible to miss, but not a full-screen
// block; stays up until done; never silently drops a failure.
export function useUploadStatus() {
  const ctx = useContext(UploadStatusContext)
  if (!ctx) throw new Error("useUploadStatus must be used within UploadStatusProvider")
  return ctx
}

const AUTO_DISMISS_MS = 2600

export default function UploadStatusProvider({ children }: { children: React.ReactNode }) {
  const [batch, setBatch] = useState<UploadBatch | null>(null)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback((count: number) => {
    if (count <= 0) return
    if (dismissTimer.current) { clearTimeout(dismissTimer.current); dismissTimer.current = null }
    setBatch(prev => {
      // A batch already mid-flight (not yet fully settled) extends rather
      // than getting clobbered by a second upload started elsewhere.
      if (prev && prev.done + prev.failed < prev.total) {
        return { ...prev, total: prev.total + count }
      }
      return { total: count, done: 0, failed: 0, settledAt: null }
    })
  }, [])

  const complete = useCallback((success: boolean) => {
    setBatch(prev => {
      if (!prev) return prev
      const next: UploadBatch = {
        ...prev,
        done: prev.done + (success ? 1 : 0),
        failed: prev.failed + (success ? 0 : 1),
      }
      const finished = next.done + next.failed >= next.total
      next.settledAt = finished ? Date.now() : null
      // Only auto-dismiss a fully clean success - a batch with any failure
      // stays on screen until someone actively dismisses it.
      if (finished && next.failed === 0) {
        if (dismissTimer.current) clearTimeout(dismissTimer.current)
        dismissTimer.current = setTimeout(() => setBatch(null), AUTO_DISMISS_MS)
      }
      return next
    })
  }, [])

  const dismiss = useCallback(() => {
    if (dismissTimer.current) { clearTimeout(dismissTimer.current); dismissTimer.current = null }
    setBatch(null)
  }, [])

  return (
    <UploadStatusContext.Provider value={{ start, complete, dismiss }}>
      {children}
      <UploadStatusBanner batch={batch} onDismiss={dismiss} />
    </UploadStatusContext.Provider>
  )
}

function UploadStatusBanner({ batch, onDismiss }: { batch: UploadBatch | null; onDismiss: () => void }) {
  if (!batch) return null
  const finished = batch.done + batch.failed >= batch.total
  const hasFailure = finished && batch.failed > 0
  const succeeded = finished && !hasFailure

  const accent = hasFailure ? "#FF6B5A" : SIGNAL_GREEN
  const pct = Math.min(100, Math.round(((batch.done + batch.failed) / batch.total) * 100))

  let headline: string
  let subline: string | null = null
  if (succeeded) {
    headline = batch.total === 1 ? "Photo added" : `${batch.total} photos added`
  } else if (hasFailure) {
    const okCount = batch.done
    headline = okCount > 0
      ? `${batch.failed} of ${batch.total} couldn't upload`
      : batch.total === 1 ? "Upload failed" : `All ${batch.total} uploads failed`
    subline = okCount > 0
      ? "The rest are saved. Check your connection and try the others again."
      : "Check your connection and try again."
  } else {
    headline = batch.total === 1 ? "Uploading photo..." : `Uploading ${batch.done + batch.failed + 1} of ${batch.total}...`
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "max(env(safe-area-inset-top, 0px), 14px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 500,
        width: "min(92vw, 420px)",
        borderRadius: 20,
        padding: "16px 18px",
        backgroundColor: "rgba(10,12,11,0.94)",
        border: `1px solid ${accent}44`,
        boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        animation: "uploadBannerIn 0.22s cubic-bezier(0.2,0.8,0.2,1) both",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          {finished ? (
            succeeded ? (
              <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: `${accent}22`, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            ) : (
              <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: `${accent}22`, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="3" height="12" viewBox="0 0 4 16" fill={accent}><rect width="4" height="10" rx="2"/><rect y="13" width="4" height="3" rx="1.5"/></svg>
              </div>
            )
          ) : (
            <div style={{ width: 26, height: 26, borderRadius: "50%", border: `3px solid ${accent}35`, borderTopColor: accent, animation: "spin 0.7s linear infinite" }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...TYPE.headline, fontSize: "1.0625rem", fontWeight: 800, color: "white", lineHeight: 1.25 }}>
            {headline}
          </div>
          {subline && (
            <div style={{ ...TYPE.footnote, color: "rgba(255,255,255,0.6)", marginTop: 4, lineHeight: 1.4 }}>
              {subline}
            </div>
          )}
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            flexShrink: 0, width: 26, height: 26, borderRadius: "50%",
            border: "none", backgroundColor: "rgba(255,255,255,0.08)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      {!finished && (
        <div style={{ marginTop: 12, height: 5, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, backgroundColor: accent, borderRadius: 100, transition: "width 0.25s ease" }} />
        </div>
      )}
      <style>{`
        @keyframes uploadBannerIn { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
