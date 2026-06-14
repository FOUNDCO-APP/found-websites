import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import type { Company } from "@/types/company"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import PreviewBanner from "@/components/PreviewBanner"
import { getVibe } from "@/lib/vibe"
import { getLayout } from "@/lib/layout"

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) return {}

  const config = company.website_config
  const serviceList = config?.services?.map(s => s.name).join(", ") || ""
  const locationStr = company.city ? `${company.city}${company.state ? `, ${company.state}` : ""}` : ""
  const homeTitle = [company.name, locationStr, serviceList].filter(Boolean).join(" — ")
  const description = config?.hero_subtitle
    || `${company.name}${locationStr ? ` — serving ${locationStr}` : ""}. Contact us today.`
  const url = `https://${company.slug}.foundco.app`
  const image = company.logo_url || undefined

  return {
    title: {
      default: homeTitle,
      template: `%s — ${company.name}`,
    },
    description,
    openGraph: {
      type: "website",
      url,
      siteName: company.name,
      title: homeTitle,
      description,
      ...(image && { images: [{ url: image, alt: company.name }] }),
    },
    twitter: {
      card: "summary",
      title: homeTitle,
      description,
      ...(image && { images: [image] }),
    },
    metadataBase: new URL(url),
    alternates: { canonical: url },
  }
}

function buildJsonLd(company: Company) {
  const config = company.website_config
  const websiteUrl = `https://${company.slug}.foundco.app`
  const services = config?.services || []
  const serviceAreas = config?.service_areas || []

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": websiteUrl,
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
    ...(company.phone && {
      contactPoint: {
        "@type": "ContactPoint",
        telephone: company.phone,
        contactType: "customer service",
        availableLanguage: "English",
      },
    }),
    ...(serviceAreas.length > 0 && {
      areaServed: serviceAreas.map(area => ({
        "@type": "City",
        name: area,
      })),
    }),
    ...(services.length > 0 && {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Services",
        itemListElement: services.map((s, i) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: s.name,
            description: s.description,
          },
          position: i + 1,
        })),
      },
    }),
  }

  // Auto-generate FAQ from business data
  const faqs = [
    {
      q: `Do you offer free estimates?`,
      a: `Yes, ${company.name} offers free, no-obligation estimates. Contact us today to get started.`,
    },
    {
      q: `Where is ${company.name} located?`,
      a: `We are based in ${company.city || "your area"}${company.state ? `, ${company.state}` : ""} and serve the surrounding region.`,
    },
    {
      q: `How do I contact ${company.name}?`,
      a: `You can reach us by phone at ${company.phone || "the number on our website"} or by filling out our online estimate form.`,
    },
    ...(services.length > 0 ? [{
      q: `What services does ${company.name} offer?`,
      a: `We offer ${services.map(s => s.name).join(", ")}.`,
    }] : []),
  ]

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  }

  return [localBusiness, faqSchema]
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
  const vibe = getVibe(company.vibe)
  const layout = getLayout(company.industry_category, company.vibe)
  const schemas = buildJsonLd(company)

  return (
    <div
      style={{
        "--color-primary": primary_color,
        "--color-accent": accent_color_1,
        "--font-heading": vibe.fontHeading,
        "--font-body": vibe.fontBody,
        "--card-radius": vibe.cardRadius,
        "--card-shadow": vibe.cardShadow,
        "--button-radius": vibe.buttonRadius,
        fontFamily: vibe.fontBody,
      } as React.CSSProperties}
    >
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <Navbar company={company} transparent={layout === "cinematic"} />
      <main className="flex-1">{children}</main>
      <Footer company={company} />
      <PreviewBanner
        slug={company.slug}
        companyName={company.name}
        stripeCustomerId={company.stripe_customer_id}
        trialEndsAt={company.trial_ends_at}
        setupIntentSecret={company.pending_setup_intent_secret}
      />
    </div>
  )
}
