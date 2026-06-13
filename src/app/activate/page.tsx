import { redirect } from "next/navigation"
import ActivateLoader from "./ActivateLoader"

export const runtime = "edge"

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; error?: string }>
}) {
  const { slug, error } = await searchParams
  if (!slug) redirect("/")

  return <ActivateLoader slug={slug} error={error} />
}
