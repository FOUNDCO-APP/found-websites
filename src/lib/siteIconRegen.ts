import type { SupabaseClient } from "@supabase/supabase-js"
import { generateAndUploadSiteIconAssets } from "@/lib/siteIconGeneration"

type IconSource = "custom" | "logo" | "initials"

type CompanyRow = {
  id: string
  name: string | null
  slug: string | null
  logo_url: string | null
  logo_white_url: string | null
  primary_color: string | null
  website_config:
    | {
        site_icon_url?: string | null
        site_icon_source?: IconSource | null
        site_icon_source_url?: string | null
      }
    | null
}

function iconInitials(name: string | null) {
  const words = String(name || "Found")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return "F"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function initialsSvg(name: string | null, color: string | null) {
  const mark = iconInitials(name)
  const accent = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#30D158"
  const fontSize = mark.length === 1 ? 108 : 82
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <rect width="180" height="180" rx="30" fill="${accent}"/>
  <text x="90" y="92" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" fill="white">${mark}</text>
</svg>`)
}

async function resolveSource(company: CompanyRow) {
  const config = company.website_config ?? {}
  const url =
    config.site_icon_source_url || config.site_icon_url || company.logo_url || company.logo_white_url
  if (url) {
    const res = await fetch(url, { cache: "no-store" })
    if (res.ok) {
      const configured = config.site_icon_source
      const type: IconSource =
        configured ||
        (url === company.logo_url || url === company.logo_white_url ? "logo" : "custom")
      return {
        source: Buffer.from(await res.arrayBuffer()),
        sourcePublicUrl: url,
        sourceType: type,
      }
    }
  }
  return {
    source: initialsSvg(company.name, company.primary_color),
    sourcePublicUrl: config.site_icon_url ?? null,
    sourceType: "initials" as IconSource,
  }
}

export type SiteIconRegenResult = {
  slug: string | null
  ok: boolean
  source?: IconSource
  error?: string
}

export async function regenerateSiteIconsForCompany(
  admin: SupabaseClient,
  company: CompanyRow,
): Promise<SiteIconRegenResult> {
  try {
    const { source, sourcePublicUrl, sourceType } = await resolveSource(company)
    const assets = await generateAndUploadSiteIconAssets({
      admin,
      companyId: company.id,
      source,
      sourcePublicUrl: sourcePublicUrl ?? "",
      version: `regen-${Date.now()}`,
    })

    const now = new Date().toISOString()
    const { error } = await admin
      .from("website_config")
      .update({
        site_icon_url: sourcePublicUrl,
        site_icon_source: sourceType,
        site_icon_source_url: sourcePublicUrl,
        site_icon_generated_at: now,
        favicon_ico_url: assets.favicon_ico_url,
        favicon_16_url: assets.favicon_16_url,
        favicon_32_url: assets.favicon_32_url,
        favicon_48_url: assets.favicon_48_url,
        apple_touch_icon_url: assets.apple_touch_icon_url,
        pwa_icon_192_url: assets.pwa_icon_192_url,
        pwa_icon_512_url: assets.pwa_icon_512_url,
        updated_at: now,
      })
      .eq("company_id", company.id)
    if (error) throw new Error(error.message)

    return { slug: company.slug, ok: true, source: sourceType }
  } catch (err) {
    return {
      slug: company.slug,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export const SITE_ICON_REGEN_SELECT =
  "id,name,slug,logo_url,logo_white_url,primary_color,website_config(site_icon_url,site_icon_source,site_icon_source_url)"
