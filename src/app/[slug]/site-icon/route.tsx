import { ImageResponse } from "next/og"
import { getCompanyByDomain, getCompanyBySlug } from "@/lib/company"

export const runtime = "edge"

function initials(name: string) {
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return "F"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function readableAccent(hex: string | null | undefined) {
  const fallback = "#30D158"
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return fallback
  return hex
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) {
    return new ImageResponse(
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#080A09",
        color: "#FFFFFF",
        fontSize: 94,
        fontWeight: 900,
      }}>
        F
      </div>,
      { width: 180, height: 180 },
    )
  }

  const accent = readableAccent(company.primary_color)
  const mark = initials(company.name)

  return new ImageResponse(
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#FFFFFF",
      border: `10px solid ${accent}`,
    }}>
      {company.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={company.logo_url}
          alt=""
          style={{
            width: 138,
            height: 138,
            objectFit: "contain",
          }}
        />
      ) : (
        <div style={{
          width: 118,
          height: 118,
          borderRadius: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: accent,
          color: "#FFFFFF",
          fontSize: mark.length === 1 ? 78 : 62,
          fontWeight: 900,
          letterSpacing: 0,
        }}>
          {mark}
        </div>
      )}
    </div>,
    {
      width: 180,
      height: 180,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  )
}
