import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function GET(req: NextRequest) {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
  const hostname = req.nextUrl.hostname
  const shouldSetRootCookie = hostname === rootDomain || hostname.endsWith(`.${rootDomain}`)
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.redirect(new URL("/", req.url))

  // Read auth from cookies
  let userId: string | null = null
  let userEmail: string | null = null
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
    userEmail = user?.email ?? null
  } catch {}

  if (!userId) {
    // Not logged in - send to login (no stale cookie to worry about for new users)
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Verify the user actually has access to this company - either as owner
  // or as an active worker (company_members).
  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("id", id)
    .or(`user_id.eq.${userId},email.eq.${userEmail ?? ""}`)
    .maybeSingle()

  let hasAccess = Boolean(company)
  if (!hasAccess) {
    const { data: member } = await admin
      .from("company_members")
      .select("id")
      .eq("company_id", id)
      .eq("status", "active")
      .or(`user_id.eq.${userId},email.eq.${userEmail ?? ""}`)
      .maybeSingle()
    hasAccess = Boolean(member)
  }

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  const redirectUrl = new URL("/", req.url)
  if (req.nextUrl.searchParams.get("activated") === "true") {
    redirectUrl.searchParams.set("activated", "true")
  }

  revalidatePath("/", "layout")
  const response = NextResponse.redirect(redirectUrl)
  response.headers.set("Cache-Control", "no-store")
  const cookieOptions = {
    path: "/",
    sameSite: "lax" as const,
    secure: true,
    maxAge: 60 * 60 * 24 * 30,
  }

  response.cookies.set("found_company_id", id, cookieOptions)
  response.cookies.set("found_selected_company_id", id, cookieOptions)
  if (shouldSetRootCookie) {
    response.cookies.set("found_company_id", id, {
      ...cookieOptions,
      domain: `.${rootDomain}`,
    })
    response.cookies.set("found_selected_company_id", id, {
      ...cookieOptions,
      domain: `.${rootDomain}`,
    })
  }
  return response
}
