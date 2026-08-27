import type { ReactNode } from "react"
import { resolveDashboardIdentity } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"

export default async function LeadsLayout({ children }: { children: ReactNode }) {
  const identity = await resolveDashboardIdentity()
  if (!identity) redirect("/login")

  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) redirect(identity.isAdminView ? "/admin" : "/login")

  // Found-admin "View As" resolves as owner here.
  if (!(await requireOwnerAccess(identity.userId, identity.userEmail, company))) {
    redirect("/photos")
  }

  return children
}
