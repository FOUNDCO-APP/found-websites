import type { ReactNode } from "react"
import { requireDashboardAddonPage } from "@/lib/dashboard/entitlements"

export default async function ToolEntitlementLayout({ children }: { children: ReactNode }) {
  await requireDashboardAddonPage("email_marketing")
  return children
}
