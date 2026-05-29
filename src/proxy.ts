import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'foundco.app'

export function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Pass through static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Root domain (foundco.app) — coming soon / admin landing
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
    return NextResponse.next()
  }

  let slug: string | null = null

  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    // barriobuilders.foundco.app → barriobuilders
    slug = hostname.replace(`.${ROOT_DOMAIN}`, '')
  } else {
    // Custom domain: barriobuilders.com — slug will be resolved via custom_domain lookup
    // We pass the full hostname and let the page handle the lookup
    slug = `__domain__${hostname.replace('www.', '')}`
  }

  if (!slug) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = `/${slug}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
