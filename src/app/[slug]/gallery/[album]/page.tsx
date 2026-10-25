import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Metadata } from "next"
import { albumLabelFor } from "@/lib/dashboard/typography"
import { getPublicSiteOrigin } from "@/lib/siteUrl"
import AlbumPhotoGrid from "./AlbumPhotoGrid"
import JobLeadCapture from "./JobLeadCapture"
import GalleryLightbox from "@/components/GalleryLightbox"
import { resolveStockPhoto } from "@/lib/stockPhotoLibrary"
import { isSecurityGuardIndustry } from "@/lib/industryDetection"

const illustrativeCollection = "Illustrative Security Photography"
type AlbumPhoto = { id: string; url: string; created_at?: string | null }

type AlbumPageRow = {
  id: string
  name: string
  slug: string
  album_type?: string | null
  customer_name?: string | null
  service_address?: string | null
  show_address_public?: boolean | null
  created_at: string
}

function publicAlbumContext(album: Pick<AlbumPageRow, "customer_name" | "service_address" | "show_address_public">) {
  const name = album.customer_name?.trim() ?? ""
  const address = album.show_address_public ? album.service_address?.trim() ?? "" : ""
  return [name, address].filter(Boolean).join(" · ")
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

function displayAlbumName(album: Pick<AlbumPageRow, "name" | "album_type">, forceJob = false) {
  if (!forceJob && album.album_type !== "job") return album.name
  return album.name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase())
}

async function findAlbum(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  albumSlug: string,
  includeJobFields: boolean,
): Promise<AlbumPageRow | null> {
  const select = includeJobFields
    ? "id, name, slug, album_type, customer_name, service_address, show_address_public, created_at"
    : "id, name, slug, created_at"

  const direct = await admin
    .from("photo_albums")
    .select(select)
    .eq("company_id", companyId)
    .eq("show_on_website_gallery", true)
    .eq("slug", albumSlug)
    .maybeSingle<AlbumPageRow>()

  if (direct.error) return includeJobFields ? findAlbum(admin, companyId, albumSlug, false) : null
  if (direct.data) return direct.data as AlbumPageRow

  const matches = await admin
    .from("photo_albums")
    .select(select)
    .eq("company_id", companyId)
    .eq("show_on_website_gallery", true)

  if (matches.error) return includeJobFields ? findAlbum(admin, companyId, albumSlug, false) : null

  const rows = (matches.data ?? []) as unknown as AlbumPageRow[]
  return rows.find(row => albumSlugFromName(row.name) === albumSlug) ?? null
}

