import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? ""
  const hostname = host.split(":")[0]
  const { pathname } = req.nextUrl

  const APP_DOMAIN = `my.${ROOT_DOMAIN}`
  const isDashboard = hostname === APP_DOMAIN

  // ── app.foundco.app ─────────────────────────────────────────────────
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

  // ── foundco.app / localhost → marketing site ──────────────────────
  if (
    hostname === ROOT_DOMAIN ||
    hostname === `www.${ROOT_DOMAIN}` ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return NextResponse.next()
  }

  // ── [slug].foundco.app or custom domain → client site ─────────────
  const slug = hostname.endsWith(`.${ROOT_DOMAIN}`)
    ? hostname.slice(0, -(ROOT_DOMAIN.length + 1))
    : `__domain__${hostname.replace(/^www\./, "")}`

  const url = req.nextUrl.clone()
  url.pathname = `/${slug}${pathname === "/" ? "" : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
