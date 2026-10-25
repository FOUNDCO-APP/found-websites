import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStockImages } from "@/lib/stockImages"
import { getSiteCTAs } from "@/lib/industryCTAs"
import GalleryLightbox, { type GalleryMedia } from "@/components/GalleryLightbox"
import { isVideoMedia } from "@/lib/mediaKind"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { isSecurityGuardIndustry } from "@/lib/industryDetection"
import { getSiteCopy } from "@/lib/siteCopy"
import { albumLabelFor } from "@/lib/dashboard/typography"
import { resolveStockPhoto } from "@/lib/stockPhotoLibrary"
import { getPublicSectionMedia } from "@/lib/publicSectionMedia"
import PublicPageHeroMedia from "@/components/PublicPageHeroMedia"
import type { Metadata } from "next"

const illustrativeCollection = "Illustrative Security Photography"

function galleryIntroduction(name: string, hasStock: boolean, hasOtherPhotos: boolean) {
  if (!hasStock) return `A closer look at ${name}.`
  return hasOtherPhotos
    ? `Photos shared by ${name}, with illustrative stock photography labeled separately.`
    : "Illustrative stock photography, not photographs of our personnel, client properties, or completed work."
}

function isIllustrative(photo: GalleryMedia) {
  return Boolean(photo.isStock || resolveStockPhoto(photo.url))
}

function GalleryPhotoGroups({ photos, companyName, primary, security }: { photos: GalleryMedia[]; companyName: string; primary: string; security: boolean }) {
  const stock = photos.filter(isIllustrative)
  const other = photos.filter(photo => !isIllustrative(photo))
  if (!stock.length) return <GalleryLightbox photos={photos} companyName={companyName} primary={primary} />
  return <>
    {other.length > 0 && <>
      <div className="max-w-6xl mx-auto px-8 py-6"><h2 className="text-xl font-black">Shared Photos</h2></div>
      <GalleryLightbox photos={other} companyName={companyName} primary={primary} />
    </>}
    <div className="max-w-6xl mx-auto px-8 py-6">
      <h2 className="text-xl font-black">{security ? illustrativeCollection : "Illustrative Photography"}</h2>
      <p className="mt-2 text-sm text-gray-600">Illustrative stock, not our personnel, client properties, or completed work.</p>
    </div>
    <GalleryLightbox photos={stock} companyName={companyName} primary={primary} />
  </>
}

