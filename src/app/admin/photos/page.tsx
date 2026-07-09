import { cookies } from "next/headers"
import PhotoCurator from "./PhotoCurator"
import AdminLogin from "./AdminLogin"

export const metadata = { title: "Photo library - Found HQ" }

export default async function AdminPhotosPage() {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  const isAuthed = !!adminKey && adminKey === process.env.ADMIN_KEY

  if (!isAuthed) return <AdminLogin />
  return <PhotoCurator />
}
