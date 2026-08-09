"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { isVideoMedia } from "@/lib/mediaKind"

type SharedPhoto = {
  id: string
  url: string
  created_at?: string | null
}

function GridVideoTile({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#111" }}>
      <video
        src={src}
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        onLoadedData={() => setLoaded(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: loaded ? 1 : 0.4 }}
      />
      <div style={{
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
        width: 32, height: 32, borderRadius: "50%",
        backgroundColor: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
      </div>
    </div>
  )
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
            {isVideoMedia(photo.url) ? (
              <GridVideoTile src={photo.url} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                loading="lazy"
              />
            )}
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
            zIndex: 2147483000,
            minHeight: "100dvh",
            backgroundColor: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "max(env(safe-area-inset-top, 0px), 14px) 0 max(env(safe-area-inset-bottom, 0px), 14px)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "fixed",
              top: "max(env(safe-area-inset-top, 0px), 14px)",
              left: 18,
              zIndex: 2,
              padding: "8px 13px",
              borderRadius: 999,
              background: "rgba(20,20,20,0.72)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.78)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            {(activeIndex ?? 0) + 1} of {photos.length}
          </div>

          <button
            type="button"
            onClick={event => {
              event.stopPropagation()
              setActiveIndex(null)
            }}
            aria-label="Close photo"
            style={{
              position: "fixed",
              top: "max(env(safe-area-inset-top, 0px), 14px)",
              right: 18,
              zIndex: 2,
              width: 44,
              height: 44,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(20,20,20,0.72)",
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

          {isVideoMedia(activePhoto.url) ? (
            <video
              key={activePhoto.url}
              src={activePhoto.url}
              controls
              autoPlay
              playsInline
              onClick={event => event.stopPropagation()}
              style={{
                maxWidth: "100vw",
                maxHeight: "100dvh",
                objectFit: "contain",
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activePhoto.url}
              alt=""
              onClick={event => event.stopPropagation()}
              style={{
                maxWidth: "100vw",
                maxHeight: "100dvh",
                objectFit: "contain",
                borderRadius: 0,
                boxShadow: "none",
              }}
            />
          )}

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
    zIndex: 2,
    width: 46,
    height: 46,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(20,20,20,0.72)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  }
}
