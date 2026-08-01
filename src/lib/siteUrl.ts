const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

export function getPublicSiteOrigin(slug: string, customDomain?: string | null): string {
  const domain = customDomain
    ?.trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase()

  return domain ? `https://${domain}` : `https://${slug}.${ROOT_DOMAIN}`
}
