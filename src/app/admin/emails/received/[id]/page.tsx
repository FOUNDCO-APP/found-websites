import { redirect } from "next/navigation"
import { requireAdmin } from "../../../lib"

export default async function ReceivedMessagePage() {
  await requireAdmin()
  redirect("/admin/emails")
}
