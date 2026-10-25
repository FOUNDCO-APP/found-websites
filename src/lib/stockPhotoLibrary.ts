import { isSecurityGuardIndustry } from "./industryDetection"
import type { SitePhotoSlot } from "./siteSectionRegistry"

export type StockPhotoSection = SitePhotoSlot

export type StockPhotoMetadata = {
  readonly id: string
  readonly source: "Pexels"
  readonly sourceUrl: string
  readonly photographer: string
  readonly license: { readonly name: string; readonly url: string }
  readonly urls: readonly string[]
  readonly alt: string
  readonly caption: string
  readonly approvedOn: string
  readonly approvedSections: readonly StockPhotoSection[]
  readonly includeInGallery: boolean
  readonly availableInLibrary?: boolean
  readonly thumbnailUrl?: string
  readonly thumbnailSrcSet?: string
  readonly sizes?: string
  readonly fullViewUrl?: string
}

const storageBase = "https://mmctzloztgkbqvofmkou.supabase.co/storage/v1/object/public/company-assets/626dc220-4152-4711-8862-a885534e1e0a/approved-stock/"
const radioFullView = `${storageBase}pexels-8591606-34d4cf3494d2c3a5ea15825838b71abe0d04905b8b859e3306b8ec572cef7104.jpg`
const entranceFullView = `${storageBase}pexels-164586-1e3e1049158727d39a9794a8ea7c3e855c3d4ec6715d47317485531037d59d41.jpg`
const pexelsLicense = { name: "Pexels License", url: "https://www.pexels.com/license/" } as const

function responsivePexelsPhoto(id: string, fullViewUrl: string) {
  const thumbnail = (width: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`
  return {
    thumbnailUrl: thumbnail(640),
    thumbnailSrcSet: [320, 640, 960].map(width => `${thumbnail(width)} ${width}w`).join(", "),
    sizes: "(min-width: 768px) 33vw, 50vw",
    fullViewUrl,
  }
}

// Recognition is separate from placement approval. Nothing here adds images to a site.
export const STOCK_PHOTO_LIBRARY: readonly StockPhotoMetadata[] = [
  {
    id: "pexels:8591606", source: "Pexels", photographer: "Ron Lach",
    sourceUrl: "https://www.pexels.com/photo/a-man-talking-on-a-walkie-talkie-8591606/",
    license: pexelsLicense,
    urls: [
      "https://images.pexels.com/photos/8591606/pexels-photo-8591606.jpeg",
      radioFullView,
    ],
    alt: "Illustrative stock photo of a person in black clothing using a two-way radio",
    caption: "Radio communication in a security setting. Illustrative stock; not the company's personnel or work.",
    approvedOn: "2026-10-24", approvedSections: ["hero"], includeInGallery: false, availableInLibrary: false,
    ...responsivePexelsPhoto("8591606", radioFullView),
  },
  {
    id: "pexels:164586", source: "Pexels", photographer: "Pixabay",
    sourceUrl: "https://www.pexels.com/photo/stainless-steel-tubular-tool-164586/",
    license: pexelsLicense,
    urls: [
      "https://images.pexels.com/photos/164586/pexels-photo-164586.jpeg",
      entranceFullView,
    ],
    alt: "Illustrative stock photo of turnstiles in a commercial entrance",
    caption: "Commercial entrance with turnstiles. Illustrative stock; not the company's premises or a client property.",
    approvedOn: "2026-10-24", approvedSections: ["about", "services"], includeInGallery: false, availableInLibrary: false,
    ...responsivePexelsPhoto("164586", entranceFullView),
  },
]

function imageIdentity(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password) return null
    // Query parameters may select CDN sizes; the complete host and immutable path must match.
    return `${url.origin}${url.pathname}`
  } catch {
    return null
  }
}

export function resolveStockPhoto(idOrUrl: string): StockPhotoMetadata | null {
  const byId = STOCK_PHOTO_LIBRARY.find(photo => photo.id === idOrUrl)
  if (byId) return byId
  const identity = imageIdentity(idOrUrl)
  if (!identity) return null
  return STOCK_PHOTO_LIBRARY.find(photo => photo.urls.some(url => imageIdentity(url) === identity)) ?? null
}

export function getAvailableStockPhotos(industryCategory: string | null | undefined, subIndustry?: string | null): readonly StockPhotoMetadata[] {
  if (industryCategory !== "professional_services" || !isSecurityGuardIndustry(subIndustry)) return []
  return STOCK_PHOTO_LIBRARY.filter(photo => photo.availableInLibrary === true)
}
