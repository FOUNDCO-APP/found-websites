import type { Metadata } from "next"
import Link from "next/link"
import SiteNav from "@/components/SiteNav"
import SiteFooter from "@/components/SiteFooter"
import { INTRO_RATE_CUTOFF } from "@/lib/introRate"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const PAGE_URL = `https://${ROOT_DOMAIN}/how-it-works`
const TITLE = "How Found Works | AI Website Builder for Local Businesses"
const DESCRIPTION = "See how Found builds your website, writes your copy, chooses photos, launches your domain, and gives you a mobile dashboard for leads, photos, orders, bookings, estimates, and payments."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: "Found",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
}

const isIntroRatePeriod = new Date() < INTRO_RATE_CUTOFF

const BUILD_STEPS = [
  {
    step: "01",
    title: "Answer a few business questions.",
    body: "Tell Found what you do, where you work, what customers ask for, and how people should contact you. No design tools, no template setup, no blank page.",
  },
  {
    step: "02",
    title: "Found builds the site around your business.",
    body: "Found writes the page copy, chooses a layout, selects industry photos, prepares service or menu sections, and shapes the site around the way customers decide who to call.",
  },
  {
    step: "03",
    title: "You review it and go live.",
    body: "Use your Found web address right away, or connect your own domain. The dashboard gives you a simple place to update photos, copy, leads, and business tools from your phone.",
  },
]

const APP_WORKFLOWS = [
  { title: "Website updates", body: "Edit headlines, about copy, contact details, services, menu items, products, and featured updates without opening a design editor." },
  { title: "Photos from the field", body: "Take or upload a photo, assign it to the right job or album, and heart the best shots so they can appear on the public website." },
  { title: "Leads and contacts", body: "New inquiries, quote requests, orders, and bookings land in one mobile dashboard so the owner can respond quickly." },
  { title: "Orders and bookings", body: "Restaurants, shops, wellness businesses, and service providers can add online ordering, simple product checkout, reservations, or booking tools." },
  { title: "Estimates and payments", body: "Quote-first businesses can send estimates, collect deposits, accept pay-later approvals, and keep payment status visible." },
  { title: "Launch basics", body: "Found handles the site structure, sitemap, mobile experience, and domain path so the owner can share a professional site fast." },
]

