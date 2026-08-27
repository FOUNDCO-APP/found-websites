import { ImageResponse } from "next/og"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"

export const runtime = "nodejs"
const OG_SIZE = { width: 1200, height: 630 }

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  const name = company?.name || "Found"
  const city = company?.city || ""
  const state = company?.state || ""
  const primary = company?.primary_color || "#1EAB46"
  const location = [city, state].filter(Boolean).join(", ")
  const config = company?.website_config
  const heroImage = config?.hero_image_url || config?.hero_images?.[0] || company?.logo_url || config?.site_icon_url || null

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        position: "relative",
        background: "#f7f7f4",
        fontFamily: "sans-serif",
      }}
    >
      {heroImage && (
        <img
          src={heroImage}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: 1200,
            height: 630,
            objectFit: "cover",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.48) 48%, rgba(0,0,0,0.12) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 64,
          display: "flex",
          flexDirection: "column",
        }}
      >
      <div style={{ width: 64, height: 5, background: primary, marginBottom: 28, borderRadius: 3 }} />
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: "#ffffff",
          lineHeight: 1,
          marginBottom: 18,
        }}
      >
        {name}
      </div>
      {location && (
        <div style={{ fontSize: 30, color: "#ffffff", opacity: 0.88, marginBottom: 30 }}>
          {location}
        </div>
      )}
      <div style={{ fontSize: 16, color: "#ffffff", opacity: 0.56, letterSpacing: "3px", textTransform: "uppercase" }}>
        Powered by Found
      </div>
      </div>
    </div>,
    { ...OG_SIZE },
  )
}
