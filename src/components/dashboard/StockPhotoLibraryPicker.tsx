"use client"

import { useEffect, useRef, useState } from "react"
import { getOwnerStockLibrary, importStockLibraryPhoto } from "@/app/dashboard/(app)/site/libraryActions"
import type { StockPhotoMetadata } from "@/lib/stockPhotoLibrary"
import type { LibraryPhoto } from "@/lib/ownerStockLibrary"
import { canPlaceStockPhoto } from "@/lib/stockPhotoPlacement"

export default function StockPhotoLibraryPicker({ onAdded, destination }: { onAdded: (photo: LibraryPhoto) => void; destination?: string }) {
  const [photos, setPhotos] = useState<StockPhotoMetadata[]>([])
  const [eligible, setEligible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const busyRef = useRef(false)
  const [added, setAdded] = useState<string[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getOwnerStockLibrary().then(result => {
      if (!active) return
      setEligible(result.eligible)
      setPhotos(result.photos)
      if (result.error) setError(result.error)
    }).catch(() => { if (active) setError("Could not load the photo library.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function add(id: string) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(id)
    setError("")
    try {
      const result = await importStockLibraryPhoto(id)
      if (result.error) { setError(result.error); return }
      if (result.photo) {
        onAdded(result.photo)
        setAdded(previous => [...previous, id])
      }
    } catch { setError("Could not add this photo. Please try again.") }
    finally { busyRef.current = false; setBusy(null) }
  }

  if (!eligible && !error) return null
  const visiblePhotos = photos.filter(photo => !destination || canPlaceStockPhoto(photo.fullViewUrl ?? photo.id, destination))
  return (
    <section aria-label="Stock photo library" className="px-5 py-4 border-b border-white/10 text-white min-w-0">
      <h3 className="text-sm font-semibold mb-3">Stock photo library</h3>
      {error && <p role="alert" className="text-sm text-red-300 mb-3 break-words">{error}</p>}
      {loading ? <p role="status" className="text-sm">Loading...</p> : visiblePhotos.length === 0 ? (
        <p className="text-sm text-white/60">No stock photos available yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visiblePhotos.map(photo => (
            <div key={photo.id} className="min-w-0 overflow-hidden rounded-lg border border-white/10">
              {/* Approved metadata supplies the image and license; importing never places it on the site. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumbnailUrl ?? photo.fullViewUrl} srcSet={photo.thumbnailSrcSet} sizes="(min-width: 768px) 240px, 40vw" alt={photo.alt} loading="lazy" className="w-full aspect-[4/3] object-cover" />
              <div className="p-2 min-w-0">
                <p className="text-xs break-words">Illustrative stock</p>
                <p className="text-xs break-words mt-1 text-white/80"><a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{photo.photographer} / Pexels</a>{" / "}<a href={photo.license.url} target="_blank" rel="noopener noreferrer" className="underline">{photo.license.name}</a></p>
                <button type="button" disabled={busy !== null || added.includes(photo.id)} onClick={() => add(photo.id)} className="mt-2 w-full min-h-11 px-2 py-2 text-xs font-semibold border border-white/20 rounded-lg disabled:opacity-50 break-words">
                  {added.includes(photo.id) ? "Added" : busy === photo.id ? "Adding..." : "Add to library"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
