"use server"
import { cookies } from "next/headers"

export async function adminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete("admin_key")
}