function GalleryHeader({ label, intro, primary, media, albumCount = 0, albumName = "" }: {
  label: string; intro: string; primary: string; media: string | null; albumCount?: number; albumName?: string
}) {
  return (
    <section className={media ? "relative min-h-[45vh] flex items-end overflow-hidden px-8 py-16" : "py-10 px-8 bg-white"}
      style={media ? undefined : { borderBottom: "1px solid #f0f0f0" }}>
      {media && <PublicPageHeroMedia src={media} alt="" background="#111111" />}
      <div className={media ? "relative z-10 max-w-6xl mx-auto w-full" : "max-w-6xl mx-auto"}>
        <div className="flex items-center justify-between">
          <h1 className={media ? "text-3xl md:text-5xl font-black leading-tight" : "text-xs font-black tracking-widest uppercase"}
            style={{ color: media ? "#ffffff" : primary }}>{label}</h1>
          {albumCount > 0 && <span className="text-xs font-black" style={{ color: media ? "#ffffff" : "#bbbbbb" }}>
            {albumCount} {albumName}
          </span>}
        </div>
        <div className="w-10 h-0.5 mt-4 mb-4" style={{ backgroundColor: primary }} />
        <p className="text-base max-w-xl" style={{ color: media ? "#ffffff" : "#666666" }}>{intro}</p>
        {media && resolveStockPhoto(media) && <p className="mt-3 text-sm text-white max-w-xl">{resolveStockPhoto(media)?.caption}</p>}
      </div>
    </section>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) return { title: "Gallery" }
  const vocab = getVocab(company.sub_industry ?? null, company.industry_category)
  return { title: `${vocab.galleryLabel} — ${company.name}` }
}

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const admin = createAdminClient()

  const plan = company.plan ?? null
  const status = company.subscription_status ?? null
  const isPro = (plan === "found_pro" || plan === "found_business") && (status === "active" || status === "trialing")

  const primary = company.primary_color
  const imgs = await getStockImages(company)
  const vocab = getVocab(company.sub_industry ?? null, company.industry_category)
  const galleryLabel = vocab.galleryLabel
  const isGuard = company.industry_category === "professional_services" && isSecurityGuardIndustry(company.sub_industry)
  const collectionLabel = isGuard ? illustrativeCollection : "Illustrative Photography"
  const albumLabel = albumLabelFor(company.industry_category)
  const { primary: cta } = getSiteCTAs(company, [])
  const ctaLabel = cta.label
  const ctaHref = cta.href
  const galleryHero = await getPublicSectionMedia(admin, company.id, "gallery_hero")
  // Gallery membership never assigns a photo to the CTA backdrop.
  const { data: ctaSectionRow } = await admin
    .from("company_photos")
    .select("url")
    .eq("company_id", company.id)
    .eq("for_website", true)
    .eq("website_section", "cta")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  // The CTA band is always a still background image, never a playable
  // video slot - skip it here rather than let a picked video fail silently.
  // company_photos has no mime_type column - isVideoMedia falls back to the
  // URL's file extension, which is how video detection works everywhere
  // else in this codebase too (mime_type is never actually persisted).
  const ctaSectionPhoto = ctaSectionRow && !isVideoMedia(ctaSectionRow.url) ? ctaSectionRow.url : null
  const config = company.website_config
  const siteCopy = getSiteCopy(company.primary_intent, {
    name: company.name,
    city: company.city ?? undefined,
    subIndustry: company.sub_industry,
    industryCategory: company.industry_category,
    services: config?.services,
  })
  const galleryCta = siteCopy.galleryCta
  const galleryCtaHeading = config?.cta_headline || siteCopy.galleryCtaHeading

  // ── Pro: album-organized gallery ─────────────────────────────────────────
  if (isPro) {
    let albumsData: Array<{ id: string; name: string; slug: string; cover_photo_id?: string | null; album_type?: string | null }> = []
    const albumsQuery = await admin.from("photo_albums").select("id, name, slug, cover_photo_id, album_type, show_on_website_gallery").eq("company_id", company.id).eq("show_on_website_gallery", true).order("created_at", { ascending: false })
    // Publication is explicit; a schema/read failure must not expose hidden albums.
    albumsData = albumsQuery.error ? [] : albumsQuery.data ?? []
    const [albumPhotosResult, unsortedResult] = await Promise.all([
      admin.from("company_photos").select("id, url, album_id").eq("company_id", company.id).not("album_id", "is", null).order("created_at", { ascending: true }),
      admin.from("company_photos").select("id, url").eq("company_id", company.id).eq("in_gallery", true).is("album_id", null).order("created_at", { ascending: false }),
    ])

    // Group album photos by album_id
    const photosByAlbum = new Map<string, GalleryMedia[]>()
    for (const photo of albumPhotosResult.data ?? []) {
      if (!photo.album_id) continue
      if (!photosByAlbum.has(photo.album_id)) photosByAlbum.set(photo.album_id, [])
      photosByAlbum.get(photo.album_id)!.push({ url: photo.url })
    }

    const albums = albumsData
      .map(album => {
        const albumPhotos = photosByAlbum.get(album.id) ?? []
        // Cover tile is a plain <img>, never a playable video slot - prefer
        // the owner's explicitly chosen cover photo, then fall back to the
        // first still photo (never just the first item, which could be a video).
        // A cover must belong to this published album, not another album or slot.
        const chosenCoverUrl = album.cover_photo_id
          ? (albumPhotosResult.data ?? []).find(photo => photo.id === album.cover_photo_id && photo.album_id === album.id)?.url
          : undefined
        const chosenCover = chosenCoverUrl && !isVideoMedia(chosenCoverUrl) ? chosenCoverUrl : null
        const coverUrl = chosenCover ?? albumPhotos.find(p => !isVideoMedia(p.url))?.url ?? null
        const stockCount = albumPhotos.filter(photo => resolveStockPhoto(photo.url)).length
        return { ...album, coverUrl, photoCount: albumPhotos.length, stockCount }
      })
      .filter(a => a.photoCount > 0)

    // Flat section: owner-managed gallery photos.
    const flatPhotos: GalleryMedia[] = (unsortedResult.data ?? []).map(p => ({ url: p.url }))

    const hasContent = albums.length > 0 || flatPhotos.length > 0
    const hasStock = albums.some(album => album.stockCount > 0) || flatPhotos.some(photo => resolveStockPhoto(photo.url)) || Boolean(galleryHero && resolveStockPhoto(galleryHero))
    const hasOtherPhotos = albums.some(album => album.stockCount < album.photoCount) || flatPhotos.some(photo => !resolveStockPhoto(photo.url))
    const galleryIntro = galleryIntroduction(company.name, hasStock, hasOtherPhotos)
    const ctaImg = ctaSectionPhoto

    return (
      <>
        {/* Header */}
        <GalleryHeader label={galleryLabel} intro={galleryIntro} primary={primary} media={galleryHero}
          albumCount={albums.length} albumName={albums.length === 1 ? albumLabel.singular.toLowerCase() : albumLabel.plural.toLowerCase()} />

        {hasContent ? (
          <>
            {/* Album cover grid */}
            {albums.length > 0 && (
              <section className="bg-white py-8 px-8">
                <div className="max-w-6xl mx-auto" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {albums.map(album => (
                    <Link key={album.id} href={`/gallery/${album.slug}`} style={{ textDecoration: "none", display: "block" }}>
                      <div style={{ borderRadius: 16, overflow: "hidden", aspectRatio: "4/3", backgroundColor: "#f0f0f0", position: "relative" }}>
                        {album.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolveStockPhoto(album.coverUrl)?.thumbnailUrl ?? album.coverUrl}
                            srcSet={resolveStockPhoto(album.coverUrl)?.thumbnailSrcSet} sizes={resolveStockPhoto(album.coverUrl)?.sizes}
                            alt={resolveStockPhoto(album.coverUrl)?.alt ?? album.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                        ) : (
                          <div style={{ width: "100%", height: "100%", backgroundColor: "#e8e8e8" }} />
                        )}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.72))" }} />
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 18px 18px" }}>
                          <p style={{ margin: "0 0 3px", fontSize: 16, fontWeight: 800, color: "white", lineHeight: 1.25 }}>{album.stockCount === album.photoCount ? collectionLabel : album.name}</p>
                          {album.stockCount > 0 && <p className="text-xs text-white mb-1">{album.stockCount === album.photoCount ? "Illustrative stock photography" : "Includes illustrative stock photography"}</p>}
                          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>
                            {album.photoCount} {album.photoCount === 1 ? "photo" : "photos"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Owner-managed gallery photos */}
            {flatPhotos.length > 0 && (
              <section className="bg-white pt-2 pb-10">
                {albums.length > 0 && (
                  <div className="max-w-6xl mx-auto px-8 pb-4">
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#bbb" }}>More Photos</p>
                  </div>
                )}
                <GalleryPhotoGroups photos={flatPhotos} companyName={company.name} primary={primary} security={isGuard} />
              </section>
            )}

            {/* CTA */}
            <section className="relative py-24 text-center overflow-hidden">
              {ctaImg ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ctaImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/65" />
                </>
              ) : (
                <div className="absolute inset-0" style={{ backgroundColor: "#111111" }} />
              )}
              <div className="relative z-10 px-8">
                <div className="w-10 h-1 mx-auto mb-8" style={{ backgroundColor: primary }} />
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4" style={{ fontFamily: "var(--font-heading, inherit)" }}>
                  {galleryCtaHeading}
                </h2>
                <p className="mb-10 text-base" style={{ color: "#cccccc" }}>{galleryCta}</p>
                <Link href={ctaHref} className="btn text-white" style={{ backgroundColor: primary, borderColor: primary }}>{ctaLabel}</Link>
              </div>
            </section>
          </>
        ) : (
          <section className="py-40 px-8 text-center bg-white">
            <div className="max-w-md mx-auto">
              <div className="w-12 h-1 mx-auto mb-12" style={{ backgroundColor: primary }} />
              <h2 className="text-4xl font-black mb-5" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                {isGuard ? "Gallery" : "Our work speaks for itself."}
              </h2>
              <p className="text-base mb-3 leading-relaxed" style={{ color: "#555555" }}>{isGuard ? "No photos to display" : <>We&apos;re adding our latest {albumLabel.plural.toLowerCase()}.</>}</p>
              <p className="text-base mb-12 leading-relaxed" style={{ color: "#888888" }}>{isGuard ? "Contact us to discuss your security needs." : "Check back soon — or reach out to see examples directly."}</p>
              <Link href={ctaHref} className="btn text-white" style={{ backgroundColor: primary, borderColor: primary }}>{ctaLabel}</Link>
            </div>
          </section>
        )}
      </>
    )
  }

  // ── Base plan: flat grid (unchanged) ─────────────────────────────────────
  const [dashboardResult] = await Promise.all([
    admin
      .from("company_photos")
      .select("id, url, album_id")
      .eq("company_id", company.id)
      .eq("in_gallery", true)
      .order("created_at", { ascending: false }),
  ])

  const galleryRows = dashboardResult.data ?? []
  const albumIds = [...new Set(galleryRows.map(photo => photo.album_id).filter((id): id is string => Boolean(id)))]
  const publishedIds = new Set<string>()
  if (albumIds.length) {
    const { data, error } = await admin.from("photo_albums").select("id").eq("company_id", company.id)
      .eq("show_on_website_gallery", true).in("id", albumIds)
    if (!error) for (const album of data ?? []) publishedIds.add(album.id)
  }
  const ownerPhotos: GalleryMedia[] = galleryRows
    .filter(photo => !photo.album_id || publishedIds.has(photo.album_id))
    .map(photo => ({ url: photo.url }))
  const stockPhotos = isGuard ? imgs : (company.website_config?.stock_images as string[] | null) ?? imgs
  const mediaPhotos: GalleryMedia[] = ownerPhotos.length
    ? ownerPhotos
    : stockPhotos.filter(Boolean).map(url => ({ url, isStock: true }))
  const hasPhotos = mediaPhotos.length > 0
  const hasStock = mediaPhotos.some(isIllustrative) || Boolean(galleryHero && resolveStockPhoto(galleryHero))
  const galleryIntro = galleryIntroduction(company.name, hasStock, mediaPhotos.some(photo => !isIllustrative(photo)))
  const ctaImg = ctaSectionPhoto

  return (
    <>
      {/* Header */}
      <GalleryHeader label={galleryLabel} intro={galleryIntro} primary={primary} media={galleryHero} />

      {hasPhotos ? (
        <>
          <section className="bg-white pt-1 pb-10">
            <GalleryPhotoGroups photos={mediaPhotos} companyName={company.name} primary={primary} security={isGuard} />
          </section>
          <section className="relative py-24 text-center overflow-hidden">
            {ctaImg ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ctaImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/65" />
              </>
            ) : (
              <div className="absolute inset-0" style={{ backgroundColor: "#111111" }} />
            )}
            <div className="relative z-10 px-8">
              <div className="w-10 h-1 mx-auto mb-8" style={{ backgroundColor: primary }} />
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4" style={{ fontFamily: "var(--font-heading, inherit)" }}>
                {galleryCtaHeading}
              </h2>
              <p className="mb-10 text-base" style={{ color: "#cccccc" }}>{galleryCta}</p>
              <Link href={ctaHref} className="btn text-white" style={{ backgroundColor: primary, borderColor: primary }}>{ctaLabel}</Link>
            </div>
          </section>
        </>
      ) : (
        <section className="py-40 px-8 text-center bg-white">
          <div className="max-w-md mx-auto">
            <div className="w-12 h-1 mx-auto mb-12" style={{ backgroundColor: primary }} />
            <h2 className="text-4xl font-black mb-5" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
              {isGuard ? "Gallery" : "Our work speaks for itself."}
            </h2>
            <p className="text-base mb-3 leading-relaxed" style={{ color: "#555555" }}>{isGuard ? "No photos to display" : <>We&apos;re documenting our latest projects.</>}</p>
            <p className="text-base mb-12 leading-relaxed" style={{ color: "#888888" }}>{isGuard ? "Contact us to discuss your security needs." : "Check back soon — or reach out to see examples directly."}</p>
            <Link href={ctaHref} className="btn text-white" style={{ backgroundColor: primary, borderColor: primary }}>{ctaLabel}</Link>
          </div>
        </section>
      )}
    </>
  )
}
