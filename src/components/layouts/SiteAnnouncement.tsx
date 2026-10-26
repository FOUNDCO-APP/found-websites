import Link from "next/link"
import type { Company } from "@/types/company"
import { getFeaturedUpdatePublicCopy } from "@/lib/featuredUpdate"
import HomepageHighlightImage from "@/components/HomepageHighlightImage"
import { getHighlightPhotoHref, isHighlightPhotoHref, resolveHighlightHref } from "@/lib/highlightLinks"

type Props = {
  company: Company
  image?: string | null
  activeAddons?: string[]
}

export default function SiteAnnouncement({ company, image, activeAddons = [] }: Props) {
  const config = company.website_config
  if (!config?.announcement_enabled) return null

  const nearbyCopy = [
    config.hero_title,
    config.hero_subtitle,
    config.about_preview,
    config.about_text,
    "From the shop",
    "A closer look at what they carry",
    "From the menu",
    "A taste of what is ready",
  ]
  const copy = getFeaturedUpdatePublicCopy(company, nearbyCopy, activeAddons)
  if (!copy && !image) return null

  const title = copy?.title
  const body = copy?.body
  const label = copy?.label
  const href = resolveHighlightHref(copy?.href, company, activeAddons, "/contact")
  const photoHref = getHighlightPhotoHref(config.announcement_cta_href, image)
  const isPhoto = isHighlightPhotoHref(config.announcement_cta_href)
  if (!title || !body || !label) return null
  const style = config.announcement_style || "default"
  const imageUrl = style === "image" && !isPhoto && image ? image : null
  const isLight = style === "light"
  const isAccent = style === "accent"
  const primary = company.primary_color
  const buttonClassName = "btn inline-flex min-w-0 w-full justify-center md:w-auto md:max-w-xs"
  const buttonStyle = {
    backgroundColor: isLight ? primary : "#ffffff",
    borderColor: isLight ? primary : "#ffffff",
    color: isLight ? "#ffffff" : "#111111",
    boxShadow: isLight ? "0 18px 44px rgba(0,0,0,0.12)" : "0 18px 44px rgba(0,0,0,0.32)",
    whiteSpace: "normal" as const,
    overflowWrap: "anywhere" as const,
  }

  return (
    <section className="relative overflow-hidden py-12 md:py-20" style={{ backgroundColor: isLight ? "#f7f7f4" : "#0b0d0c" }}>
      {imageUrl && (
        <>
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/62" />
        </>
      )}
      {!imageUrl && !isLight && (
        <div
          className="absolute inset-0 opacity-80"
          style={{ background: isAccent ? `radial-gradient(circle at 20% 15%, ${primary}4d, transparent 36%), linear-gradient(135deg, #111715 0%, #050706 100%)` : "linear-gradient(135deg, #111514 0%, #050706 100%)" }}
        />
      )}
      <div className="relative z-10 mx-auto max-w-6xl px-8">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div className="min-w-0 max-w-3xl break-words">
            <p
              className="mb-4 text-xs font-black uppercase tracking-[0.24em]"
              style={{ color: isLight ? primary : isAccent ? "rgba(255,255,255,0.78)" : primary }}
            >
              {copy?.eyebrow}
            </p>
            <h2
              className="text-4xl font-black leading-[0.98] text-balance md:text-6xl"
              style={{ color: isLight ? "#111111" : "#ffffff", fontFamily: "var(--font-heading, inherit)" }}
            >
              {title}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed md:text-xl" style={{ color: isLight ? "#555555" : "rgba(255,255,255,0.74)" }}>
              {body}
            </p>
          </div>
          {isPhoto ? photoHref ? <HomepageHighlightImage
            src={photoHref} companyName={company.name} triggerLabel={label}
            triggerClassName={buttonClassName} triggerStyle={buttonStyle}
          /> : null : <Link href={href} className={buttonClassName} style={buttonStyle}>
            {label}
          </Link>}
        </div>
      </div>
    </section>
  )
}
