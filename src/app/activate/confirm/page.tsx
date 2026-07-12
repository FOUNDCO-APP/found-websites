import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { confirmActivation } from "../activateActions"

export default async function ActivateConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; setup_intent?: string; redirect_status?: string; returnTo?: string }>
}) {
  const { slug, setup_intent, redirect_status, returnTo } = await searchParams
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

  if (!slug || !setup_intent || redirect_status !== "succeeded") {
    redirect(`/activate?slug=${slug ?? ""}&error=payment_failed`)
  }

  const activation = await confirmActivation(slug, setup_intent)

  if (!activation.ok || !activation.companyId) {
    redirect(`/activate?slug=${slug}&error=payment_failed`)
  }

  const cookieStore = await cookies()
  cookieStore.set("found_company_id", activation.companyId, {
    path: "/",
    domain: `.${rootDomain}`,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 30,
  })

  if (returnTo === "dashboard") {
    redirect(`https://my.${rootDomain}/api/select-company?id=${activation.companyId}&activated=true`)
  }

  redirect(`https://${slug}.${rootDomain}?activated=true`)
}