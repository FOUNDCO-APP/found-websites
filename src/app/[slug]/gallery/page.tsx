import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createClient } from "@/lib/supabase/server"
import { getStockImages, pickImg } from "@/lib/stockImages"
import { intentLabel, intentHref } from "@/types/company"
import GalleryLightbox from "@/components/GalleryLightbox"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  return { title: company ? `Our Work — ${company.name}` : "Gallery" }
}

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const supabase = await createClient()
  const { data: photos } = await supabase
    .from("media")
    .select("id, url, thumbnail_url, type")
    .eq("company_id", company.id)
    .eq("website_flag", true)
    .eq("type", "photo")
    .order("gallery_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  const primary = company.primary_color
  const imgs = await getStockImages(company)
  const galleryLabel = getIndustryDefaults(company.industry_category).galleryLabel

  const ctaLabel = intentLabel[company.primary_intent] || "Contact Us"
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"

  // Real photos take priority; fall back to stock
  const allPhotos: string[] = photos && photos.length > 0
    ? photos.map(p => p.thumbnail_url || p.url)
    : imgs

  const hasPhotos = allPhotos.length > 0
  const ctaImg = pickImg(imgs, 0)

  return (
    <>
      {/* ── Header — minimal, lets the photos do the talking ── */}
      <section className="py-10 px-8 bg-white" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1
            className="text-xs font-black tracking-widest uppercase"
            style={{ color: primary }}
          >
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
          {/* ── Masonry grid + lightbox ── */}
          <section className="bg-white pt-1">
            <GalleryLightbox
              photos={allPhotos}
              companyName={company.name}
              primary={primary}
            />
          </section>

          {/* ── Final CTA ── */}
          <section className="relative py-24 text-center overflow-hidden">
            {ctaImg ? (
              <>
                <img src={ctaImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/65" />
              </>
            ) : (
              <div className="absolute inset-0" style={{ backgroundColor: "#111111" }} />
            )}
            <div className="relative z-10 px-8">
              <div className="w-10 h-1 mx-auto mb-8" style={{ backgroundColor: primary }} />
              <h2
                className="text-3xl md:text-4xl font-black text-white mb-4"
                style={{ fontFamily: "var(--font-heading, inherit)" }}
              >
                Ready to get started?
              </h2>
              <p className="mb-10 text-base" style={{ color: "#cccccc" }}>
                Let&apos;s talk about your project.
              </p>
              <Link href={ctaHref} className="btn text-white"
                style={{ backgroundColor: primary, borderColor: primary }}>
                {ctaLabel}
              </Link>
            </div>
          </section>
        </>
      ) : (
        /* ── Empty state ── */
        <section className="py-40 px-8 text-center bg-white">
          <div className="max-w-md mx-auto">
            <div className="w-12 h-1 mx-auto mb-12" style={{ backgroundColor: primary }} />
            <h2
              className="text-4xl font-black mb-5"
              style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}
            >
              Our work speaks for itself.
            </h2>
            <p className="text-base mb-3 leading-relaxed" style={{ color: "#555555" }}>
              We&apos;re documenting our latest projects.
            </p>
            <p className="text-base mb-12 leading-relaxed" style={{ color: "#888888" }}>
              Check back soon — or reach out to see examples directly.
            </p>
            <Link href={ctaHref} className="btn text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {ctaLabel}
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
