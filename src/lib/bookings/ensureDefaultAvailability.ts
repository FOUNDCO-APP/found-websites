import { createAdminClient } from "@/lib/supabase/admin"

// Team-approved fix 2026-08-07: a business could activate reservation_calendar
// with zero rows in company_availability - the Hours tab shows sensible
// defaults (Mon-Fri, 9-5) before anything is ever saved, so an owner who
// never notices they need to hit Save ends up with a calendar add-on but a
// public booking page with literally no bookable days. Seeding real default
// rows the moment the add-on actually activates removes that empty-table
// state entirely, instead of just labeling it better.
//
// Only runs when the company has zero existing rows - never overwrites an
// owner's real, already-saved hours.
export async function ensureDefaultAvailability(companyId: string) {
  const admin = createAdminClient()

  const { count } = await admin
    .from("company_availability")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)

  if (count && count > 0) return

  const defaultDays = [0, 1, 2, 3, 4, 5, 6].map(day_of_week => ({
    company_id: companyId,
    day_of_week,
    is_working: day_of_week >= 1 && day_of_week <= 5, // Mon-Fri
    start_time: "09:00",
    end_time: "17:00",
    slot_duration_minutes: 60,
    buffer_minutes: 0,
  }))

  await admin
    .from("company_availability")
    .upsert(defaultDays, { onConflict: "company_id,day_of_week" })
}
