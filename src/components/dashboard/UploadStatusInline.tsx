"use client"

import React, { useEffect, useState } from "react"
import CameraSheet from "@/components/dashboard/CameraSheet"
import { useUploadStatus } from "@/components/dashboard/UploadStatusProvider"

/** One in-flow host. Queue ownership and transfer lifetime remain in the provider. */
export default function UploadStatusInline() {
  const { inlineStatus, accountId, companyId } = useUploadStatus()
  const scope = JSON.stringify([accountId, companyId])
  const [review, setReview] = useState<{ scope: string; captureId: string } | null>(null)
  useEffect(() => { setReview(null) }, [scope])
  const reviewing = review?.scope === scope ? review : null
  return <>
    {inlineStatus && !reviewing && <aside aria-label="Upload status" className="found-upload-inline" style={{ maxWidth: 760, margin: "0 auto", padding: "8px max(env(safe-area-inset-right, 0px), 20px) 0 max(env(safe-area-inset-left, 0px), 20px)", color: "#c5cbc7" }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px 16px", minHeight: 44, borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 8 }}>
        <div role="status" aria-live="polite" aria-atomic="true" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: "1 1 160px", fontSize: "0.9375rem", lineHeight: 1.45, overflowWrap: "anywhere" }}>
          {inlineStatus.busy && <span aria-hidden="true" className="inline-upload-spinner" />}
          <span>{inlineStatus.text}</span>
        </div>
        {inlineStatus.captureId ? <button type="button" onClick={() => setReview({ scope, captureId: inlineStatus.captureId! })} style={{ minWidth: 44, minHeight: 44, border: 0, background: "transparent", color: "#ededed", fontFamily: "inherit", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer", padding: "8px 0" }}>Review uploads</button>
          : inlineStatus.legacyAttention ? <a href="/photos" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, color: "#ededed", fontSize: "0.9375rem", textDecoration: "none" }}>Check Photos</a> : null}
      </div>
    </aside>}
    {reviewing && <CameraSheet initialReviewCaptureId={reviewing.captureId} onClose={() => setReview(null)} onUploaded={() => { /* Recovered captures publish through the existing upload event. */ }} />}
    <style>{`
      .inline-upload-spinner { display: inline-block; flex-shrink: 0; width: 14px; height: 14px; border: 2px solid #ffffff40; border-top-color: #ddd; border-radius: 50%; animation: inline-upload-spin 1s linear infinite; }
      .found-upload-inline :is(button,a):focus-visible { outline: 2px solid #32D074; outline-offset: 3px; }
      @keyframes inline-upload-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .inline-upload-spinner { animation: none; } }
    `}</style>
  </>
}
