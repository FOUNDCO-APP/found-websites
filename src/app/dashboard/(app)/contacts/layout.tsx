import type { ReactNode } from "react"
import { requireDashboardFeaturePage } from "@/lib/dashboard/entitlements"

export default async function ContactsEntitlementLayout({ children }: { children: ReactNode }) {
  await requireDashboardFeaturePage("contact_database")
  return children
}
