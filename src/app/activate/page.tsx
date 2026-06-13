import { redirect } from "next/navigation"
import ActivateFlow from "./ActivateFlow"

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; error?: string }>
}) {
  const { slug, error } = await searchParams
  if (!slug) redirect("/")

  return <ActivateFlow slug={slug} error={error} />
}
