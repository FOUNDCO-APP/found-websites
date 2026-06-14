import { notFound, redirect } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import ActivateClient from "./ActivateClient"

export default async function ActivatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) notFound()
  if (company.stripe_customer_id) redirect("/")

  const realSlug = company.slug

  return <ActivateClient slug={realSlug} companyName={company.name} />
}
