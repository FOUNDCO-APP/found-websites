import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import Link from "next/link"
import type { Metadata } from "next"
import { albumLabelFor } from "@/lib/dashboard/typography"
import { getPublicSiteOrigin } from "@/lib/siteUrl"

type AlbumPageRow = {
  id: string
  name: string
  slug: string
  album_type?: string | null
  customer_name?: string | null
  service_address?: string | null
  created_at: string
}

function albumContext(album: Pick<AlbumPageRow, "customer_name" | "service_address">) {
  return [album.customer_name, album.service_address].filter(Boolean).join(" · ")
}

function absoluteImageUrl(url: string | undefined, origin: string) {
  if (!url) return undefined
  if (/^https?:\/\//i.test(url)) return url
  return new URL(url, origin).toString()
}

function albumSlugFromName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; album: string }> }): Promise<Metadata> {
  const { slug, album: albumSlug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) return { title: "Gallery" }

  const admin = createAdminClient()
  let { data: album } = await admin
    .from("photo_albums")
    .select("id, name, customer_name, service_address")
    .eq("company_id", company.id)
    .eq("slug", albumSlug)
    .maybeSingle()

  if (!album) {
    const { data: matches } = await admin
      .from("photo_albums")
      .select("id, name, customer_name, service_address")
      .eq("company_id", company.id)
    album = matches?.find(row => albumSlugFromName(row.name) === albumSlug) ?? null
  }

  const { data: cover } = album
    ? await admin
      .from("company_photos")
      .select("url")
      .eq("company_id", company.id)
      .eq("album_id", album.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    : { data: null }

  const albumLabel = albumLabelFor(company.industry_category)
  const title = album ? `${album.name} - ${company.name}` : `${albumLabel.plural} - ${company.name}`
  const context = album ? albumContext(album) : ""
  const description = context ? `${context}. Photos shared by ${company.name}.` : `Photos shared by ${company.name}.`
  const origin = getPublicSiteOrigin(company.slug, company.website_config?.custom_domain)
  const url = `${origin}/gallery/${albumSlug}`
  const image = absoluteImageUrl(cover?.url || company.logo_url || undefined, origin)

  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: company.name,
      type: "website",
      ...(image && { images: [{ url: image, alt: album?.name ?? company.name, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image && { images: [image] }),
    },
  }
}

export default async function ClientAlbumPage({ params }: { params: Promise<{ slug: string; album: string }> }) {
  const { slug, album: albumSlug } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const admin = createAdminClient()

  let { data: album } = await admin
    .from("photo_albums")
    .select("id, name, slug, album_type, customer_name, service_address, created_at")
    .eq("company_id", company.id)
    .eq("slug", albumSlug)
    .maybeSingle<AlbumPageRow>()

  if (!album) {
    const { data: matches } = await admin
      .from("photo_albums")
      .select("id, name, slug, album_type, customer_name, service_address, created_at")
      .eq("company_id", company.id)
    album = matches?.find(row => albumSlugFromName(row.name) === albumSlug) ?? null
  }

  if (!album) notFound()

  const { data: photos } = await admin
    .from("company_photos")
    .select("id, url, created_at")
    .eq("company_id", company.id)
    .eq("album_id", album.id)
    .order("created_at", { ascending: true })

  const allPhotos = photos ?? []
  const primary = company.primary_color ?? "#32D074"
  const albumDate = new Date(album.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const albumLabel = albumLabelFor(company.industry_category)
  const isJob = album.album_type === "job"
  const context = albumContext(album)
  const ctaLabel = isJob ? `Ask about this ${albumLabel.singular.toLowerCase()}` : "Contact Us"

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fafafa", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Header */}
      <header style={{ backgroundColor: "white", borderBottom: "1px solid #f0f0f0", padding: "34px 32px 30px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <div style={{ maxWidth: 620 }}>
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#999" }}>
                {company.name}
              </p>
              <h1 style={{ margin: "0 0 8px", fontSize: "clamp(34px, 8vw, 58px)", lineHeight: 0.98, fontWeight: 800, color: "#111", letterSpacing: "-0.04em" }}>
                {album.name}
              </h1>
              {context && (
                <p style={{ margin: "0 0 8px", fontSize: 15, color: "#777", fontWeight: 650, lineHeight: 1.35 }}>
                  {context}
                </p>
              )}
              <p style={{ margin: 0, fontSize: 13, color: "#aaa", fontWeight: 600 }}>
                {allPhotos.length} photo{allPhotos.length !== 1 ? "s" : ""} · {albumDate}
              </p>
            </div>
            <Link href="/contact" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "12px 22px", borderRadius: 100,
              backgroundColor: primary, textDecoration: "none",
              fontSize: 13, fontWeight: 700, color: "white",
            }}>
              {ctaLabel}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
          <div style={{ height: 3, width: 40, borderRadius: 2, backgroundColor: primary, marginTop: 22 }}/>
        </div>
      </header>

      {/* Photo grid */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 64px" }}>
        {allPhotos.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <p style={{ fontSize: 20, fontWeight: 300, color: "#333", marginBottom: 8 }}>Photos coming soon.</p>
            <p style={{ fontSize: 14, color: "#aaa" }}>Check back shortly as we add photos to this {albumLabel.singular.toLowerCase()}.</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))",
            gap: 5,
          }}>
            {allPhotos.map(photo => (
              <div key={photo.id} style={{ borderRadius: 10, overflow: "hidden", aspectRatio: "1", backgroundColor: "#eee" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #ebebeb", padding: "24px 32px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 11, color: "#ccc", fontWeight: 600, letterSpacing: "0.08em" }}>
          Shared via <span style={{ color: "#999" }}>FOUND</span>
        </p>
      </footer>

    </div>
  )
}
