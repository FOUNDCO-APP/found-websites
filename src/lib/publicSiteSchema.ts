import type { Company, ServiceItem } from "@/types/company"
import { getPublicSiteOrigin } from "@/lib/siteUrl"
import { getSiteCopy } from "@/lib/siteCopy"

type JsonObject = Record<string, unknown>

function trimText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}

function unique<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const id = key(item).toLowerCase()
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function cleanSchemaValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const cleaned = value
      .map(cleanSchemaValue)
      .filter((item) => item !== undefined && item !== null && item !== "")
    return cleaned.length > 0 ? cleaned : undefined
  }

  if (value && typeof value === "object") {
    const cleaned = Object.fromEntries(
      Object.entries(value as JsonObject)
        .map(([key, item]) => [key, cleanSchemaValue(item)] as const)
        .filter(([, item]) => item !== undefined && item !== null && item !== "")
    )
    return Object.keys(cleaned).length > 0 ? cleaned : undefined
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  return value ?? undefined
}

function visiblePhone(company: Company) {
  return company.phone_visible === false ? "" : trimText(company.phone)
}

function visibleEmail(company: Company) {
  return company.email_visible === false ? "" : trimText(company.email)
}

function socialLinks(company: Company) {
  const links = Object.values(company.website_config?.social_links ?? {})
    .map(trimText)
    .filter((href) => /^https?:\/\//i.test(href))
  return unique(links, (href) => href)
}

function serviceSchemaItems(services: ServiceItem[], websiteUrl: string, businessId: string, areaServed: JsonObject[]) {
  return unique(
    services.filter((service) => trimText(service.name)),
    (service) => service.name
  ).map((service, index) => {
    const serviceName = trimText(service.name)
    return cleanSchemaValue({
      "@type": "Service",
      "@id": `${websiteUrl}/#service-${slugify(serviceName) || index + 1}`,
      name: serviceName,
      description: trimText(service.description),
      provider: { "@id": businessId },
      areaServed,
    }) as JsonObject
  })
}

function buildFaqs(company: Company, services: ServiceItem[]) {
  const config = company.website_config
  const copy = getSiteCopy(company.primary_intent, {
    name: company.name,
    city: company.city ?? undefined,
    subIndustry: company.sub_industry,
    industryCategory: company.industry_category,
    services,
  })
  const phone = visiblePhone(company)
  const email = visibleEmail(company)
  const cityState = [company.city, company.state].map(trimText).filter(Boolean).join(", ")
  const generatedFaqs = (config?.faq_items ?? [])
    .map((item) => ({ q: trimText(item.q), a: trimText(item.a) }))
    .filter((item) => item.q && item.a)

  return unique(
    [
      ...generatedFaqs.slice(0, 6),
      ...(generatedFaqs.length === 0 ? [{ q: copy.faqQ, a: copy.faqA(company.name, company.city) }] : []),
      ...(cityState
        ? [{
            q: `Where is ${company.name} located?`,
            a: `${company.name} is based in ${cityState} and serves the surrounding area.`,
          }]
        : []),
      {
        q: `How do I contact ${company.name}?`,
        a: phone
          ? `Call ${company.name} at ${phone}.`
          : email
            ? `Email ${company.name} at ${email}.`
            : `Use the contact form on ${company.name}'s website to get in touch.`,
      },
      ...(services.length > 0
        ? [{
            q: `What services does ${company.name} offer?`,
            a: `${company.name} offers ${services.map((service) => service.name).join(", ")}${company.city ? ` in ${company.city}` : ""}.`,
          }]
        : []),
    ],
    (item) => item.q
  )
}

export function buildPublicSiteSchemas(company: Company) {
  const config = company.website_config
  const websiteUrl = withoutTrailingSlash(getPublicSiteOrigin(company.slug, config?.custom_domain))
  const businessId = `${websiteUrl}/#business`
  const websiteId = `${websiteUrl}/#website`
  const services = config?.services ?? []
  const areaServed = unique(config?.service_areas ?? [], (area) => area)
    .map((area) => cleanSchemaValue({ "@type": "City", name: area }) as JsonObject)
  const description = trimText(config?.hero_subtitle) || trimText(config?.about_preview) || trimText(config?.about_text)
  const image = trimText(config?.hero_image_url) || trimText(company.logo_url)
  const logo = trimText(company.logo_url)
  const phone = visiblePhone(company)
  const email = visibleEmail(company)
  const serviceSchemas = serviceSchemaItems(services, websiteUrl, businessId, areaServed)
  const faqItems = buildFaqs(company, services)

  const businessSchema = cleanSchemaValue({
    "@type": "LocalBusiness",
    "@id": businessId,
    name: company.name,
    url: websiteUrl,
    description,
    telephone: phone,
    email,
    image,
    logo,
    sameAs: socialLinks(company),
    address: company.city || company.state
      ? {
          "@type": "PostalAddress",
          streetAddress: company.address_visible ? company.address : undefined,
          addressLocality: company.city,
          addressRegion: company.state,
          postalCode: company.address_visible ? company.zip : undefined,
          addressCountry: "US",
        }
      : undefined,
    contactPoint: phone
      ? {
          "@type": "ContactPoint",
          telephone: phone,
          contactType: "customer service",
          availableLanguage: "English",
        }
      : undefined,
    areaServed,
    hasOfferCatalog: serviceSchemas.length > 0
      ? {
          "@type": "OfferCatalog",
          name: `${company.name} services`,
          itemListElement: serviceSchemas.map((service, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "Offer",
              itemOffered: { "@id": service["@id"] },
            },
          })),
        }
      : undefined,
  }) as JsonObject

  const websiteSchema = cleanSchemaValue({
    "@type": "WebSite",
    "@id": websiteId,
    url: websiteUrl,
    name: company.name,
    description,
    publisher: { "@id": businessId },
  }) as JsonObject

  const faqSchema = cleanSchemaValue({
    "@type": "FAQPage",
    "@id": `${websiteUrl}/#faq`,
    mainEntity: faqItems.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  }) as JsonObject

  return [
    cleanSchemaValue({
      "@context": "https://schema.org",
      "@graph": [businessSchema, websiteSchema, ...serviceSchemas, faqSchema],
    }) as JsonObject,
  ]
}
