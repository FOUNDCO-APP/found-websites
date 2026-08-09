import { ImageResponse } from "next/og"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import { isVideoMedia } from "@/lib/mediaKind"

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
  const logo = company.logo_white_url || company.logo_url

  const { data: photos } = album
    ? await admin
      .from("company_photos")
      .select("url")
      .eq("company_id", company.id)
      .eq("album_id", album.id)
      .order("created_at", { ascending: true })
      .limit(5)
    : { data: [] }

  // OG images are always static - next/og can't render a video element, so
  // a video happening to be the first upload would silently break the
  // whole link preview. Skip forward to the first real still photo.
  // company_photos has no mime_type column - isVideoMedia falls back to
  // the URL's file extension.
  const stillPhoto = ((photos ?? []) as Array<{ url: string }>)
    .find(photo => photo.url && !isVideoMedia(photo.url))
  const cover = stillPhoto?.url || company.logo_url || undefined

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
            opacity: 1,
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.28) 38%, rgba(0,0,0,0.08) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.04) 48%, rgba(0,0,0,0.36) 100%)" }} />

      <div style={{ position: "absolute", left: 74, top: 70, display: "flex", alignItems: "center" }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" style={{ width: 560, maxHeight: 190, objectFit: "contain", objectPosition: "left center" }} />
        ) : (
          <div style={{ display: "flex", fontSize: 76, fontWeight: 900, letterSpacing: 5, textTransform: "uppercase", color: "white" }}>{company.name}</div>
        )}
      </div>
    </div>,
    { ...size },
  )
}
