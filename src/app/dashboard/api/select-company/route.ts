import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function GET(req: NextRequest) {
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

  // Verify the user actually owns this company
  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("id", id)
    .or(`user_id.eq.${userId},email.eq.${userEmail ?? ""}`)
    .maybeSingle()

  if (!company) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  const redirectUrl = new URL("/", req.url)
  if (req.nextUrl.searchParams.get("activated") === "true") {
    redirectUrl.searchParams.set("activated", "true")
  }

  revalidatePath("/", "layout")
  const response = NextResponse.redirect(redirectUrl)
  response.headers.set("Cache-Control", "no-store")
  response.cookies.set("found_company_id", id, {
    path: "/",
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
