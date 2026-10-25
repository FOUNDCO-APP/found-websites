"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Maximize2, RotateCw, X } from "lucide-react"

export default function HomepageHighlightImage({ src, companyName }: { src: string; companyName: string }) {
  const alt = `${companyName} highlighted image`
  const [open, setOpen] = useState(false)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [viewerFailed, setViewerFailed] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open || !dialog.current) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : trigger.current
    const previousOverflow = document.body.style.overflow
    const modal = dialog.current
    // The portal is a direct body child; keep the underlying site out of the focus/accessibility tree.
    const background = Array.from(document.body.children).filter(element => element !== modal)
    const previousInert = background.map(element => [element, element.hasAttribute("inert")] as const)
    background.forEach(element => element.setAttribute("inert", ""))
    document.body.style.overflow = "hidden"
    closeButton.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
      }
      if (event.key !== "Tab") return
      const targets = Array.from(modal.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]'))
      const first = targets[0]
      const last = targets[targets.length - 1]
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown, true)
    return () => {
      document.removeEventListener("keydown", onKeyDown, true)
      document.body.style.overflow = previousOverflow
      previousInert.forEach(([element, wasInert]) => { if (!wasInert) element.removeAttribute("inert") })
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  function imageError(retry: () => void) {
    return <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-white">
      <p role="status" className="text-sm">This image could not load.</p>
      <div className="flex items-center gap-4">
        <a href={src} target="_blank" rel="noopener noreferrer" className="text-sm underline focus-visible:outline-2 focus-visible:outline-white">Open original image</a>
        <button type="button" onClick={retry} aria-label="Retry image" title="Retry image"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
          <RotateCw size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  }

  return <>
    <section className="px-4 py-10 md:px-8 md:py-16" style={{ backgroundColor: "#0b0d0c" }} aria-label="Highlighted image">
      <div className="mx-auto max-w-[640px]" style={{ height: "min(80svh, 900px, calc((100vw - 2rem) * 1.5))" }}>
        {failedSrc === src ? imageError(() => setFailedSrc(null)) : <button ref={trigger} type="button" onClick={() => { setViewerFailed(false); setOpen(true) }} aria-label="View full size"
          aria-haspopup="dialog" aria-expanded={open} title="View full size"
          className="relative mx-auto block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          <img src={src} alt={alt} className="block h-full w-full object-contain" loading="lazy" decoding="async" onError={() => setFailedSrc(src)} />
          <span aria-hidden="true" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/75 text-white">
            <Maximize2 size={20} aria-hidden="true" />
          </span>
        </button>}
      </div>
    </section>
    {open && createPortal(
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="fixed inset-0 z-[10000] flex flex-col bg-black/95"
        onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}>
        <h2 id={titleId} className="sr-only">{alt} - full size</h2>
        <div className="flex shrink-0 justify-end px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
          <button ref={closeButton} type="button" onClick={() => setOpen(false)} aria-label="Close image" title="Close image"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div tabIndex={0} role="region" aria-label="Full-size image, scroll to explore"
          className="min-h-0 flex-1 overflow-auto overscroll-contain pb-[env(safe-area-inset-bottom)] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-white"
          onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}>
          <div className="min-h-full min-w-full w-max p-4"
            onClick={event => { if (event.target === event.currentTarget) setOpen(false) }}>
            {viewerFailed ? imageError(() => { closeButton.current?.focus(); setViewerFailed(false) }) : <img src={src} alt={alt} className="mx-auto block h-auto w-auto max-w-none" decoding="async" onError={() => setViewerFailed(true)} />}
          </div>
        </div>
      </div>, document.body
    )}
  </>
}
