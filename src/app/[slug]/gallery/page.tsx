import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStockImages, pickImg } from "@/lib/stockImages"
import { getSiteCTAs } from "@/lib/industryCTAs"
import GalleryLightbox, { type GalleryMedia } from "@/components/GalleryLightbox"
import { isVideoMedia } from "@/lib/mediaKind"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { getSiteCopy } from "@/lib/siteCopy"
import { albumLabelFor } from "@/lib/dashboard/typography"
import type { Metadata } from "next"

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
  // A short line of real context above the grid - a bare label and a photo
  // wall reads like a dumped folder, not a curated one.
  const galleryIntro = `A closer look at ${company.name}.`
  const albumLabel = albumLabelFor(company.industry_category)
  const { primary: cta } = getSiteCTAs(company, [])
  const ctaLabel = cta.label
  const ctaHref = cta.href
  // Real owner photos, if any exist, before ever falling back to stock -
  // the rest of this page shows real photos, so a stock image behind the
  // final CTA read as an obvious, jarring mismatch.
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
    const [albumsResult, albumPhotosResult, unsortedResult] = await Promise.all([
      admin.from("photo_albums").select("id, name, slug, cover_photo_id").eq("company_id", company.id).order("created_at", { ascending: false }),
      admin.from("company_photos").select("id, url, album_id").eq("company_id", company.id).not("album_id", "is", null).order("created_at", { ascending: true }),
      admin.from("company_photos").select("id, url").eq("company_id", company.id).eq("in_gallery", true).is("album_id", null).order("created_at", { ascending: false }),
    ])

    // Group album photos by album_id
    const photosByAlbum = new Map<string, GalleryMedia[]>()
    const photoUrlById = new Map<string, string>()
    for (const photo of albumPhotosResult.data ?? []) {
      if (!photo.album_id) continue
      if (!photosByAlbum.has(photo.album_id)) photosByAlbum.set(photo.album_id, [])
      photosByAlbum.get(photo.album_id)!.push({ url: photo.url })
      photoUrlById.set(photo.id, photo.url)
    }

    const albums = (albumsResult.data ?? [])
      .map(album => {
        const albumPhotos = photosByAlbum.get(album.id) ?? []
        // Cover tile is a plain <img>, never a playable video slot - prefer
        // the owner's explicitly chosen cover photo, then fall back to the
        // first still photo (never just the first item, which could be a video).
        const chosenCoverUrl = album.cover_photo_id ? photoUrlById.get(album.cover_photo_id) : undefined
        const chosenCover = chosenCoverUrl && !isVideoMedia(chosenCoverUrl) ? chosenCoverUrl : null
        const coverUrl = chosenCover ?? albumPhotos.find(p => !isVideoMedia(p.url))?.url ?? null
        return { ...album, coverUrl, photoCount: albumPhotos.length }
      })
      .filter(a => a.photoCount > 0)

    // Flat section: owner-managed gallery photos.
    const flatPhotos: GalleryMedia[] = (unsortedResult.data ?? []).map(p => ({ url: p.url }))

    const hasContent = albums.length > 0 || flatPhotos.length > 0
    const firstStillFlatPhoto = flatPhotos.find(p => !isVideoMedia(p.url))?.url ?? null
    const ctaImg = ctaSectionPhoto ?? albums[0]?.coverUrl ?? firstStillFlatPhoto ?? pickImg(imgs, 0)

    return (
      <>
        {/* Header */}
        <section className="py-10 px-8 bg-white" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <h1 className="text-xs font-black tracking-widest uppercase" style={{ color: primary }}>
              {galleryLabel}
            </h1>
            {hasContent && albums.length > 0 && (
              <span className="text-xs font-black" style={{ color: "#bbbbbb" }}>
                {albums.length} {albums.length === 1 ? albumLabel.singular.toLowerCase() : albumLabel.plural.toLowerCase()}
              </span>
            )}
          </div>
          <div className="max-w-6xl mx-auto">
            <div className="w-10 h-0.5 mt-4 mb-4" style={{ backgroundColor: primary }} />
            <p className="text-base max-w-xl" style={{ color: "#666666" }}>{galleryIntro}</p>
          </div>
        </section>

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
                          <img src={album.coverUrl} alt={album.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                        ) : (
                          <div style={{ width: "100%", height: "100%", backgroundColor: "#e8e8e8" }} />
                        )}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.72))" }} />
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 18px 18px" }}>
                          <p style={{ margin: "0 0 3px", fontSize: 16, fontWeight: 800, color: "white", letterSpacing: "-0.01em", lineHeight: 1.25 }}>{album.name}</p>
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
                <GalleryLightbox photos={flatPhotos} companyName={company.name} primary={primary} />
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
                Our work speaks for itself.
              </h2>
              <p className="text-base mb-3 leading-relaxed" style={{ color: "#555555" }}>We&apos;re adding our latest {albumLabel.plural.toLowerCase()}.</p>
              <p className="text-base mb-12 leading-relaxed" style={{ color: "#888888" }}>Check back soon — or reach out to see examples directly.</p>
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
      .select("id, url")
      .eq("company_id", company.id)
      .eq("in_gallery", true)
      .order("created_at", { ascending: false }),
  ])

  const ownerPhotos: GalleryMedia[] = (dashboardResult.data ?? []).map(p => ({ url: p.url }))
  const stockPhotos = (company.website_config?.stock_images as string[] | null) ?? imgs
  const allPhotos: (string | GalleryMedia)[] = ownerPhotos.length
    ? ownerPhotos
    : stockPhotos.filter(Boolean)
  const hasPhotos = allPhotos.length > 0
  const firstStillOwnerPhoto = ownerPhotos.find(p => !isVideoMedia(p.url))?.url ?? null
  const ctaImg = ctaSectionPhoto ?? firstStillOwnerPhoto ?? pickImg(imgs, 0)

  return (
    <>
      {/* Header */}
      <section className="py-10 px-8 bg-white" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xs font-black tracking-widest uppercase" style={{ color: primary }}>
            {galleryLabel}
          </h1>
        </div>
        <div className="max-w-6xl mx-auto">
          <div className="w-10 h-0.5 mt-4 mb-4" style={{ backgroundColor: primary }} />
          <p className="text-base max-w-xl" style={{ color: "#666666" }}>{galleryIntro}</p>
        </div>
      </section>

      {hasPhotos ? (
        <>
          <section className="bg-white pt-1 pb-10">
            <GalleryLightbox photos={allPhotos} companyName={company.name} primary={primary} />
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
              Our work speaks for itself.
            </h2>
            <p className="text-base mb-3 leading-relaxed" style={{ color: "#555555" }}>We&apos;re documenting our latest projects.</p>
            <p className="text-base mb-12 leading-relaxed" style={{ color: "#888888" }}>Check back soon — or reach out to see examples directly.</p>
            <Link href={ctaHref} className="btn text-white" style={{ backgroundColor: primary, borderColor: primary }}>{ctaLabel}</Link>
          </div>
        </section>
      )}
    </>
  )
}
