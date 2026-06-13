import { redirect } from "next/navigation"
import { confirmActivation } from "../activateActions"

export default async function ActivateConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; setup_intent?: string; redirect_status?: string }>
}) {
  const { slug, setup_intent, redirect_status } = await searchParams
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

  if (!slug || !setup_intent || redirect_status !== "succeeded") {
    redirect(`/activate?slug=${slug ?? ""}&error=payment_failed`)
  }

  await confirmActivation(slug, setup_intent)

  redirect(`https://${slug}.${rootDomain}?trial=activated`)
}
