import { requireDashboardAccess } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import TeamClient from "@/components/dashboard/TeamClient"
import { getTeamMembers } from "./actions"

export default async function TeamPage() {
  const user = await requireDashboardAccess()
  const company = await getCompany(user?.id ?? "", user?.email ?? "")
  if (!company) redirect(user ? "/login" : "/admin")
  if (!(await requireOwnerAccess(user?.id ?? "", user?.email ?? "", company))) redirect("/photos")

  const members = await getTeamMembers()

  return <TeamClient initialMembers={members} />
}
