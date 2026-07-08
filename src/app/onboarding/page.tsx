import { cookies } from "next/headers"
import OnboardingFlow from "./OnboardingFlow"

export const metadata = {
  title: "Build Your Website | Found",
  description: "Answer a few questions. See your website. Get found.",
}

export default async function OnboardingPage() {
  // Read the admin cookie server-side only - its value never reaches the
  // client bundle, just this one boolean deciding whether to show the
  // comp-activation option at the end of onboarding.
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  const isAdminSession = Boolean(adminKey && process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY)

  return <OnboardingFlow isAdminSession={isAdminSession} />
}
