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
  readonly enforcePlacementApproval?: boolean
  readonly thumbnailUrl?: string
  readonly thumbnailSrcSet?: string
  readonly sizes?: string
  readonly fullViewUrl?: string
  readonly heroSrcSet?: string
  readonly heroObjectPosition?: string
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
    heroSrcSet: [640, 960, 1280, 1920, 2560].map(width => `${thumbnail(width)} ${width}w`).join(", "),
    sizes: "(min-width: 768px) 33vw, 50vw",
    fullViewUrl,
  }
}

function approvedPexelsPhoto(id: string, sha256: string,
  metadata: Pick<StockPhotoMetadata, "photographer" | "sourceUrl" | "alt" | "caption" | "approvedSections" | "heroObjectPosition">,
  legacyUrls: readonly string[] = []): StockPhotoMetadata {
  const fullViewUrl = `https://mmctzloztgkbqvofmkou.supabase.co/storage/v1/object/public/company-assets/stock-library/security/pexels-${id}-${sha256}.jpeg`
  return {
    ...metadata, id: `pexels:${id}`, source: "Pexels", license: pexelsLicense,
    urls: [`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`, fullViewUrl, ...legacyUrls],
    approvedOn: "2026-10-24", availableInLibrary: true, enforcePlacementApproval: true, includeInGallery: true,
    ...responsivePexelsPhoto(id, fullViewUrl),
  }
}

