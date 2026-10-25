import { resolveStockPhoto } from "./stockPhotoLibrary"

export class StockPhotoPlacementError extends Error {
  constructor() {
    super("This stock photo is not approved for that placement. Choose another photo.")
    this.name = "StockPhotoPlacementError"
  }
}

export function canPlaceStockPhoto(url: string, section: string): boolean {
  const stock = resolveStockPhoto(url)
  // Offering and placement approval are independent; withdrawal must keep enforcement.
  // Recognition-only legacy photos have neither flag and keep their existing behavior.
  if (!stock || (stock.availableInLibrary !== true && stock.enforcePlacementApproval !== true)) return true
  return section === "gallery" ? stock.includeInGallery : stock.approvedSections.some(slot => slot === section)
}

export function assertStockPhotoPlacement(url: string, section: string): void {
  if (!canPlaceStockPhoto(url, section)) throw new StockPhotoPlacementError()
}

export function assertStockSiteImageField(field: string, value: unknown): void {
  const section = ({ hero_image_url: "hero", hero_video_url: "hero", hero_images: "hero", stock_images: "gallery" } as Record<string, string>)[field]
  if (!section) return
  function check(item: unknown) {
    if (typeof item === "string" && item.trim()) assertStockPhotoPlacement(item, section)
    else if (Array.isArray(item)) item.forEach(check)
    else if (item && typeof item === "object") Object.values(item).forEach(check)
  }
  check(value)
}
