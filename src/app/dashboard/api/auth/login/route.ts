import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/security/rateLimit"

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }

  const normalizedEmail = String(email).toLowerCase().trim()
  const limit = checkPublicRateLimit(req, { key: `password-login:${normalizedEmail}`, limit: 8, windowMs: 15 * 60 * 1000 })
  if (!limit.allowed) return rateLimitResponse(limit)

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

  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })

  if (error) {
    if (error.message.includes("Invalid login")) {
      return NextResponse.json({ error: "Wrong email or password. Try a login link instead." }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  if (!data.user) {
    return NextResponse.json({ error: "Login failed" }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
