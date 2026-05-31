import { ImageResponse } from "next/og"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default async function Icon({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  const primary = company?.primary_color || "#111111"
  const initial = (company?.name || "F").charAt(0).toUpperCase()

  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        background: primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
      }}
    >
      <span style={{ color: "#ffffff", fontSize: 18, fontWeight: 900, lineHeight: 1 }}>
        {initial}
      </span>
    </div>,
    { ...size }
  )
}
