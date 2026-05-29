import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import type { Company } from "@/types/company"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let company: Company | null = null

  if (slug.startsWith("__domain__")) {
    const domain = slug.replace("__domain__", "")
    company = await getCompanyByDomain(domain)
  } else {
    company = await getCompanyBySlug(slug)
  }

  if (!company) notFound()

  const { primary_color, accent_color_1 } = company

  return (
    <div
      style={{
        "--color-primary": primary_color,
        "--color-accent": accent_color_1,
      } as React.CSSProperties}
    >
      <Navbar company={company} />
      <main className="flex-1">{children}</main>
      <Footer company={company} />
    </div>
  )
}
