import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getAllCompanies } from "@/lib/dashboard/getCompany"

function safeNextPath(value: string | null): string | null {
  if (!value) return null
  let decoded = value
  // Check each encoding layer; never let browser URL normalization turn a
  // protocol-relative path, backslash or control character into navigation.
  for (let layer = 0; layer < 5; layer++) {
    if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return null
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) return value
      decoded = next
    } catch {
      return null
    }
  }
  return null
}

async function withTimeout<T>(request: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Connection timed out")), 15000) }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
  const appBase = `https://my.${rootDomain}`
  // Only ever an internal my.<root domain> path (e.g. from activation) - never
  // follow this to an external host.
  const rawNext = searchParams.get("next")
  const next = safeNextPath(rawNext)

  if (searchParams.has("error") || searchParams.has("error_code")) {
    return NextResponse.redirect(`${appBase}/login?error=link_expired`)
  }

  // PKCE flow — has ?code= param
  if (code) {
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                try { cookieStore.set(name, value, options) } catch {}
              })
            },
          },
        }
      )

      const { error } = await withTimeout(supabase.auth.exchangeCodeForSession(code))
      if (error) return NextResponse.redirect(`${appBase}/login?error=link_expired`)
      const { data: { user }, error: userError } = await withTimeout(supabase.auth.getUser())
      if (userError || !user) return NextResponse.redirect(`${appBase}/login?error=auth_failed`)
      const companies = await withTimeout(getAllCompanies(user.id, user.email ?? ""))
      if (companies.length === 0) {
        return NextResponse.redirect(`${appBase}/login?error=no_company`)
      }
      return NextResponse.redirect(`${appBase}${next ?? "/select"}`)
    } catch {
      return NextResponse.redirect(`${appBase}/login?error=auth_failed`)
    }
  }

  // No code — Supabase sent #access_token in hash instead (implicit flow)
  // Send to client-side handler that can read the hash fragment
  return NextResponse.redirect(`${appBase}/auth/token${next ? `?next=${encodeURIComponent(next)}` : ""}`)
}
