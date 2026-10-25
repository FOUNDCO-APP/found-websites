import { getAvailablePrimaryActions, getSiteCTAs } from "./industryCTAs"

export type HighlightLinkCompany = {
  industry_category: string | null
  phone?: string | null
  booking_cta_label?: string | null
}

const PUBLIC_PAGES = new Set(["/", "/about", "/services", "/contact", "/gallery"])

export function validateHighlightHref(value: unknown, company: HighlightLinkCompany, activeAddons: string[] = []): string | null {
  if (typeof value !== "string") return null
  if (/[\u0000-\u001f\u007f-\u009f\\]/.test(value)) return null
  const href = value.trim()
  if (!href || href.length > 2048 || /[\u0000-\u0020\u007f-\u009f\\]/.test(href)) return null
  let decoded = href
  try {
    for (let pass = 0; pass < href.length; pass++) {
      const next = decodeURIComponent(decoded)
      if (/[\u0000-\u001f\u007f-\u009f\\]/.test(next)) return null
      if (next === decoded) break
      decoded = next
    }
  } catch { return null }
  if (href.startsWith("//") || decoded.startsWith("//")) return null
  if (/^tel:/i.test(href)) return /^tel:\+?[0-9().-]+$/i.test(href) && /[0-9]/.test(href) ? href : null
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href)
      return url.hostname && !url.username && !url.password ? href : null
    } catch { return null }
  }
  if (!href.startsWith("/") || /%[0-9a-f]{2}/i.test(href.split(/[?#]/)[0])) return null
  const pathname = href.split(/[?#]/)[0]
  if (PUBLIC_PAGES.has(pathname)) return href
  const actions = getAvailablePrimaryActions(company.industry_category ?? "", activeAddons, company.phone ?? null, company.booking_cta_label ?? null)
  const allowed = actions.map(action => getSiteCTAs({ ...company, industry_category: company.industry_category ?? "", phone: company.phone ?? null,
    primary_intent: "content", primary_action_override: action.key }, activeAddons).primary.href)
  return allowed.includes(pathname) ? href : null
}

export function resolveHighlightHref(value: unknown, company: HighlightLinkCompany, activeAddons: string[] = [], fallback = "/contact"): string {
  return validateHighlightHref(value, company, activeAddons)
    ?? validateHighlightHref(fallback, company, activeAddons) ?? "/contact"
}
