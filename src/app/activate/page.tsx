import { redirect } from "next/navigation"
import ActivateFlow from "./ActivateFlow"

export const runtime = "edge"

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; error?: string }>
}) {
  const { slug, error } = await searchParams
  if (!slug) redirect("/")

  // No Stripe calls here — page renders instantly.
  // Stripe setup runs client-side while the splash plays.
  return <ActivateFlow slug={slug} error={error} />
}
