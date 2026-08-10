"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import InView from "@/components/InView"
import { isVideoMedia } from "@/lib/mediaKind"

export type GalleryMedia = {
  url: string
  mimeType?: string | null
}

interface GalleryLightboxProps {
  photos: (string | GalleryMedia)[]
  companyName: string
  primary: string
}

function normalize(items: (string | GalleryMedia)[]): GalleryMedia[] {
  return items.map(item => typeof item === "string" ? { url: item } : item)
}

function GridVideoTile({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    // Every other tile in this grid is forced to a 1:1 square crop
    // (.masonry-item img) specifically so no tile's height can differ from
    // its neighbors - that's what keeps the grid gapless. <video> doesn't
    // match that img-only CSS selector, so it needs the same square/cover
    // treatment applied directly, or it renders at its natural (usually
    // landscape) shape and leaves a gap under itself.
    <div className="relative w-full" style={{ aspectRatio: "1", backgroundColor: "#111111" }}>
      <video
        src={src}
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        onLoadedData={() => setLoaded(true)}
        className="hover:opacity-90 transition-opacity duration-200"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: loaded ? 1 : 0.4 }}
      />
      <div
        className="absolute pointer-events-none flex items-center justify-center"
        style={{
          left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          width: 40, height: 40, borderRadius: "50%",
          backgroundColor: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
      </div>
    </div>
  )
}

export default function GalleryLightbox({ photos: rawPhotos, companyName, primary }: GalleryLightboxProps) {
  const photos = normalize(rawPhotos)
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

  const selectedMedia = selected !== null ? photos[selected] : null
  const selectedIsVideo = selectedMedia ? isVideoMedia(selectedMedia.url, selectedMedia.mimeType) : false

  return (
    <>
      {/* ── Masonry grid ── */}
      <div className="masonry px-0.5">
        {photos.map((media, i) => {
          const isVideo = isVideoMedia(media.url, media.mimeType)
          return (
            <InView key={i} className="masonry-item" delay={i < 6 ? i * 40 : 0} distance={0}>
              <button
                onClick={() => open(i)}
                className="block w-full cursor-zoom-in focus:outline-none"
                aria-label={isVideo ? `View video ${i + 1}` : `View photo ${i + 1}`}
              >
                {isVideo ? (
                  <GridVideoTile src={media.url} />
                ) : (
                  <img
                    src={media.url}
                    alt={`${companyName} — photo ${i + 1}`}
                    className="w-full h-auto block hover:opacity-90 transition-opacity duration-200"
                    loading={i < 4 ? "eager" : "lazy"}
                  />
                )}
              </button>
            </InView>
          )
        })}
      </div>

      {/* ── Lightbox overlay ── */}
      {selected !== null && selectedMedia && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.95)" }}
          onClick={close}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            const delta = e.changedTouches[0].clientX - touchStartX.current
            if (delta > 50) prev()
            else if (delta < -50) next()
          }}
        >
          {/* Color accent line at top */}
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: primary }} />

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

          {/* Photo or video */}
          {selectedIsVideo ? (
            <video
              key={selectedMedia.url}
              src={selectedMedia.url}
              controls
              autoPlay
              playsInline
              className="object-contain"
              style={{ maxHeight: "75vh", maxWidth: "100%" }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={selectedMedia.url}
              alt={`${companyName} — photo ${selected + 1}`}
              className="object-contain"
              style={{ maxHeight: "75vh", maxWidth: "100%"  }}
              onClick={e => e.stopPropagation()}
            />
          )}

          {/* Controls row — prev · counter · next */}
          {photos.length > 1 && (
            <div
              className="flex items-center gap-8"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={prev}
                className="w-11 h-11 flex items-center justify-center"
                style={{ border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50px" }}
                aria-label="Previous photo"
              >
                <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="text-xs font-black tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
                {selected + 1} / {photos.length}
              </span>

              <button
                onClick={next}
                className="w-11 h-11 flex items-center justify-center"
                style={{ border: "1px solid rgba(255,255,255,0.3)", borderRadius: "50px" }}
                aria-label="Next photo"
              >
                <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
