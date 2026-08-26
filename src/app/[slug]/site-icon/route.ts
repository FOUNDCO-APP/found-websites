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

function iconSize(request: Request) {
  const raw = new URL(request.url).searchParams.get("size")
  if (raw === "32") return 32
  if (raw === "180") return 180
  if (raw === "192") return 192
  if (raw === "512") return 512
  return 180
}

async function squarePngFromImageUrl(url: string, size: number) {
  const sharp = (await import("sharp")).default
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error(`Icon source returned ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())

  return sharp(bytes, { animated: false })
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
      withoutEnlargement: false,
    })
    .png()
    .toBuffer()
}

async function squarePngFromFallback(name: string, color: string, size: number) {
  const sharp = (await import("sharp")).default
  return sharp(Buffer.from(fallbackSvg(name, color), "utf8"))
    .resize(size, size)
    .png()
    .toBuffer()
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  const siteIconUrl = company?.website_config?.site_icon_url || company?.logo_url
  const size = iconSize(request)

  if (siteIconUrl) {
    try {
      const png = await squarePngFromImageUrl(siteIconUrl, size)
      return new Response(new Uint8Array(png), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-store, max-age=0",
        },
      })
    } catch (error) {
      console.error("[site-icon] failed to normalize icon", error)
    }
  }

  const name = company?.name ?? "Found"
  const png = await squarePngFromFallback(name, readableAccent(company?.primary_color), size)

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
