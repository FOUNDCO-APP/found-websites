import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type HealthCheck = {
  name: string
  ok: boolean
  detail?: string
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const providedKey = url.searchParams.get("key") || request.headers.get("x-admin-key")
  const adminKey = process.env.ADMIN_KEY

  if (!adminKey || providedKey !== adminKey) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const checks: HealthCheck[] = [
    { name: "NEXT_PUBLIC_SUPABASE_URL", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { name: "SUPABASE_SERVICE_ROLE_KEY", ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { name: "NEXT_PUBLIC_ROOT_DOMAIN", ok: Boolean(process.env.NEXT_PUBLIC_ROOT_DOMAIN), detail: process.env.NEXT_PUBLIC_ROOT_DOMAIN || "missing" },
    { name: "ANTHROPIC_API_KEY", ok: Boolean(process.env.ANTHROPIC_API_KEY) },
  ]

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, checks })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  const { error } = await supabase
    .from("companies")
    .select("id, slug, sub_industry, photo_keywords, primary_intent, secondary_intent, vibe, primary_color, accent_color_1, accent_color_2")
    .limit(1)

  checks.push({
    name: "companies schema/service-role read",
    ok: !error,
    detail: error ? `${error.code || "error"}: ${error.message}` : "ok",
  })

  return NextResponse.json({
    ok: checks.every((check) => check.ok),
    checks,
  })
}
