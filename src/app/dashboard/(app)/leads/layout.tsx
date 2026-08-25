import type { ReactNode } from "react"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"

export default async function LeadsLayout({ children }: { children: ReactNode }) {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) redirect("/login")

  if (!(await requireOwnerAccess(user.id, user.email ?? "", company))) {
    redirect("/photos")
  }

  return children
}
