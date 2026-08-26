import { NextResponse } from "next/server"
import { getCompanyByDomain, getCompanyBySlug } from "@/lib/company"

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
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "#30D158"
  return hex
}

function fallbackSvg(name: string, color: string) {
  const mark = initials(name)
  const fontSize = mark.length === 1 ? 76 : 58

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="180" height="180" rx="34" fill="white"/>
  <rect x="12" y="12" width="156" height="156" rx="24" fill="${color}"/>
  <text x="90" y="112" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" fill="white">${mark}</text>
</svg>`
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  const siteIconUrl = company?.website_config?.site_icon_url || company?.logo_url

  if (siteIconUrl) {
    return NextResponse.redirect(siteIconUrl, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  }

  const name = company?.name ?? "Found"
  const svg = fallbackSvg(name, readableAccent(company?.primary_color))

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
