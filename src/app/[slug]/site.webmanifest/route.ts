import { NextResponse } from "next/server"
import { getCompanyByDomain, getCompanyBySlug } from "@/lib/company"
import { getPublicSiteOrigin } from "@/lib/siteUrl"

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const config = company.website_config
  const origin = getPublicSiteOrigin(company.slug, config?.custom_domain)
  const iconVersion = config?.updated_at ? `?v=${encodeURIComponent(config.updated_at)}` : ""
  const iconSrc = `/site-icon${iconVersion}`

  return NextResponse.json(
    {
      name: company.name,
      short_name: company.name,
      start_url: origin,
      scope: origin,
      display: "standalone",
      background_color: "#080A09",
      theme_color: company.primary_color || "#30D158",
      icons: [
        { src: iconSrc, sizes: "192x192", purpose: "any" },
        { src: iconSrc, sizes: "512x512", purpose: "any" },
        { src: iconSrc, sizes: "512x512", purpose: "maskable" },
      ],
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "application/manifest+json; charset=utf-8",
      },
    },
  )
}
