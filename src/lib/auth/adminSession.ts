"use server"

import { cookies } from "next/headers"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

// Regular sign-out must end an admin "View As" session too. That mechanism
// (admin_key/found_admin_view/found_admin_company_id) is a separate,
// httpOnly cookie set - it isn't tied to the Supabase Auth session at all,
// so supabase.auth.signOut() never touches it. Without this, a stale View
// As session silently grants full owner access to whichever account signs
// in next in the same browser - including a restricted worker account.
// Found 2026-08-09 testing Barrio Builders' worker role.
export async function clearAdminOverride() {
  const cookieStore = await cookies()
  const domain = process.env.NODE_ENV === "production" ? `.${ROOT_DOMAIN}` : undefined
  cookieStore.delete({ name: "admin_key", path: "/", domain })
  cookieStore.delete({ name: "found_admin_view", path: "/", domain })
  cookieStore.delete({ name: "found_admin_company_id", path: "/", domain })
  cookieStore.delete({ name: "found_admin_previous_company_id", path: "/", domain })
}