const FAQS = [
  {
    q: "How does Found build a website for my business?",
    a: "Found asks a few questions about your business, then builds a finished website with copy, page structure, calls to action, photos, and industry-specific sections. You do not use a drag-and-drop editor.",
  },
  {
    q: "How fast can my business go live with Found?",
    a: "Most owners can review and share their Found site the same day. You can use a Found web address immediately or connect your own domain when ready.",
  },
  {
    q: "Can I update my website after it launches?",
    a: "Yes. The mobile dashboard lets you update copy, contact details, services, menus, products, featured updates, and website photos without touching code or design settings.",
  },
  {
    q: "What business tools does Found include?",
    a: "Depending on the plan, Found can include leads, contacts, field photos, online ordering, product checkout, bookings, estimates, deposits, payments, email marketing, and review-focused follow-up tools.",
  },
  {
    q: "Is Found different from Wix, Squarespace, or Shopify?",
    a: "Yes. Wix and Squarespace are website builders, and Shopify is built for full ecommerce. Found is built for local businesses that want a finished website and practical business tools from one mobile dashboard.",
  },
]

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: TITLE,
      description: DESCRIPTION,
      isPartOf: { "@id": `https://${ROOT_DOMAIN}/#website` },
      about: [
        "AI website builder for local businesses",
        "mobile business dashboard",
        "small business website launch",
        "online ordering, bookings, estimates, and payments",
      ],
    },
    {
      "@type": "HowTo",
      "@id": `${PAGE_URL}#howto`,
      name: "How Found builds and launches a local business website",
      description: "The three-step Found process: answer questions, get a finished website, then launch and manage it from your phone.",
      step: BUILD_STEPS.map((item, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: item.title,
        text: item.body,
      })),
    },
    {
      "@type": "FAQPage",
      "@id": `${PAGE_URL}#faq`,
      mainEntity: FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
  ],
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: FOUND_BLACK }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteNav />

      <main>
        <section className="px-6 pt-36 pb-16 md:px-10 md:pt-40 md:pb-24">
          <div className="mx-auto max-w-5xl">
            <p className="mb-5 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
              How Found works
            </p>
            <h1 className="max-w-4xl text-5xl font-normal leading-[0.98] tracking-normal text-white md:text-7xl">
              Your website, business tools, and launch path in one mobile system.
            </h1>
            <p className="mt-7 max-w-2xl text-base font-medium leading-8 text-white/60 md:text-lg">
              Found is not a template editor. It asks the right questions, builds the site, helps you launch, and gives you a phone-first dashboard for the work that happens after someone finds you.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/?start=1"
                className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90"
                style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
              >
                Get my site
              </Link>
              <Link
                href="/plans"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/15 px-8 text-sm font-black uppercase tracking-widest text-white transition hover:border-white/35"
              >
                Compare plans
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20 md:px-10">
          <div className="mx-auto grid max-w-5xl gap-px overflow-hidden border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
            {BUILD_STEPS.map((item) => (
              <div key={item.step} className="bg-[#0B0E0C] p-7" style={{ borderTop: `2px solid ${SIGNAL_GREEN}` }}>
                <p className="mb-6 text-xs font-black uppercase tracking-[0.2em]" style={{ color: SIGNAL_GREEN }}>{item.step}</p>
                <h2 className="text-2xl font-normal leading-tight text-white">{item.title}</h2>
                <p className="mt-4 text-sm font-medium leading-7 text-white/58">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0B0E0C] px-6 py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
                  After launch
                </p>
                <h2 className="text-4xl font-normal leading-tight text-white md:text-5xl">
                  The site keeps working from your phone.
                </h2>
                <p className="mt-5 text-base font-medium leading-8 text-white/55">
                  The launch is only step one. Found gives owners a simple place to manage the business tools that turn traffic into calls, bookings, orders, quotes, and payments.
                </p>
              </div>
              <div className="grid gap-px overflow-hidden border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2">
                {APP_WORKFLOWS.map((item) => (
                  <div key={item.title} className="bg-[#080A09] p-6">
                    <h3 className="text-lg font-black leading-tight text-white">{item.title}</h3>
                    <p className="mt-3 text-sm font-medium leading-7 text-white/52">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
              Built for local search
            </p>
            <div className="grid gap-8 md:grid-cols-[1.05fr_0.95fr] md:items-start">
              <div>
                <h2 className="text-4xl font-normal leading-tight text-white md:text-5xl">
                  Found gives search engines and answer engines a real business to understand.
                </h2>
                <p className="mt-5 text-base font-medium leading-8 text-white/55">
                  Every Found site starts with the fundamentals: clear service language, mobile-first pages, contact paths, sitemap coverage, industry context, and structured content that can answer real customer questions.
                </p>
              </div>
              <div className="space-y-4 border-l border-white/[0.08] pl-6">
                {[
                  "Clear page titles and descriptions for discovery.",
                  "Industry and service language written in plain English.",
                  "Mobile-first pages that customers can act on quickly.",
                  "FAQs and structured answers for AEO and GEO surfaces.",
                  "Sitemaps and canonical URLs for indexable pages.",
                ].map((item) => (
                  <p key={item} className="flex gap-3 text-sm font-medium leading-7 text-white/62">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: SIGNAL_GREEN }} />
                    <span>{item}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#0B0E0C] px-6 py-20 md:px-10 md:py-24">
          <div className="mx-auto max-w-3xl">
            <p className="mb-10 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
              Questions
            </p>
            <div className="space-y-px overflow-hidden border border-white/[0.08] bg-white/[0.08]">
              {FAQS.map((faq) => (
                <div key={faq.q} className="bg-[#080A09] p-6">
                  <h2 className="text-lg font-black leading-tight text-white">{faq.q}</h2>
                  <p className="mt-3 text-sm font-medium leading-7 text-white/55">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 text-center md:px-10 md:py-24">
          <div className="mx-auto max-w-2xl">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
              Launch today
            </p>
            <h2 className="text-4xl font-normal leading-tight text-white md:text-5xl">
              Answer the questions. See the site. Get found.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base font-medium leading-8 text-white/55">
              {isIntroRatePeriod ? "Intro rates are available for launch. Your site can be ready today, with your rate locked for the first year." : "Your site can be ready today, with the tools to keep it useful after launch."}
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/?start=1"
                className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90"
                style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
              >
                Get my site
              </Link>
              <Link
                href="/industries"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/15 px-8 text-sm font-black uppercase tracking-widest text-white transition hover:border-white/35"
              >
                Find your industry
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}