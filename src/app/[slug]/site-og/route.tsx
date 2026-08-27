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

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "80px",
        background: "#111111",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ width: 64, height: 4, background: primary, marginBottom: 32, borderRadius: 2 }} />
      <div
        style={{
          fontSize: 80,
          fontWeight: 900,
          color: "#ffffff",
          lineHeight: 1,
          marginBottom: 20,
        }}
      >
        {name}
      </div>
      {location && (
        <div style={{ fontSize: 32, color: "#888888", marginBottom: 40 }}>
          {location}
        </div>
      )}
      <div style={{ fontSize: 18, color: "#444444", letterSpacing: "3px", textTransform: "uppercase" }}>
        Powered by Found
      </div>
    </div>,
    { ...OG_SIZE },
  )
}
