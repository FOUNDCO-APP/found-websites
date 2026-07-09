import { cookies } from "next/headers"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function requireAdmin() {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) throw new Error("Not authorized")
}

export function planLabel(plan: string | null) {
  if (plan === "found_business") return "Business"
  if (plan === "found_pro") return "Pro"
  if (plan === "found") return "Starter"
  return "No plan"
}

export function formatDue(value: string | null) {
  if (!value) return "No follow-up"
  const due = new Date(value)
  const delta = due.getTime() - Date.now()
  const days = Math.ceil(Math.abs(delta) / 86400000)
  if (delta < -86400000) return `${days}d overdue`
  if (delta < 0) return "Overdue"
  if (delta < 86400000) return "Today"
  return `In ${days}d`
}
