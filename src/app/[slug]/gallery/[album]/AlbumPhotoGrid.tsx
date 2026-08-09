"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"

type SharedPhoto = {
  id: string
  url: string
  created_at?: string | null
}

export default function AlbumPhotoGrid({ photos }: { photos: SharedPhoto[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const activePhoto = activeIndex === null ? null : photos[activeIndex]

  useEffect(() => {
    if (activeIndex === null) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveIndex(null)
      if (event.key === "ArrowLeft") setActiveIndex(index => index === null ? index : Math.max(0, index - 1))
      if (event.key === "ArrowRight") setActiveIndex(index => index === null ? index : Math.min(photos.length - 1, index + 1))
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [activeIndex, photos.length])

  return (
    <>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))",
        gap: 5,
      }}>
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label="Open photo"
            style={{
              border: "none",
              padding: 0,
              borderRadius: 10,
              overflow: "hidden",
              aspectRatio: "1",
              backgroundColor: "#eee",
              cursor: "zoom-in",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={() => setActiveIndex(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            backgroundColor: "rgba(0,0,0,0.94)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
          }}
        >
          <button
            type="button"
            onClick={event => {
              event.stopPropagation()
              setActiveIndex(null)
            }}
            aria-label="Close photo"
            style={{
              position: "fixed",
              top: "max(env(safe-area-inset-top, 0px), 16px)",
              right: 16,
              width: 42,
              height: 42,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(24,24,24,0.78)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          {activeIndex !== null && activeIndex > 0 && (
            <button
              type="button"
              onClick={event => {
                event.stopPropagation()
                setActiveIndex(activeIndex - 1)
              }}
              aria-label="Previous photo"
              style={navButtonStyle("left")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activePhoto.url}
            alt=""
            onClick={event => event.stopPropagation()}
            style={{
              maxWidth: "100%",
              maxHeight: "92vh",
              objectFit: "contain",
              borderRadius: 14,
              boxShadow: "0 28px 80px rgba(0,0,0,0.45)",
            }}
          />

          {activeIndex !== null && activeIndex < photos.length - 1 && (
            <button
              type="button"
              onClick={event => {
                event.stopPropagation()
                setActiveIndex(activeIndex + 1)
              }}
              aria-label="Next photo"
              style={navButtonStyle("right")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  )
}

function navButtonStyle(side: "left" | "right"): CSSProperties {
  return {
    position: "fixed",
    [side]: 14,
    top: "50%",
    transform: "translateY(-50%)",
    width: 44,
    height: 44,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(24,24,24,0.78)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  }
}
