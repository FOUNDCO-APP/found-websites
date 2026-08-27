export type SiteIconAssetUrls = {
  site_icon_url: string
  favicon_ico_url: string
  favicon_16_url: string
  favicon_32_url: string
  favicon_48_url: string
  apple_touch_icon_url: string
  pwa_icon_192_url: string
  pwa_icon_512_url: string
}

type NullableSiteIconAssetUrls = {
  [Key in keyof SiteIconAssetUrls]?: SiteIconAssetUrls[Key] | null
}

export function pickSiteIconUrl(
  config: NullableSiteIconAssetUrls | null | undefined,
  size: number,
  format?: string | null,
) {
  if (!config) return null
  if (format === "ico") return config.favicon_ico_url ?? null
  if (size <= 16) return config.favicon_16_url ?? config.favicon_32_url ?? config.favicon_ico_url ?? null
  if (size <= 32) return config.favicon_32_url ?? config.favicon_16_url ?? config.favicon_ico_url ?? null
  if (size <= 48) return config.favicon_48_url ?? config.favicon_32_url ?? config.favicon_ico_url ?? null
  if (size <= 180) return config.apple_touch_icon_url ?? config.pwa_icon_192_url ?? null
  if (size <= 192) return config.pwa_icon_192_url ?? config.apple_touch_icon_url ?? null
  return config.pwa_icon_512_url ?? config.pwa_icon_192_url ?? config.apple_touch_icon_url ?? null
}

export function contentTypeForSiteIconUrl(url: string, format?: string | null) {
  if (format === "ico" || /\.ico(?:\?|$)/i.test(url)) return "image/x-icon"
  if (/\.svg(?:\?|$)/i.test(url)) return "image/svg+xml"
  if (/\.webp(?:\?|$)/i.test(url)) return "image/webp"
  if (/\.jpe?g(?:\?|$)/i.test(url)) return "image/jpeg"
  return "image/png"
}
