"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import InView from "@/components/InView"
import { isVideoMedia } from "@/lib/mediaKind"
import { resolveStockPhoto, type StockPhotoMetadata } from "@/lib/stockPhotoLibrary"

export type GalleryMedia = {
  url: string
  mimeType?: string | null
  isStock?: boolean
  thumbnailUrl?: string
  thumbnailSrcSet?: string
  sizes?: string
  fullViewUrl?: string
  alt?: string
  caption?: string
}

interface GalleryLightboxProps {
  photos: (string | GalleryMedia)[]
  companyName: string
  primary: string
}

function normalize(items: (string | GalleryMedia)[]): (GalleryMedia & { stock: StockPhotoMetadata | null })[] {
  return items.map(item => {
    const media = typeof item === "string" ? { url: item } : item
    const stock = resolveStockPhoto(media.url)
    const isStock = Boolean(stock || media.isStock)
    return {
      ...media, stock, isStock,
      thumbnailUrl: media.thumbnailUrl ?? stock?.thumbnailUrl,
      thumbnailSrcSet: media.thumbnailSrcSet ?? stock?.thumbnailSrcSet,
      sizes: media.sizes ?? stock?.sizes,
      fullViewUrl: media.fullViewUrl ?? stock?.fullViewUrl,
      alt: stock?.alt ?? (isStock ? "Illustrative stock photo" : media.alt),
      caption: stock?.caption ?? (isStock ? "Illustrative stock; not the company's personnel, premises or work." : media.caption),
    }
  })
}

function StockPhotoCredits({ stock }: { stock: StockPhotoMetadata }) {
  return (
    <p className="text-xs leading-relaxed [overflow-wrap:anywhere]">
      Photo: {stock.photographer}{" / "}
      <a href={stock.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{stock.source}</a>{" / "}
      <a href={stock.license.url} target="_blank" rel="noopener noreferrer" className="underline">{stock.license.name}</a>
    </p>
  )
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
                    src={media.thumbnailUrl ?? media.url}
                    srcSet={media.thumbnailSrcSet}
                    sizes={media.sizes}
                    alt={media.alt ?? `${companyName} — photo ${i + 1}`}
                    className="w-full h-auto block hover:opacity-90 transition-opacity duration-200"
                    loading={i < 4 ? "eager" : "lazy"}
                    decoding="async"
                  />
                )}
              </button>
              {!media.isStock && media.caption && (
                <div className="bg-white px-3 py-3 text-gray-700 space-y-1 [overflow-wrap:anywhere]">
                  <p className="text-sm leading-relaxed">{media.caption}</p>
                </div>
              )}
            </InView>
          )
        })}
      </div>

      {/* ── Lightbox overlay ── */}
      {selected !== null && selectedMedia && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center gap-6 px-6 py-20 overflow-y-auto"
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
              src={selectedMedia.fullViewUrl ?? selectedMedia.url}
              controls
              autoPlay
              playsInline
              className="object-contain"
              style={{ maxHeight: "75vh", maxWidth: "100%" }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={selectedMedia.fullViewUrl ?? selectedMedia.url}
              alt={selectedMedia.alt ?? `${companyName} — photo ${selected + 1}`}
              className="object-contain shrink-0"
              style={{ maxHeight: selectedMedia.isStock || selectedMedia.caption ? "60vh" : "75vh", maxWidth: "100%"  }}
              onClick={e => e.stopPropagation()}
            />
          )}

          {(selectedMedia.isStock || selectedMedia.caption) && (
            <div className="max-w-2xl w-full text-center text-white space-y-2 shrink-0 [overflow-wrap:anywhere]" onClick={e => e.stopPropagation()}>
              {selectedMedia.isStock && <p className="text-xs font-semibold">Illustrative stock</p>}
              {selectedMedia.caption && <p className="text-sm leading-relaxed">{selectedMedia.caption}</p>}
              {selectedMedia.stock && <StockPhotoCredits stock={selectedMedia.stock} />}
            </div>
          )}

          {/* Controls row — prev · counter · next */}
          {photos.length > 1 && (
            <div
              className="flex items-center gap-8 shrink-0"
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
