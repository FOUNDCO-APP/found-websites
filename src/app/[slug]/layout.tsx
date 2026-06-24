import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import type { Company } from "@/types/company"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import PreviewBanner from "@/components/PreviewBanner"
import TrialActivatedSplash from "@/components/TrialActivatedSplash"
import { getVibe } from "@/lib/vibe"
import { getLayout } from "@/lib/layout"
import { getSiteCopy } from "@/lib/siteCopy"
import { getVocab } from "@/lib/subIndustryVocabulary"

export const dynamic = 'force-dynamic'

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
  const city = company.city
  const state = company.state
  const locationStr = city ? `${city}${state ? `, ${state}` : ""}` : ""
  const homeTitle = [company.name, locationStr, serviceList].filter(Boolean).join(" — ")
  const vocab = getVocab(company.sub_industry ?? null, company.industry_category)
  const descFallback = city
    ? `${vocab.servicesLabel} in ${city}${state ? `, ${state}` : ""} — ${company.name}. ${vocab.ctaBodyText.charAt(0).toUpperCase() + vocab.ctaBodyText.slice(1)}.`
    : `${company.name} — ${vocab.ctaBodyText}.`
  const description = config?.hero_subtitle || descFallback
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

  const copy = getSiteCopy(company.primary_intent, {
    name: company.name,
    city: company.city ?? undefined,
    subIndustry: company.sub_industry,
    industryCategory: company.industry_category,
    services: config?.services,
  })
  const aiFaqs = config?.faq_items ?? []
  const faqs = [
    ...aiFaqs.map(item => ({ q: item.q, a: item.a })),
    ...(aiFaqs.length === 0 ? [{ q: copy.faqQ, a: copy.faqA(company.name, company.city) }] : []),
    {
      q: `Where is ${company.name} located?`,
      a: `${company.name} is based in ${company.city || "your area"}${company.state ? `, ${company.state}` : ""} and serves the surrounding region.`,
    },
    {
      q: `How do I contact ${company.name}?`,
      a: `You can reach ${company.name} by phone at ${company.phone || "the number on our website"} or by ${copy.faqContactA}.`,
    },
    ...(services.length > 0 ? [{
      q: `What services does ${company.name} offer?`,
      a: `${company.name} offers ${services.map(s => s.name).join(", ")}${company.city ? ` in ${company.city}` : ""}.`,
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
        isActivated={company.subscription_status === 'active'}
        trialEndsAt={company.trial_ends_at}
      />
      <TrialActivatedSplash companyName={company.name} />
    </div>
  )
}
