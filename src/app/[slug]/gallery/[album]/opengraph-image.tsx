import { ImageResponse } from "next/og"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import { albumLabelFor } from "@/lib/dashboard/typography"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

type AlbumRow = {
  id: string
  name: string
  slug: string
  album_type?: string | null
  customer_name?: string | null
  service_address?: string | null
}

function albumSlugFromName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
}

function displayAlbumName(album: Pick<AlbumRow, "name" | "album_type">, forceJob = false) {
  if (!forceJob && album.album_type !== "job") return album.name
  return album.name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase())
}

function hexOrFallback(color: string | null | undefined, fallback = "#30D158") {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return fallback
  const normalized = color.toUpperCase()
  return normalized === "#000000" || normalized === "#111111" || normalized === "#212121" ? fallback : color
}

async function findAlbum(admin: ReturnType<typeof createAdminClient>, companyId: string, albumSlug: string) {
  const select = "id, name, slug, album_type, customer_name, service_address"

  const direct = await admin
    .from("photo_albums")
    .select(select)
    .eq("company_id", companyId)
    .eq("slug", albumSlug)
    .maybeSingle<AlbumRow>()

  if (direct.data) return direct.data as AlbumRow

  const matches = await admin
    .from("photo_albums")
    .select(select)
    .eq("company_id", companyId)

  const rows = (matches.data ?? []) as unknown as AlbumRow[]
  return rows.find(row => albumSlugFromName(row.name) === albumSlug) ?? null
}

export default async function AlbumOgImage({ params }: { params: Promise<{ slug: string; album: string }> }) {
  const { slug, album: albumSlug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) {
    return new ImageResponse(
      <div style={{ width: 1200, height: 630, background: "#080A09", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, fontWeight: 800 }}>
        Found
      </div>,
      { ...size },
    )
  }

  const admin = createAdminClient()
  const album = await findAlbum(admin, company.id, albumSlug)
  const albumLabel = albumLabelFor(company.industry_category)
  const isJob = album?.album_type === "job" || albumLabel.singular === "Job"
  const title = album ? displayAlbumName(album, isJob) : albumLabel.plural
  const context = album ? [album.customer_name, album.service_address].filter(Boolean).join(" - ") : ""
  const accent = hexOrFallback(company.accent_color_1 || company.primary_color)
  const logo = company.logo_white_url || company.logo_url

  const { data: photos } = album
    ? await admin
      .from("company_photos")
      .select("url")
      .eq("company_id", company.id)
      .eq("album_id", album.id)
      .order("created_at", { ascending: true })
      .limit(3)
    : { data: [] }

  const photoUrls = ((photos ?? []) as Array<{ url: string }>).map(photo => photo.url).filter(Boolean)
  const cover = photoUrls[0] || company.logo_url || undefined

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        position: "relative",
        display: "flex",
        overflow: "hidden",
        background: "#070908",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.32,
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.58)" }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, background: accent }} />

      <div style={{ position: "relative", display: "flex", flex: 1, padding: 76, gap: 52, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1.08, minWidth: 0 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" style={{ width: 260, maxHeight: 86, objectFit: "contain", objectPosition: "left center", marginBottom: 48 }} />
          ) : (
            <div style={{ display: "flex", fontSize: 34, fontWeight: 900, letterSpacing: 5, textTransform: "uppercase", marginBottom: 48 }}>{company.name}</div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", width: 54, height: 4, borderRadius: 4, background: accent }} />
            <div style={{ display: "flex", fontSize: 20, fontWeight: 900, letterSpacing: 5, textTransform: "uppercase", color: accent }}>
              {isJob ? "Job Photos" : "Photo Gallery"}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: title.length > 32 ? 62 : 76, lineHeight: 0.96, fontWeight: 900, letterSpacing: 0, marginBottom: 22 }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 30, lineHeight: 1.25, color: "rgba(255,255,255,0.76)", fontWeight: 650 }}>
            {context || `Shared by ${company.name}`}
          </div>
        </div>

        <div style={{ width: 390, height: 430, display: "flex", gap: 14 }}>
          {photoUrls.length > 0 && (
            <div style={{ display: "flex", flex: 1.25, borderRadius: 34, overflow: "hidden", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          {photoUrls.length > 0 && (
            <div style={{ flex: 0.9, display: "flex", flexDirection: "column", gap: 14 }}>
              {[photoUrls[1], photoUrls[2]].map((url, index) => (
                <div key={index} style={{ display: "flex", flex: 1, borderRadius: 28, overflow: "hidden", border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.08)" }}>
                  {url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
              ))}
            </div>
          )}
          {photoUrls.length === 0 && (
            <div style={{ flex: 1, borderRadius: 34, border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.55)", fontSize: 30, fontWeight: 800 }}>
              Photos
            </div>
          )}
        </div>
      </div>
    </div>,
    { ...size },
  )
}
