"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import InView from "@/components/InView"

interface GalleryLightboxProps {
  photos: string[]
  companyName: string
  primary: string
}

export default function GalleryLightbox({ photos, companyName, primary }: GalleryLightboxProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const touchStartX = useRef<number>(0)

  const open = useCallback((i: number) => {
    setSelected(i)
    document.body.style.overflow = "hidden"
  }, [])

  const close = useCallback(() => {
    setSelected(null)
    document.body.style.overflow = ""
  }, [])

  const prev = useCallback(() => {
    setSelected(i => i !== null ? (i - 1 + photos.length) % photos.length : null)
  }, [photos.length])

  const next = useCallback(() => {
    setSelected(i => i !== null ? (i + 1) % photos.length : null)
  }, [photos.length])

  useEffect(() => {
    if (selected === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selected, close, prev, next])

  // Clean up scroll lock if component unmounts while open
  useEffect(() => () => { document.body.style.overflow = "" }, [])

  return (
    <>
      {/* ── Masonry grid ── */}
      <div className="masonry px-0.5">
        {photos.map((url, i) => (
          <InView key={i} className="masonry-item" delay={i < 6 ? i * 40 : 0} distance={0}>
            <button
              onClick={() => open(i)}
              className="block w-full cursor-zoom-in focus:outline-none"
              aria-label={`View photo ${i + 1}`}
            >
              <img
                src={url}
                alt={`${companyName} — photo ${i + 1}`}
                className="w-full h-auto block hover:opacity-90 transition-opacity duration-200"
                loading={i < 4 ? "eager" : "lazy"}
              />
            </button>
          </InView>
        ))}
      </div>

      {/* ── Lightbox overlay ── */}
      {selected !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.95)" }}
          onClick={close}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            const delta = e.changedTouches[0].clientX - touchStartX.current
            if (delta > 50) prev()
            else if (delta < -50) next()
          }}
        >
          {/* Photo */}
          <img
            src={photos[selected]}
            alt={`${companyName} — photo ${selected + 1}`}
            className="max-w-full max-h-full object-contain"
            style={{ maxHeight: "90vh", maxWidth: "90vw" }}
            onClick={e => e.stopPropagation()}
          />

          {/* Close */}
          <button
            onClick={close}
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center"
            style={{ border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50px" }}
            aria-label="Close"
          >
            <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev arrow — desktop */}
          {photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); prev() }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 hidden md:flex items-center justify-center"
              style={{ border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50px" }}
              aria-label="Previous photo"
            >
              <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Next arrow — desktop */}
          {photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); next() }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 hidden md:flex items-center justify-center"
              style={{ border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50px" }}
              aria-label="Next photo"
            >
              <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Counter */}
          <div
            className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs font-black tracking-widest"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {selected + 1} / {photos.length}
          </div>

          {/* Color accent line at top */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{ backgroundColor: primary }}
          />
        </div>
      )}
    </>
  )
}
