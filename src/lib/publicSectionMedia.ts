import type { SupabaseClient } from "@supabase/supabase-js"
import type { IndependentHeaderSlot } from "@/lib/siteSectionRegistry"

export async function getPublicSectionMedia(admin: Pick<SupabaseClient, "from">, companyId: string, slot: IndependentHeaderSlot): Promise<string | null> {
  try {
    const { data, error } = await admin.from("company_photos")
      .select("url").eq("company_id", companyId).eq("for_website", true).eq("website_section", slot)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle()
    if (error) {
      console.warn(`[publicSectionMedia] ${slot} photo lookup failed: ${error.message}`)
      return null
    }
    return data?.url ?? null
  } catch (error) {
    console.warn(`[publicSectionMedia] ${slot} photo lookup failed`, error instanceof Error ? error.message : "Unknown read error")
    return null
  }
}
