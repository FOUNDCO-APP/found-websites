// Shared "which URL do we show/share for this business" logic. Any link an
// owner shares with a real customer (native share, SMS, copy link) should
// use their connected custom domain once they have one - not the
// foundco.app subdomain, which still works but isn't the branded address
// the owner told their customers to visit.
export function getPublicSiteOrigin(slug: string, customDomain?: string | null): string {
  const domain = customDomain?.trim()
  return domain ? `https://${domain}` : `https://${slug}.foundco.app`
}
