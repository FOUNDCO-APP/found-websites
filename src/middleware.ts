import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? ""
  const hostname = host.split(":")[0]
  const { pathname } = req.nextUrl

  const APP_DOMAIN = `my.${ROOT_DOMAIN}`
  const ADMIN_DOMAIN = `admin.${ROOT_DOMAIN}`
  const isDashboard = hostname === APP_DOMAIN
  const isAdmin = hostname === ADMIN_DOMAIN
  const isRootHost =
    hostname === ROOT_DOMAIN ||
    hostname === `www.${ROOT_DOMAIN}` ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  const isFoundOwnedHost = isRootHost || isDashboard || isAdmin

  if (
    isFoundOwnedHost &&
    (pathname.startsWith("/icons/") || pathname === "/dashboard-manifest.json")
  ) {
    return NextResponse.next()
  }

  if (isAdmin) {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      const canonicalUrl = req.nextUrl.clone()
      canonicalUrl.pathname = pathname === "/admin" ? "/" : pathname.slice("/admin".length)
      return NextResponse.redirect(canonicalUrl)
    }

    const url = req.nextUrl.clone()
    url.pathname = `/admin${pathname === "/" ? "" : pathname}`
    return NextResponse.rewrite(url)
  }
  // Customer dashboard host.
  if (isDashboard) {
    // Login, auth callback, and API routes never need a session
    if (pathname === "/login" || pathname === "/select" || pathname.startsWith("/auth/") || pathname.startsWith("/api/")) {
      const url = req.nextUrl.clone()
      url.pathname = `/dashboard${pathname}`
      return NextResponse.rewrite(url)
    }

    // Rewrite immediately and let the dashboard server layout enforce auth.
    // Doing Supabase auth inside middleware blocks the first byte of the PWA
    // launch, which makes iOS show a black screen before the app shell can
    // paint. The layout still calls requireDashboardAccess(), so protected
    // pages remain protected without delaying the initial shell.
    const url = req.nextUrl.clone()
    url.pathname = `/dashboard${pathname}`
    return NextResponse.rewrite(url)
  }

  const isSiteIconRequest =
    pathname === "/favicon.ico" ||
    pathname === "/favicon.svg" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/apple-touch-icon-precomposed.png" ||
    pathname === "/icon" ||
    pathname.startsWith("/icons/found-app-icon")

  if (!isRootHost && isSiteIconRequest) {
    const slug = hostname.endsWith(`.${ROOT_DOMAIN}`)
      ? hostname.slice(0, -(ROOT_DOMAIN.length + 1))
      : `__domain__${hostname.replace(/^www\./, "")}`
    const url = req.nextUrl.clone()
    url.pathname = `/${slug}/site-icon`
    const size =
      pathname.includes("512") ? "512"
      : pathname.includes("192") ? "192"
      : pathname.startsWith("/apple-touch-icon") ? "180"
      : "32"
    url.searchParams.set("size", size)
    if (pathname === "/favicon.ico") url.searchParams.set("format", "ico")
    return NextResponse.rewrite(url)
  }

  const isSiteManifestRequest =
    pathname === "/dashboard-manifest.json" ||
    pathname === "/manifest.json" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/site.webmanifest"

  if (!isRootHost && isSiteManifestRequest) {
    const slug = hostname.endsWith(`.${ROOT_DOMAIN}`)
      ? hostname.slice(0, -(ROOT_DOMAIN.length + 1))
      : `__domain__${hostname.replace(/^www\./, "")}`
    const url = req.nextUrl.clone()
    url.pathname = `/${slug}/site.webmanifest`
    return NextResponse.rewrite(url)
  }

  // Quote accept/payment APIs are called from customer subdomains, but live under
  // the tenant route so they can resolve the company safely.
  if (
    !isRootHost &&
    (pathname.startsWith("/api/accept-estimate/") || pathname.startsWith("/api/pay-estimate/") || pathname.startsWith("/api/decline-estimate/"))
  ) {
    const slug = hostname.endsWith(`.${ROOT_DOMAIN}`)
      ? hostname.slice(0, -(ROOT_DOMAIN.length + 1))
      : `__domain__${hostname.replace(/^www\./, "")}`
    const url = req.nextUrl.clone()
    url.pathname = `/${slug}${pathname}`
    return NextResponse.rewrite(url)
  }

  // Public API routes should never be rewritten into a customer site.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }
  if (isRootHost) {
    // Marks the request as Found's own marketing site (not a tenant site,
    // not dashboard/admin) so the root layout knows it's safe to load
    // Found's own analytics beacon - tenant sites and the dashboard should
    // never get Found's own traffic tracking mixed into them.
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-found-root-site", "1")
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Customer subdomain or custom domain.
  const slug = hostname.endsWith(`.${ROOT_DOMAIN}`)
    ? hostname.slice(0, -(ROOT_DOMAIN.length + 1))
    : `__domain__${hostname.replace(/^www\./, "")}`

  const url = req.nextUrl.clone()
  url.pathname = `/${slug}${pathname === "/" ? "" : pathname}`

  // Quote pages bypass the public site nav
  if (pathname.startsWith("/q/")) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-is-quote", "1")
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images).*)"],
}
