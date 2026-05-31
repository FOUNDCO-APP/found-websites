import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import type { Company } from "@/types/company"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) return {}

  const config = company.website_config
  const title = company.name
  const description = config?.hero_subtitle
    || `${company.name} — ${company.city ? `serving ${company.city}` : "local business"}. Contact us today.`
  const url = `https://${company.slug}.foundco.app`
  const image = company.logo_url || undefined

  return {
    title: {
      default: company.name,
      template: `%s — ${company.name}`,
    },
    description,
    openGraph: {
      type: "website",
      url,
      siteName: company.name,
      title: company.name,
      description,
      ...(image && { images: [{ url: image, alt: company.name }] }),
    },
    twitter: {
      card: "summary",
      title: company.name,
      description,
      ...(image && { images: [image] }),
    },
    metadataBase: new URL(url),
    alternates: { canonical: url },
  }
}

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
  const websiteUrl = `https://${company.slug}.foundco.app`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.name,
    url: websiteUrl,
    ...(company.phone && { telephone: company.phone }),
    ...(company.email && { email: company.email }),
    ...(company.logo_url && { image: company.logo_url }),
    ...(company.city && company.state && {
      address: {
        "@type": "PostalAddress",
        addressLocality: company.city,
        addressRegion: company.state,
        addressCountry: "US",
      },
    }),
  }

  return (
    <div
      style={{
        "--color-primary": primary_color,
        "--color-accent": accent_color_1,
      } as React.CSSProperties}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar company={company} />
      <main className="flex-1">{children}</main>
      <Footer company={company} />
    </div>
  )
}
