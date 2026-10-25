import { isVideoMedia } from "@/lib/mediaKind"
import PublicSitePhoto from "@/components/PublicSitePhoto"

export default function PublicPageHeroMedia({ src, alt, background }: { src: string | null; alt: string; background: string }) {
  if (!src) return <div className="absolute inset-0" style={{ background }} />
  return <>
    {isVideoMedia(src)
      ? <video src={src} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
      : <PublicSitePhoto src={src} alt={alt} hero className="absolute inset-0 w-full h-full object-cover" />}
    <div className="absolute inset-0 bg-black/70" />
  </>
}
