import type { ImgHTMLAttributes } from "react"
import { resolveStockPhoto } from "@/lib/stockPhotoLibrary"

type Props = ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string; hero?: boolean }

export default function PublicSitePhoto({ src, alt, hero = false, style, ...props }: Props) {
  const stock = resolveStockPhoto(src)
  if (!stock) return <img {...props} src={src} alt={alt} style={style} />
  return <img {...props} src={src} alt={stock.alt}
    srcSet={(hero ? stock.heroSrcSet : stock.thumbnailSrcSet) ?? props.srcSet}
    sizes={props.sizes ?? (hero ? "100vw" : stock.sizes)}
    style={hero && stock.heroObjectPosition ? { ...style, objectPosition: stock.heroObjectPosition } : style} />
}

export function PublicSitePhotoLabel({ src, className = "mt-3 text-xs text-white/80" }: { src: string | null | undefined; className?: string }) {
  if (!src || !resolveStockPhoto(src)) return null
  return <p className={className}>Illustrative stock</p>
}
