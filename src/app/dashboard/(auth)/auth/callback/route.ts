import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getAllCompanies } from "@/lib/dashboard/getCompany"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
  const appBase = `https://my.${rootDomain}`

  // PKCE flow — has ?code= param
  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const companies = await getAllCompanies(user.id, user.email ?? "")
        if (companies.length === 0) {
          return NextResponse.redirect(`${appBase}/login?error=no_company`)
        }
        return NextResponse.redirect(`${appBase}/select`)
      }
    }
  }

  // No code — Supabase sent #access_token in hash instead (implicit flow)
  // Send to client-side handler that can read the hash fragment
  return NextResponse.redirect(`${appBase}/auth/token`)
}
