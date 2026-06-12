"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function isValidDomain(domain: string) {
  return /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(domain.toLowerCase())
}

async function registerWithVercel(domain: string) {
  const token     = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId    = process.env.VERCEL_TEAM_ID // optional

  if (!token || !projectId) return // gracefully skip if not configured

  const url = teamId
    ? `https://api.vercel.com/v10/projects/${projectId}/domains?teamId=${teamId}`
    : `https://api.vercel.com/v10/projects/${projectId}/domains`

  await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: domain }),
  }).catch((err) => console.error("[vercel] domain register error:", err))
}

export async function connectDomain(
  slug: string,
  rawDomain: string,
): Promise<{ success: boolean; domain?: string; error?: string }> {
  const domain = rawDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")

  if (!isValidDomain(domain)) {
    return { success: false, error: "That doesn't look like a valid domain. Try: yourbusiness.com" }
  }

  const supabase = getAdminClient()

  // Verify the company exists
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle()

  if (!company) return { success: false, error: "Site not found. Check your link and try again." }

  // Save to website_config
  const { error } = await supabase
    .from("website_config")
    .update({ custom_domain: domain })
    .eq("company_id", company.id)

  if (error) {
    console.error("[connect-domain] update error:", error.message)
    return { success: false, error: "Could not save domain — please try again." }
  }

  // Register with Vercel (fire-and-forget, no token = skipped silently)
  await registerWithVercel(domain)

  return { success: true, domain }
}
