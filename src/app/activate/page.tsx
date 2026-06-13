import { redirect } from "next/navigation"
import dynamic from "next/dynamic"

export const runtime = "edge"

// ssr:false keeps all Stripe client code out of the Edge bundle entirely
const ActivateFlow = dynamic(() => import("./ActivateFlow"), { ssr: false })

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; error?: string }>
}) {
  const { slug, error } = await searchParams
  if (!slug) redirect("/")

  return <ActivateFlow slug={slug} error={error} />
}
