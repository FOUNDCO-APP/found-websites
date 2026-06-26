import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import LocationsClient from "@/components/dashboard/LocationsClient"
import type { LocationRow } from "@/components/dashboard/LocationsClient"

export default async function LocationsPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) redirect("/login")

  const admin = createAdminClient()

  const { data: locations } = await admin
    .from("company_locations")
    .select("id, name, address, phone, hours, sort_order")
    .eq("company_id", company.id)
    .order("sort_order", { ascending: true })

  return (
    <LocationsClient
      initialLocations={(locations ?? []) as LocationRow[]}
      primaryName={company.name}
      primaryCity={company.city}
      primaryState={company.state ?? null}
    />
  )
}
