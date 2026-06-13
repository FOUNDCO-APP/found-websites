import { redirect } from "next/navigation"
import { createActivationSetup } from "./activateActions"
import ActivateFlow from "./ActivateFlow"

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; error?: string }>
}) {
  const { slug, error } = await searchParams
  if (!slug) redirect("/")

  // Run Stripe setup server-side so the client secret arrives with the page.
  // This means one network round-trip instead of two cold starts in sequence.
  const setup = error ? null : await createActivationSetup(slug)

  return <ActivateFlow slug={slug} setup={setup} error={error} />
}
