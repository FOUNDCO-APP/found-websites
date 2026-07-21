import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? ""
  const hostname = host.split(":")[0]
  const { pathname } = req.nextUrl

  const APP_DOMAIN = `my.${ROOT_DOMAIN}`
  const ADMIN_DOMAIN = `admin.${ROOT_DOMAIN}`
  const isDashboard = hostname === APP_DOMAIN
  const isAdmin = hostname === ADMIN_DOMAIN

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

    // All other dashboard routes require auth
    let res = NextResponse.next({ request: req })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
            res = NextResponse.next({ request: req })
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const url = req.nextUrl.clone()
    url.pathname = `/dashboard${pathname}`
    res = NextResponse.rewrite(url)
    return res
  }

  const isRootHost =
    hostname === ROOT_DOMAIN ||
    hostname === `www.${ROOT_DOMAIN}` ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg|icons|images|dashboard-manifest).*)"],
}
