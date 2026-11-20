import { redirect } from "next/navigation"
import { requireAdmin } from "../../lib"

export default async function ReceivedMailPage() {
  await requireAdmin()
  redirect("/admin/emails")
}
