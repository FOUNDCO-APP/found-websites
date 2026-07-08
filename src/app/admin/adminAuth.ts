"use server"
import { cookies } from "next/headers"

export async function adminLogout() {
  const cookieStore = await cookies()
  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
  // Must match the exact attributes adminLogin() set it with (path + domain) -
  // a delete with mismatched attributes silently leaves the real cookie in place.
  cookieStore.delete({
    name: "admin_key",
    path: "/",
    domain: process.env.NODE_ENV === "production" ? `.${ROOT_DOMAIN}` : undefined,
  })
}
