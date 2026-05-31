import { ImageResponse } from "next/og"
import { headers } from "next/headers"
import { getCompanyBySlug } from "@/lib/company"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

export default async function Icon() {
  const headersList = await headers()
  const host = headersList.get("host") || ""

  let primary = "#111111"
  let initial = "F"

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.replace(`.${ROOT_DOMAIN}`, "").replace("www.", "")
    const company = await getCompanyBySlug(slug)
    if (company) {
      primary = company.primary_color
      initial = company.name.charAt(0).toUpperCase()
    }
  }

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
      <span style={{ color: "#ffffff", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>
        {initial}
      </span>
    </div>,
    { ...size }
  )
}
