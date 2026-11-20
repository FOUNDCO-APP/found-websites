import { redirect } from "next/navigation"
import { requireAdmin } from "../../lib"

export default async function ComposePage() {
  await requireAdmin()
  redirect("/admin/emails")
}
