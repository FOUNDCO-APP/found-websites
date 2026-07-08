"use server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function requireAdmin() {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) throw new Error("Not authorized")
}

// Sets the same cookie the normal company-switcher uses, but scoped to the
// whole root domain (not just whichever host served /admin) so it's read
// correctly on my.foundco.app. Shorter lifetime than a normal switch on
// purpose - this is a support/demo session, not a permanent choice, and
// should naturally expire rather than linger.
//
// Does NOT redirect - the caller (a client component) opens a new tab on
// the click itself, then points that tab here once this resolves. Keeping
// the redirect server-side would navigate the *current* admin tab away,
// which is exactly what Shawn asked not to happen.
export async function setViewAsCookie(companyId: string): Promise<{ success: boolean }> {
  await requireAdmin()
  const cookieStore = await cookies()
  const domain = process.env.NODE_ENV === "production" ? `.${ROOT_DOMAIN}` : undefined
  const currentCompanyId = cookieStore.get("found_company_id")?.value

  if (currentCompanyId && currentCompanyId !== companyId) {
    cookieStore.set("found_admin_previous_company_id", currentCompanyId, {
      path: "/",
      domain,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 60 * 8,
    })
  }
  cookieStore.set("found_admin_company_id", companyId, {
    path: "/",
    domain,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 8,
  })
  cookieStore.set("found_admin_view", "1", {
    path: "/",
    domain,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 8,
  })
  cookieStore.set("admin_key", process.env.ADMIN_KEY!, {
    path: "/",
    domain,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 8,
  })
  cookieStore.set("found_company_id", companyId, {
    path: "/",
    domain,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
  })
  return { success: true }
}

export async function exitAdminView() {
  const cookieStore = await cookies()
  const domain = process.env.NODE_ENV === "production" ? `.${ROOT_DOMAIN}` : undefined
  const previousCompanyId = cookieStore.get("found_admin_previous_company_id")?.value
  if (previousCompanyId) {
    cookieStore.set("found_company_id", previousCompanyId, {
      path: "/",
      domain,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    })
  } else {
    cookieStore.delete({ name: "found_company_id", path: "/", domain })
  }
  cookieStore.delete({ name: "found_admin_company_id", path: "/", domain })
  cookieStore.delete({ name: "found_admin_view", path: "/", domain })
  cookieStore.delete({ name: "found_admin_previous_company_id", path: "/", domain })
  redirect(`https://my.${ROOT_DOMAIN}/`)
}

// Comping a business also marks it active - every existing "is this
// account active" check in the app already reads subscription_status, so
// this is what actually unblocks their dashboard/activation banner without
// touching every one of those call sites individually.
export async function toggleComp(companyId: string, value: boolean) {
  await requireAdmin()
  const admin = getAdminClient()
  const patch: Record<string, unknown> = { is_comp: value }
  if (value) patch.subscription_status = "active"
  await admin.from("companies").update(patch).eq("id", companyId)
}

export async function saveNotes(companyId: string, notes: string) {
  await requireAdmin()
  const admin = getAdminClient()
  await admin.from("companies").update({ admin_notes: notes }).eq("id", companyId)
}
