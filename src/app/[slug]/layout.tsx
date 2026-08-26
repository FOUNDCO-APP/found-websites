import { notFound } from "next/navigation"
import { headers } from "next/headers"
import type { Metadata } from "next"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import type { Company } from "@/types/company"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import PreviewBanner from "@/components/PreviewBanner"
import TrialActivatedSplash from "@/components/TrialActivatedSplash"
import { getVibe } from "@/lib/vibe"
import { getLayout } from "@/lib/layout"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { getSiteCTAs } from "@/lib/industryCTAs"
import { getEffectiveAddons } from "@/lib/featureAccess"
import { createAdminClient } from "@/lib/supabase/admin"
import StickyCtaBar from "@/components/public/StickyCtaBar"
import { getPublicSiteOrigin } from "@/lib/siteUrl"
import { buildPublicSiteSchemas } from "@/lib/publicSiteSchema"
import SitePausedNotice from "@/components/SitePausedNotice"

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
  const homeTitle = [company.name, locationStr, serviceList].filter(Boolean).join(" - ")
  const vocab = getVocab(company.sub_industry ?? null, company.industry_category)
  const descFallback = city
    ? `${vocab.servicesLabel} in ${city}${state ? `, ${state}` : ""} - ${company.name}. ${vocab.ctaBodyText.charAt(0).toUpperCase() + vocab.ctaBodyText.slice(1)}.`
    : `${company.name} - ${vocab.ctaBodyText}.`
  const description = config?.hero_subtitle || descFallback
  const url = getPublicSiteOrigin(company.slug, config?.custom_domain)
  const image = company.logo_url || undefined
  const siteIconUrl = "/site-icon"

  return {
    title: {
      default: homeTitle,
      template: `%s - ${company.name}`,
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
    icons: {
      icon: [
        { url: siteIconUrl, sizes: "32x32", type: "image/png" },
        { url: siteIconUrl, sizes: "180x180", type: "image/png" },
      ],
      shortcut: siteIconUrl,
      apple: siteIconUrl,
    },
    // Shawn's own practice/demo companies should never show up in search,
    // even if they got linked to from somewhere and Google finds them
    // outside the sitemap. See src/app/sitemap.ts for the matching filter.
    ...(company.is_test ? { robots: { index: false, follow: false } } : {}),
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

  // Quote/estimate pages need no nav, footer, or site chrome
  const headersList = await headers()
  if (headersList.get("x-is-quote") === "1") {
    return <>{children}</>
  }

  let company: Company | null = null

  if (slug.startsWith("__domain__")) {
    const domain = slug.replace("__domain__", "")
    company = await getCompanyByDomain(domain)
  } else {
    company = await getCompanyBySlug(slug)
  }

  if (!company) notFound()

  // Deferred-billing pause: the owner agreed to add a card by trial_ends_at
  // (set via the admin new-client tool, not the normal Stripe trial path).
  // Once that date passes with no active subscription, the public site goes
  // dark - the owner's dashboard and the reactivate-with-card flow are
  // untouched, only visitors to the public site see the paused notice.
  const isActiveSubscription = company.subscription_status === "active" || company.subscription_status === "trialing"
  const isPaused = !isActiveSubscription && !!company.trial_ends_at && new Date(company.trial_ends_at) < new Date()

  const { primary_color, accent_color_1 } = company
  const vibe = getVibe(company.vibe)
  const layout = getLayout(company.industry_category, company.vibe, company.layout_override)
  const schemas = buildPublicSiteSchemas(company)

  const admin = createAdminClient()
  const { data: addonRows } = await admin
    .from("addon_subscriptions")
    .select("addon_slug")
    .eq("company_id", company.id)
    .eq("active", true)
  const activeAddons = getEffectiveAddons(company.plan, (addonRows ?? []).map((r: { addon_slug: string }) => r.addon_slug), company.included_addon_slug, company.disabled_addons ?? [])
  const { primary } = getSiteCTAs(company, activeAddons)
  // The sticky mobile bar always tracks the same primary action shown in the
  // hero - it used to fall back to "secondary" for most industries, but the
  // hero already shows secondary inline whenever one exists, so the bar was
  // just repeating a button already on screen (confirmed live on a real
  // client's site, same duplication on every non-booking-led industry, which
  // is most of them). Always delaying until the hero scrolls out of view
  // (see StickyCtaBar's own delayUntilScroll doc comment) is what actually
  // prevents the same CTA showing twice at once, not which CTA is picked.
  const barCTA = primary
  const barMatchPath = barCTA.href.startsWith("tel:") ? null : barCTA.href

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
      <Navbar company={company} transparent={layout === "cinematic"} hasShop={activeAddons.includes("shopping_cart")} activeAddons={activeAddons} />
      <main className="flex-1 pb-24 md:pb-0">
        {isPaused ? <SitePausedNotice businessName={company.name} /> : children}
      </main>
      <Footer company={company} activeAddons={activeAddons} />
      <StickyCtaBar
        label={barCTA.label}
        href={barCTA.href}
        matchPath={barMatchPath}
        color={company.primary_color}
        delayUntilScroll={true}
      />
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
