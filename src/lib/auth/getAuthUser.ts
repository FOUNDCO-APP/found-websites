import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isAdminOverrideActive } from "@/lib/dashboard/getCompany"
import type { User } from "@supabase/supabase-js"

export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

// Every dashboard page needs either a real logged-in customer, or a
// server-verified Found-admin session (the "View as" flow from
// /admin/businesses). Redirects to /login only when neither is true - never
// trust the admin cookie's mere presence, isAdminOverrideActive() re-checks
// it against ADMIN_KEY server-side. Returns null when it's an admin-only
// session (no real customer signed in) - callers that then look up a
// company via getCompany(user?.id ?? "", user?.email ?? "") already work
// correctly with an empty user, since the admin override path in
// getCompany() doesn't use those values at all.
export async function requireDashboardAccess(): Promise<User | null> {
  const user = await getAuthUser()
  if (user) return user
  if (!(await isAdminOverrideActive())) redirect("/login")
  return null
}
