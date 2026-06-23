import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStockImages, pickImg } from "@/lib/stockImages"
import { intentLabel, intentHref } from "@/types/company"
import GalleryLightbox from "@/components/GalleryLightbox"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { getSiteCopy } from "@/lib/siteCopy"
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

  const supabase = await createClient()
  const admin = createAdminClient()

  const plan = company.plan ?? null
  const status = company.subscription_status ?? null
  const isPro = (plan === "found_pro" || plan === "found_business") && (status === "active" || status === "trialing")

  const primary = company.primary_color
  const imgs = await getStockImages(company)
  const vocab = getVocab(company.sub_industry ?? null, company.industry_category)
  const galleryLabel = vocab.galleryLabel
  const ctaLabel = intentLabel[company.primary_intent] || "Contact Us"
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"
  const ctaImg = pickImg(imgs, 0)
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
    const [albumsResult, albumPhotosResult, unsortedResult, mediaResult] = await Promise.all([
      admin.from("photo_albums").select("id, name, slug").eq("company_id", company.id).order("created_at", { ascending: false }),
      admin.from("company_photos").select("id, url, album_id").eq("company_id", company.id).not("album_id", "is", null).order("created_at", { ascending: true }),
      admin.from("company_photos").select("id, url").eq("company_id", company.id).eq("for_website", true).is("album_id", null).order("created_at", { ascending: false }),
      supabase.from("media").select("id, url, thumbnail_url").eq("company_id", company.id).eq("website_flag", true).eq("type", "photo"),
    ])

    // Group album photos by album_id
    const photosByAlbum = new Map<string, string[]>()
    for (const photo of albumPhotosResult.data ?? []) {
      if (!photo.album_id) continue
      if (!photosByAlbum.has(photo.album_id)) photosByAlbum.set(photo.album_id, [])
      photosByAlbum.get(photo.album_id)!.push(photo.url)
    }

    const albums = (albumsResult.data ?? [])
      .map(album => ({
        ...album,
        coverUrl: photosByAlbum.get(album.id)?.[0] ?? null,
        photoCount: photosByAlbum.get(album.id)?.length ?? 0,
      }))
      .filter(a => a.photoCount > 0)

    // Flat section: hearted but unsorted + legacy media
    const unsortedUrls = (unsortedResult.data ?? []).map(p => p.url)
    const legacyUrls = (mediaResult.data ?? []).map(p => p.thumbnail_url || p.url).filter(u => !unsortedUrls.includes(u))
    const flatPhotos = [...unsortedUrls, ...legacyUrls]

    const hasContent = albums.length > 0 || flatPhotos.length > 0

    return (
      <>
        {/* Header */}
        <section className="py-10 px-8 bg-white" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <h1 className="text-xs font-black tracking-widest uppercase" style={{ color: primary }}>
              {galleryLabel}
            </h1>
            {hasContent && (
              <span className="text-xs font-black" style={{ color: "#bbbbbb" }}>
                {albums.length > 0
                  ? `${albums.length} ${albums.length === 1 ? "project" : "projects"}`
                  : `${flatPhotos.length} ${flatPhotos.length === 1 ? "photo" : "photos"}`}
              </span>
            )}
          </div>
          <div className="max-w-6xl mx-auto">
            <div className="w-10 h-0.5 mt-4" style={{ backgroundColor: primary }} />
          </div>
        </section>

        {hasContent ? (
          <>
            {/* Album cover grid */}
            {albums.length > 0 && (
              <section className="bg-white py-8 px-8">
                <div className="max-w-6xl mx-auto" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {albums.map(album => (
                    <Link key={album.id} href={`/${slug}/gallery/${album.slug}`} style={{ textDecoration: "none", display: "block" }}>
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

            {/* Unsorted + legacy photos */}
            {flatPhotos.length > 0 && (
              <section className="bg-white pt-2">
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
              <p className="text-base mb-3 leading-relaxed" style={{ color: "#555555" }}>We&apos;re documenting our latest projects.</p>
              <p className="text-base mb-12 leading-relaxed" style={{ color: "#888888" }}>Check back soon — or reach out to see examples directly.</p>
              <Link href={ctaHref} className="btn text-white" style={{ backgroundColor: primary, borderColor: primary }}>{ctaLabel}</Link>
            </div>
          </section>
        )}
      </>
    )
  }

  // ── Base plan: flat grid (unchanged) ─────────────────────────────────────
  const [mediaResult, dashboardResult] = await Promise.all([
    supabase
      .from("media")
      .select("id, url, thumbnail_url, type")
      .eq("company_id", company.id)
      .eq("website_flag", true)
      .eq("type", "photo")
      .order("gallery_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    admin
      .from("company_photos")
      .select("id, url")
      .eq("company_id", company.id)
      .eq("for_website", true)
      .order("created_at", { ascending: false }),
  ])

  const dashUrls = (dashboardResult.data ?? []).map(p => p.url)
  const mediaUrls = (mediaResult.data ?? []).map(p => p.thumbnail_url || p.url).filter(u => !dashUrls.includes(u))
  const ownerPhotos = [...dashUrls, ...mediaUrls]
  const stockPhotos = (company.website_config?.stock_images as string[] | null) ?? imgs
  const allPhotos: string[] = [...ownerPhotos, ...stockPhotos.filter(url => !ownerPhotos.includes(url))]
  const hasPhotos = allPhotos.length > 0

  return (
    <>
      {/* Header */}
      <section className="py-10 px-8 bg-white" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xs font-black tracking-widest uppercase" style={{ color: primary }}>
            {galleryLabel}
          </h1>
          {hasPhotos && (
            <span className="text-xs font-black" style={{ color: "#bbbbbb" }}>
              {allPhotos.length} {allPhotos.length === 1 ? "photo" : "photos"}
            </span>
          )}
        </div>
        <div className="max-w-6xl mx-auto">
          <div className="w-10 h-0.5 mt-4" style={{ backgroundColor: primary }} />
        </div>
      </section>

      {hasPhotos ? (
        <>
          <section className="bg-white pt-1">
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
