import { NextResponse } from "next/server"
import { getCompanyByDomain, getCompanyBySlug } from "@/lib/company"
import { contentTypeForSiteIconUrl, pickSiteIconUrl } from "@/lib/siteIconAssets"

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
  const fontSize = mark.length === 1 ? 108 : 82

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <rect width="180" height="180" rx="30" fill="${color}"/>
  <text x="90" y="92" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" fill="white">${mark}</text>
</svg>`
}

function iconSize(request: Request) {
  const raw = new URL(request.url).searchParams.get("size")
  if (raw === "16") return 16
  if (raw === "32") return 32
  if (raw === "48") return 48
  if (raw === "180") return 180
  if (raw === "192") return 192
  if (raw === "512") return 512
  return 180
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  const size = iconSize(request)
  const format = new URL(request.url).searchParams.get("format")
  const siteIconUrl = pickSiteIconUrl(company?.website_config, size, format)

  // The tenant <head> appends ?v=<generated-at> to every icon URL, so a
  // versioned request is a permanent fingerprint - cache it hard and let a
  // new icon (new ?v=) be a new URL.
  //
  // An UNVERSIONED request is the bare well-known path (/favicon.ico,
  // /apple-touch-icon.png) that iOS Safari hits by convention regardless of
  // the <head>. Its cache key never changes, so any cached copy - at the
  // Vercel edge OR in iOS's own favicon store - goes permanently stale on
  // the next icon change. It must never be cached: no-store, always current.
  const hasVersion = new URL(request.url).searchParams.has("v")
  const cacheControl = hasVersion
    ? "public, max-age=31536000, immutable"
    : "no-store, must-revalidate"

  if (siteIconUrl) {
    const response = await fetch(siteIconUrl, { cache: "no-store" })
    if (response.ok) {
      return new Response(response.body, {
        headers: {
          "Content-Type": contentTypeForSiteIconUrl(siteIconUrl, format),
          "Cache-Control": cacheControl,
        },
      })
    }
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
