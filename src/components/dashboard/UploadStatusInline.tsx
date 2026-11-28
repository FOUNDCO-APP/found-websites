"use client"

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import CameraSheet from "@/components/dashboard/CameraSheet"
import { useUploadStatus } from "@/components/dashboard/UploadStatusProvider"
import { TYPE, TEXT_OPACITY } from "@/lib/dashboard/typography"

/** One persistent review owner; only its presentation moves into Home's slot. */
export default function UploadStatusInline() {
  const { inlineStatus, accountId, companyId, homeStatusTarget, cameraPresentationActive } = useUploadStatus()
  const scope = JSON.stringify([accountId, companyId])
  const currentScope = useRef(scope)
  currentScope.current = scope
  const statusId = useId()
  const regionRef = useRef<HTMLElement | null>(null)
  const actionRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null)
  const recoverFocus = useRef(false)
  const [review, setReview] = useState<{ scope: string; captureId: string } | null>(null)
  const [focusedPlacement, setFocusedPlacement] = useState<{ scope: string; target: HTMLElement | null } | null>(null)
  const [acknowledgement, setAcknowledgement] = useState<{ scope: string; status: NonNullable<typeof inlineStatus> } | null>(null)
  useEffect(() => { setReview(null); setFocusedPlacement(null); setAcknowledgement(null); recoverFocus.current = false }, [scope])
  useEffect(() => { if (cameraPresentationActive) { setFocusedPlacement(null); setAcknowledgement(null) } }, [cameraPresentationActive])
  const reviewing = review?.scope === scope ? review : null
  const focused = focusedPlacement?.scope === scope
  const status = cameraPresentationActive ? null : inlineStatus ?? (focused && acknowledgement?.scope === scope ? acknowledgement.status : null)
  const proposedTarget = status?.priority === "routine" && homeStatusTarget?.isConnected ? homeStatusTarget : null
  // Keep a keyboard/VoiceOver target stationary while the owner is using it.
  // The state updates immediately; placement follows its priority after blur.
  const target = focused && (!focusedPlacement.target || focusedPlacement.target.isConnected) ? focusedPlacement.target : proposedTarget
  useEffect(() => {
    if (focused && inlineStatus?.completed) setAcknowledgement({ scope, status: inlineStatus })
    else if (!focused) setAcknowledgement(null)
  }, [focused, inlineStatus, scope])
  const captureAction = useCallback((element: HTMLButtonElement | HTMLAnchorElement | null) => {
    if (!element && actionRef.current === document.activeElement) recoverFocus.current = true
    actionRef.current = element
  }, [])
  useLayoutEffect(() => {
    if (recoverFocus.current && regionRef.current && !reviewing) {
      recoverFocus.current = false
      const destination = actionRef.current ?? regionRef.current
      destination.focus({ preventScroll: true })
    }
  })
  const openReview = () => {
    if (!status?.captureId) return
    setFocusedPlacement(null)
    setAcknowledgement(null)
    setReview({ scope, captureId: status.captureId })
  }
  const closeReview = () => {
    const closingScope = scope
    setReview(null)
    requestAnimationFrame(() => {
      if (currentScope.current !== closingScope) return
      let destination: HTMLElement | null = actionRef.current ?? regionRef.current
      if (!destination) {
        // The last upload can finish while review is open. Return to the page
        // heading rather than a removed trigger or an unannounced document body.
        destination = document.querySelector<HTMLElement>("main h1, main [role='heading'], main")
        if (destination && !destination.hasAttribute("tabindex")) {
          const heading = destination
          heading.setAttribute("tabindex", "-1")
          heading.addEventListener("blur", () => heading.removeAttribute("tabindex"), { once: true })
        }
      }
      destination?.focus({ preventScroll: true })
    })
  }
  const content = status && <>
    {status.busy && <span aria-hidden="true" className="inline-upload-spinner" />}
    <span id={statusId} role="status" aria-live="polite" aria-atomic="true" className="found-upload-text">{status.text}</span>
  </>
  const chevron = <svg aria-hidden="true" className="found-upload-chevron" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
  const row = status && !reviewing && <aside ref={regionRef} tabIndex={-1} aria-label="Upload status" data-upload-priority={status.priority} className="found-upload-inline"
    onFocusCapture={() => setFocusedPlacement(previous => previous?.scope === scope ? previous : { scope, target })}
    onBlurCapture={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) { setFocusedPlacement(null); setAcknowledgement(null) } }}
    style={{ width: "100%", boxSizing: "border-box", maxWidth: 760, margin: "0 auto", padding: target?.dataset.uploadStatusInset === "none" ? "8px 0 0" : "8px max(env(safe-area-inset-right, 0px), 20px) 0 max(env(safe-area-inset-left, 0px), 20px)", color: status.priority === "attention" ? "#fff" : `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
    {status.captureId ? <button ref={captureAction} type="button" aria-label="Review uploads" aria-describedby={statusId} className="found-upload-row" onClick={openReview}>{content}{chevron}</button>
      : status.legacyAttention ? <a ref={captureAction} href="/photos" aria-label="Check Photos" aria-describedby={statusId} className="found-upload-row">{content}{chevron}</a>
        : <div className="found-upload-row">{content}</div>}
  </aside>
  return <>
    {row && (target ? createPortal(row, target) : row)}
    {reviewing && <CameraSheet initialReviewCaptureId={reviewing.captureId} onClose={closeReview} onUploaded={() => { /* Existing upload events retain cloud-confirmed publication. */ }} />}
    <style>{`
      .found-upload-row { box-sizing: border-box; display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px; margin: 0; padding: 10px 0; border: 0; background: transparent; color: inherit; font-family: inherit; font-size: ${TYPE.subhead.fontSize}; font-weight: 400; line-height: ${TYPE.subhead.lineHeight}; text-align: left; text-decoration: none; }
      button.found-upload-row, a.found-upload-row { cursor: pointer; }
      .found-upload-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
      .found-upload-chevron { flex-shrink: 0; opacity: .65; }
      .inline-upload-spinner { display: inline-block; flex-shrink: 0; width: 14px; height: 14px; border: 2px solid #ffffff40; border-top-color: #ddd; border-radius: 50%; animation: inline-upload-spin 1s linear infinite; }
      .found-upload-inline:focus-visible, .found-upload-inline :is(button,a):focus-visible { outline: 2px solid #32D074; outline-offset: 3px; }
      @keyframes inline-upload-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .inline-upload-spinner { animation: none; } }
    `}</style>
  </>
}
