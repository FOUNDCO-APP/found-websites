import { createBrowserClient } from "@supabase/ssr"
import { clearAdminOverride } from "./adminSession"

// Single source of truth for what "sign out" actually clears, used by both
// SignOutButton and AccountMenu - the admin-override cookie gap (fixed
// 2026-08-09) was exactly the kind of bug that happens when this logic
// exists in two places and only one gets updated.
export async function performSignOut() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  await supabase.auth.signOut()
  document.cookie = "found_company_id=; max-age=0; path=/"
  await clearAdminOverride()
}