// Shawn approved these exact twelve. Owners still import and place each photo explicitly.
// Retain withdrawn entries and enforcePlacementApproval so existing imports keep their restrictions.
export const STOCK_PHOTO_LIBRARY: readonly StockPhotoMetadata[] = [
  approvedPexelsPhoto("8591606", "1922515e4690aed3ed9c5af34f8d0a00441e0a873a50c621d2c26c42a6fe8999", {
    photographer: "Ron Lach",
    sourceUrl: "https://www.pexels.com/photo/a-man-talking-on-a-walkie-talkie-8591606/",
    alt: "Illustrative stock photo of a person in black clothing using a two-way radio",
    caption: "Radio communication in a security setting. Illustrative stock; not the company's personnel or work.",
    approvedSections: ["hero"],
  }, [radioFullView]),
  approvedPexelsPhoto("164586", "69605069f761862361717140cb8e16823b9ed407c36cfe98e6887167c2531465", {
    photographer: "Pixabay",
    sourceUrl: "https://www.pexels.com/photo/stainless-steel-tubular-tool-164586/",
    alt: "Illustrative stock photo of turnstiles in a commercial entrance",
    caption: "Commercial entrance with turnstiles. Illustrative stock; not the company's premises or a client property.",
    approvedSections: ["about", "services"],
  }, [entranceFullView]),
  approvedPexelsPhoto("34585117", "9d5e9488be0de1bc41d38e1b43565507d6447cf5e0a0a5772e7d6e6f417d4dd3", {
    photographer: "Caleb Oquendo", sourceUrl: "https://www.pexels.com/photo/security-guard-overseeing-outdoor-event-crowd-34585117/",
    alt: "Illustrative stock photo of a security guard overlooking an outdoor event crowd",
    caption: "Outdoor event security setting. Illustrative stock; not the company's personnel, clients or work.",
    approvedSections: ["hero", "services", "gallery_hero"],
  }),
  approvedPexelsPhoto("2990765", "deb422137508edc62b9ec30e838efa473f74ed1449af5fa64a3c7b6eccd0375a", {
    photographer: "energepic.com", sourceUrl: "https://www.pexels.com/photo/back-view-of-a-bouncer-2990765/",
    alt: "Illustrative stock photo of a security worker seen from behind at a concert",
    caption: "Concert security setting. Illustrative stock; not the company's personnel, clients or work.",
    approvedSections: ["hero", "services", "gallery_hero"],
  }),
  approvedPexelsPhoto("18614840", "3df1106b8a0bad7c8e0a5066c1738d9437b7a357982f01fbf1fd8ee1f03c7901", {
    photographer: "Mason McCall", sourceUrl: "https://www.pexels.com/photo/a-man-in-a-jacket-looking-out-of-a-window-18614840/",
    alt: "Illustrative monochrome stock photo of a person in a jacket at a doorway",
    caption: "Doorway scene. Illustrative stock; not the company's personnel or work.", approvedSections: [],
  }),
  approvedPexelsPhoto("5511130", "a7144c6caefee9eca27bb9783fce024c70caf5a2b20b8af8fc0f09f1e271e9fa", {
    photographer: "Mike van Schoonderwalt", sourceUrl: "https://www.pexels.com/photo/interior-of-office-5511130/",
    alt: "Illustrative stock photo of an office corridor",
    caption: "Commercial office setting. Illustrative stock; not the company's premises, client property or completed work.",
    approvedSections: ["hero", "about", "services", "contact", "gallery_hero", "cta"],
  }),
  approvedPexelsPhoto("5869284", "9a600939a2ebec44c898e44bf45110a4443fcd28164ebcd423b20145818a554f", {
    photographer: "FROET", sourceUrl: "https://www.pexels.com/photo/red-chairs-in-modern-office-lobby-5869284/",
    alt: "Illustrative stock photo of a glass office lobby with red seating",
    caption: "Commercial lobby setting. Illustrative stock; not the company's premises, client property or completed work.",
    approvedSections: ["about", "services", "contact", "gallery_hero", "cta"],
  }),
  approvedPexelsPhoto("8134817", "85dec69ec59b6017ba373961716f9ff085911e6901fed50820767dbd50f06f68", {
    heroObjectPosition: "23% 50%",
    photographer: "Max Vakhtbovych", sourceUrl: "https://www.pexels.com/photo/frontage-of-a-residential-house-with-garden-8134817/",
    alt: "Illustrative stock photo of a modern residential entrance and gate",
    caption: "Residential entrance setting. Illustrative stock; not the company's premises, client property or completed work.",
    approvedSections: ["hero", "about", "services", "contact", "gallery_hero", "cta"],
  }),
  approvedPexelsPhoto("4913326", "67f46054b57b195606744f08219b2e8bc7ed31ac44c6da337c004dea5e006543", {
    photographer: "Maria Orlova", sourceUrl: "https://www.pexels.com/photo/facade-of-cozy-residential-house-surrounded-by-green-trees-4913326/",
    alt: "Illustrative stock photo of a traditional gated residence with trees",
    caption: "Residential setting. Illustrative stock; not apartments, a client property or completed company work.",
    approvedSections: ["about", "services", "contact", "gallery_hero", "cta"],
  }),
  approvedPexelsPhoto("28196476", "23199f996ad8d414eef5daa22c4978a0db81733fffbbadaa59f0d91b1accd7ad", {
    photographer: "Rakesh Mondal", sourceUrl: "https://www.pexels.com/photo/a-sign-on-the-wall-of-a-building-with-a-light-28196476/",
    alt: "Illustrative stock detail photo of fire-exit signage",
    caption: "Fire-exit signage detail. Illustrative stock; not evidence of fire-watch service or completed company work.", approvedSections: [],
  }),
  approvedPexelsPhoto("10349987", "5d4b2c398995643bcfb0c726c2ef52636d88b5eab83b8903e640b35bd6bd5ac6", {
    photographer: "Ron Lach", sourceUrl: "https://www.pexels.com/photo/a-shot-of-walkie-talkie-in-hand-10349987/",
    alt: "Illustrative stock detail photo of a handheld two-way radio",
    caption: "Radio equipment detail. Illustrative stock; not verified company dispatch, personnel or work.", approvedSections: [],
  }),
  approvedPexelsPhoto("5053988", "2dcecc041842902c9932dc9b99088a0cc3e0b9e9d3308b0b8510615832c8894b", {
    photographer: "Shivam", sourceUrl: "https://www.pexels.com/photo/auditorium-with-empty-rows-of-seats-5053988/",
    alt: "Illustrative stock photo of empty auditorium seating",
    caption: "Event-venue setting. Illustrative stock; not a company venue, client property or completed assignment.",
    approvedSections: ["services", "gallery_hero", "cta"],
  }),
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