async function readAlbumPhotos(admin: ReturnType<typeof createAdminClient>, companyId: string, albumId: string): Promise<AlbumPhoto[]> {
  const { data, error } = await admin.from("company_photos").select("id, url, created_at")
    .eq("company_id", companyId).eq("album_id", albumId).order("created_at", { ascending: true })
  return error ? [] : data ?? []
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; album: string }> }): Promise<Metadata> {
  const { slug, album: albumSlug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) return { title: "Gallery" }

  const admin = createAdminClient()
  const album = await findAlbum(admin, company.id, albumSlug, true)
  if (!album) return { title: "Gallery" }
  const photos = await readAlbumPhotos(admin, company.id, album.id)
  const stockCount = photos.filter(photo => resolveStockPhoto(photo.url)).length
  const isStockOnly = stockCount > 0 && stockCount === photos.length
  const isGuard = company.industry_category === "professional_services" && isSecurityGuardIndustry(company.sub_industry)

  const albumLabel = albumLabelFor(company.industry_category)
  const albumName = isStockOnly ? isGuard ? illustrativeCollection : "Illustrative Photography" : displayAlbumName(album, albumLabel.singular === "Job")
  const title = `${albumName} - ${company.name}`
  const context = isStockOnly ? "" : publicAlbumContext(album)
  const description = isStockOnly
    ? "Illustrative stock photography, not the company's personnel, client properties, or completed work."
    : stockCount > 0
      ? `Photos shared by ${company.name}, with illustrative stock photography labeled separately.`
      : context ? `${context}. Photos shared by ${company.name}.` : `Photos shared by ${company.name}.`
  const origin = getPublicSiteOrigin(company.slug, company.website_config?.custom_domain)
  const url = `${origin}/gallery/${albumSlug}`
  const image = absoluteImageUrl(`/gallery/${albumSlug}/opengraph-image`, origin)

  return {
    metadataBase: new URL(origin),
    title: albumName,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: company.name,
      type: "website",
      ...(image && { images: [{ url: image, alt: albumName, width: 1200, height: 630 }] }),
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

  const album = await findAlbum(admin, company.id, albumSlug, true)

  if (!album) notFound()

  const allPhotos = await readAlbumPhotos(admin, company.id, album.id)
  const stockPhotos = allPhotos.filter(photo => resolveStockPhoto(photo.url))
  const otherPhotos = allPhotos.filter(photo => !resolveStockPhoto(photo.url))
  const hasStock = stockPhotos.length > 0
  const isStockOnly = hasStock && !otherPhotos.length
  const isGuard = company.industry_category === "professional_services" && isSecurityGuardIndustry(company.sub_industry)
  const collectionLabel = isGuard ? illustrativeCollection : "Illustrative Photography"
  const primary = company.primary_color ?? "#32D074"
  const albumDate = new Date(album.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const albumLabel = albumLabelFor(company.industry_category)
  const isJob = album.album_type === "job" || albumLabel.singular === "Job"
  const context = isStockOnly ? "" : publicAlbumContext(album)
  const albumName = isStockOnly ? collectionLabel : displayAlbumName(album, isJob)

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fafafa", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Header */}
      <header style={{ backgroundColor: "white", borderBottom: "1px solid #f0f0f0", padding: "34px 32px 30px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
            <div style={{ maxWidth: 620 }}>
              <h1 style={{ margin: "0 0 8px", fontSize: "clamp(34px, 8vw, 58px)", lineHeight: 0.98, fontWeight: 800, color: "#111", letterSpacing: "-0.04em" }}>
                {albumName}
              </h1>
              {hasStock && <p className="text-sm text-gray-600 mb-3">
                {isStockOnly ? "Illustrative stock, not our personnel, client properties, or completed work." : "Illustrative stock is grouped separately from shared photos; it does not show our personnel, client properties, or completed work."}
              </p>}
              {context && (
                <p style={{ margin: "0 0 8px", fontSize: 15, color: "#777", fontWeight: 650, lineHeight: 1.35 }}>
                  {context}
                </p>
              )}
              <p style={{ margin: 0, fontSize: 13, color: "#aaa", fontWeight: 600 }}>
                {allPhotos.length} photo{allPhotos.length !== 1 ? "s" : ""} · {albumDate}
              </p>
            </div>
            <JobLeadCapture
              companyId={company.id}
              businessName={company.name}
              subjectTitle={albumName}
              primaryColor={primary}
              ctaLabel={hasStock ? isGuard ? "Discuss your security needs" : "Contact Us" : isJob ? "Ask about a project like this" : "Ask about work like this"}
              requestType={hasStock ? "contact" : isJob ? "estimate_request" : "contact"}
              messagePrefix={hasStock ? isGuard ? "I'd like to discuss security needs related to" : "I'd like to discuss" : isJob ? "I'm interested in a project like" : "I'm interested in work like"}
            />
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
          hasStock ? <>
            {otherPhotos.length > 0 && <>
              <h2 className="text-xl font-black mb-5">Shared Photos</h2>
              <AlbumPhotoGrid photos={otherPhotos} />
            </>}
            <h2 className="text-xl font-black mt-8 mb-5">{collectionLabel}</h2>
            <GalleryLightbox photos={stockPhotos} companyName={company.name} primary={primary} />
          </> : <AlbumPhotoGrid photos={allPhotos} />
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
