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

        if (companies.length === 1) {
          const res = NextResponse.redirect(`${appBase}/`)
          res.cookies.set("found_company_id", companies[0].id, {
            path: "/",
            sameSite: "lax",
            secure: true,
            maxAge: 60 * 60 * 24 * 30,
          })
          return res
        }

        return NextResponse.redirect(`${appBase}/select`)
      }
    }
  }

  return NextResponse.redirect(`${appBase}/login?error=auth_failed`)
}
