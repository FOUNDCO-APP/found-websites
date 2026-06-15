import { redirect } from "next/navigation"

// In production: middleware rewrites app.foundco.app/ → /dashboard/leads directly.
// In local dev: localhost:3000/dashboard → redirects to /leads (404 on localhost — use /dashboard/leads directly).
export default function DashboardPage() {
  redirect("/leads")
}
