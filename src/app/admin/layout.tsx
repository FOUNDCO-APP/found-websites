import { cookies } from "next/headers"
import AdminShell from "./AdminShell"
import AdminLogin from "./photos/AdminLogin"
import "./admin.css"
import "./v2.css"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  const isAuthed = !!adminKey && adminKey === process.env.ADMIN_KEY
  if (!isAuthed) return <AdminLogin />
  return <AdminShell>{children}</AdminShell>
}
