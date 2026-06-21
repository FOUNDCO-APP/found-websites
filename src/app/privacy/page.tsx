import type { Metadata } from "next"
import Link from "next/link"
import SiteNav from "@/components/SiteNav"

export const metadata: Metadata = {
  title: "Privacy Policy | Found",
  description: "Privacy Policy for Found (foundco.app) — what data we collect, how we use it, who we share it with, and your rights as a user.",
  openGraph: {
    title: "Privacy Policy | Found",
    description: "Privacy Policy for Found (foundco.app).",
    url: "https://foundco.app/privacy",
  },
}

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

const SECTIONS = [
  "Who We Are",
  "What Data We Collect",
  "How We Use Your Data",
  "Who We Share Your Data With",
  "Your Lead and Contact Data",
  "Cookies and Analytics",
  "Data Retention",
  "Your Rights",
  "California Residents (CCPA)",
  "Children's Privacy",
  "Changes to This Policy",
  "Contact Us",
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: FOUND_BLACK }}>

      <SiteNav />

      {/* Page header */}
      <section className="px-6 pt-36 pb-12 md:px-10 max-w-3xl mx-auto">
        <p className="text-xs font-black uppercase tracking-[0.22em] mb-4" style={{ color: SIGNAL_GREEN }}>
          Legal
        </p>
        <h1 className="text-4xl font-normal leading-tight md:text-6xl text-white mb-5">
          Privacy Policy
        </h1>
        <p className="text-sm font-medium text-white/40">
          Last updated: June 21, 2026
        </p>
        <p className="mt-6 text-base text-white/55 font-medium leading-8 max-w-2xl">
          We built Found for small business owners, and we know you don&apos;t have time to read a document written by lawyers for lawyers. This policy is plain language. It tells you what data we collect, what we do with it, and what you can do about it.
        </p>
      </section>

      {/* Table of contents */}
      <section className="px-6 pb-10 md:px-10 max-w-3xl mx-auto">
        <div
          className="rounded-2xl p-7"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-xs font-black uppercase tracking-[0.2em] mb-5" style={{ color: SIGNAL_GREEN }}>
            Contents
          </p>
          <ol className="space-y-2">
            {SECTIONS.map((title, i) => (
              <li key={i}>
                <a
                  href={`#section-${i + 1}`}
                  className="text-sm font-medium text-white/50 hover:text-white transition-colors"
                >
                  {i + 1}. {title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Body */}
      <section className="px-6 pb-32 md:px-10 max-w-3xl mx-auto">
        <div className="space-y-16">

          {/* 1. Who We Are */}
          <div id="section-1">
            <SectionHeading number={1} title="Who We Are" />
            <Body>
              Found Co. LLC (&quot;Found,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the Found website platform at foundco.app. We build professional websites for local small businesses and provide the tools for managing leads, bookings, photos, and client communication.
            </Body>
            <Body>
              If you have questions about this Privacy Policy or how we handle your data, contact us at{" "}
              <a href="mailto:hello@foundco.app" className="transition-colors hover:text-white" style={{ color: SIGNAL_GREEN }}>
                hello@foundco.app
              </a>.
            </Body>
          </div>

          {/* 2. What Data We Collect */}
          <div id="section-2">
            <SectionHeading number={2} title="What Data We Collect" />
            <Subheading>Account data</Subheading>
            <Body>
              When you create a Found account, we collect your name, email address, business name, business type, city and state, and the phone number you provide. We also collect information you share during onboarding — your services, hours, and the details you give us to build your website.
            </Body>
            <Subheading>Payment data</Subheading>
            <Body>
              We use Stripe to process all payments. When you subscribe, Stripe collects your payment card information directly. Found never sees or stores your full card number, CVV, or billing address — only a tokenized reference provided by Stripe.
            </Body>
            <Subheading>Photos and content</Subheading>
            <Body>
              If you upload photos through Found, we store them on your behalf to display on your website and social exports. You retain ownership of photos you took yourself.
            </Body>
            <Subheading>Lead and contact data</Subheading>
            <Body>
              When someone fills out a contact form on your Found-powered website, their name, phone number, email address, and message are stored in your Found account. This data belongs to you — we store it on your behalf and use it only to deliver it to you and to send the automated reply you have configured.
            </Body>
            <Subheading>Usage data</Subheading>
            <Body>
              We collect basic information about how you use Found — pages visited in the dashboard, features used, and actions taken. This helps us improve the product. We do not sell this data.
            </Body>
          </div>

          {/* 3. How We Use Your Data */}
          <div id="section-3">
            <SectionHeading number={3} title="How We Use Your Data" />
            <Body>We use the data we collect to:</Body>
            <BulletList items={[
              "Build and operate your Found website and dashboard.",
              "Process your subscription payments through Stripe.",
              "Send you transactional emails: account confirmation, billing receipts, and support replies.",
              "Deliver leads and form submissions from your website to you in real time.",
              "Send automated replies on your behalf when a lead fills out your contact form.",
              "Provide customer support when you contact us.",
              "Improve the Found platform based on how users interact with it.",
              "Comply with our legal obligations.",
            ]} />
            <Body>
              We do not use your data for advertising. We do not sell your personal information to third parties.
            </Body>
          </div>

          {/* 4. Who We Share Your Data With */}
          <div id="section-4">
            <SectionHeading number={4} title="Who We Share Your Data With" />
            <Body>
              We share your data only with the service providers we need to operate Found. These are:
            </Body>
            <BulletList items={[
              "Supabase — our database and authentication provider. Your account data, website content, and lead data are stored in Supabase.",
              "Stripe — payment processing. Stripe handles all card data under their own privacy policy and PCI compliance.",
              "Resend — transactional email delivery. Resend sends account emails and automated lead replies on our behalf.",
            ]} />
            <Body>
              Each of these providers processes your data only as necessary to deliver their service to us, under their own privacy policies and our data processing agreements with them.
            </Body>
            <Body>
              We may disclose your data if required by law, a court order, or a government authority with jurisdiction over us. We will notify you of such a request to the extent permitted by law.
            </Body>
            <Body>
              If Found is acquired by or merged with another company, your data may be transferred to the successor entity. We will notify you before that happens and explain what choices you have.
            </Body>
          </div>

          {/* 5. Your Lead and Contact Data */}
          <div id="section-5">
            <SectionHeading number={5} title="Your Lead and Contact Data" />
            <Body>
              When a consumer submits a form on your Found-powered website, they are submitting their information to you — the business owner. Found stores that submission and delivers it to you. Found uses the data only to facilitate that delivery and to send the automated reply you configure.
            </Body>
            <Body>
              If a consumer wants to know what data a Found-powered business has about them, they should contact that business directly. Found is not the controller of that consumer relationship — you are.
            </Body>
            <Body>
              If a consumer contacts us to remove their data from a specific Found-powered business&apos;s account, we will relay that request to the business owner and assist with deletion if needed.
            </Body>
          </div>

          {/* 6. Cookies and Analytics */}
          <div id="section-6">
            <SectionHeading number={6} title="Cookies and Analytics" />
            <Body>
              Found uses cookies and similar technologies to keep you logged into your account and to understand how the platform is used. We do not use third-party advertising cookies or sell behavioral data to ad networks.
            </Body>
            <Body>
              The cookies we set are:
            </Body>
            <BulletList items={[
              "Authentication cookies — to keep you logged in to your Found dashboard.",
              "Session cookies — to maintain your state as you navigate the dashboard.",
            ]} />
            <Body>
              Your Found-powered public website (the site your customers see) does not set tracking cookies on your customers unless you have added third-party tracking scripts.
            </Body>
          </div>

          {/* 7. Data Retention */}
          <div id="section-7">
            <SectionHeading number={7} title="Data Retention" />
            <Body>
              We retain your account data for as long as your subscription is active, plus 90 days after cancellation. During that 90-day window, you can request an export of your content by emailing{" "}
              <a href="mailto:hello@foundco.app" className="transition-colors hover:text-white" style={{ color: SIGNAL_GREEN }}>
                hello@foundco.app
              </a>
              . After 90 days, your data may be permanently deleted.
            </Body>
            <Body>
              Lead and contact data submitted through your website is retained as long as your account is active. You can delete individual contacts or your full lead history from your Found dashboard at any time.
            </Body>
            <Body>
              We keep payment records (billing history, invoices) as required by applicable law, generally for a minimum of seven years.
            </Body>
          </div>

          {/* 8. Your Rights */}
          <div id="section-8">
            <SectionHeading number={8} title="Your Rights" />
            <Body>
              You have the right to:
            </Body>
            <BulletList items={[
              "Access the personal data we hold about you.",
              "Correct any inaccurate data in your account.",
              "Delete your account and the data associated with it (subject to legal retention requirements).",
              "Export your content within 90 days of cancellation.",
              "Object to certain processing of your data.",
            ]} />
            <Body>
              To exercise any of these rights, email us at{" "}
              <a href="mailto:hello@foundco.app" className="transition-colors hover:text-white" style={{ color: SIGNAL_GREEN }}>
                hello@foundco.app
              </a>
              . We will respond within 30 days.
            </Body>
            <Body>
              You can also delete your account at any time from your dashboard settings, which will begin the 90-day data retention window.
            </Body>
          </div>

          {/* 9. CCPA */}
          <div id="section-9">
            <SectionHeading number={9} title="California Residents (CCPA)" />
            <Body>
              If you are a California resident, the California Consumer Privacy Act (CCPA) gives you additional rights regarding your personal information.
            </Body>
            <Body>
              You have the right to:
            </Body>
            <BulletList items={[
              "Know what personal information we collect, use, disclose, and sell.",
              "Delete personal information we have collected about you, subject to certain exceptions.",
              "Opt out of the sale of your personal information — though we do not sell personal information.",
              "Non-discrimination for exercising your CCPA rights.",
            ]} />
            <Body>
              Found does not sell personal information as defined under CCPA. We do not share personal information with third parties for cross-context behavioral advertising.
            </Body>
            <Body>
              To exercise your CCPA rights, contact us at{" "}
              <a href="mailto:hello@foundco.app" className="transition-colors hover:text-white" style={{ color: SIGNAL_GREEN }}>
                hello@foundco.app
              </a>
              {" "}with the subject line &quot;CCPA Request.&quot;
            </Body>
          </div>

          {/* 10. Children */}
          <div id="section-10">
            <SectionHeading number={10} title="Children's Privacy" />
            <Body>
              Found is a business platform and is not directed at children under 13. We do not knowingly collect personal information from anyone under 13 years of age. If you believe we have inadvertently collected such information, contact us at hello@foundco.app and we will delete it promptly.
            </Body>
          </div>

          {/* 11. Changes */}
          <div id="section-11">
            <SectionHeading number={11} title="Changes to This Policy" />
            <Body>
              We may update this Privacy Policy from time to time. When we do, we will update the &quot;Last updated&quot; date at the top of this page. For material changes, we will send a notice to the email address on your account. Continuing to use Found after an update takes effect means you accept the revised policy.
            </Body>
          </div>

          {/* 12. Contact */}
          <div id="section-12">
            <SectionHeading number={12} title="Contact Us" />
            <Body>
              For any privacy-related questions or requests:
            </Body>
            <div
              className="mt-6 rounded-2xl p-7"
              style={{ backgroundColor: "rgba(50,208,116,0.05)", border: "1px solid rgba(50,208,116,0.15)" }}
            >
              <p className="text-sm font-black text-white mb-1">Found Co. LLC</p>
              <p className="text-sm text-white/55 mb-1">Tucson, Arizona, USA</p>
              <a
                href="mailto:hello@foundco.app"
                className="text-sm font-medium transition-colors hover:text-white"
                style={{ color: SIGNAL_GREEN }}
              >
                hello@foundco.app
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* Footer strip */}
      <div
        className="px-6 py-10 md:px-10 text-center"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-xs text-white/25 font-medium">
          &copy; {new Date().getFullYear()} Found Co. LLC. All rights reserved.{" "}
          <Link href="/terms" className="underline transition-colors hover:text-white/50" style={{ color: "rgba(255,255,255,0.25)" }}>
            Terms of Service
          </Link>
        </p>
      </div>

    </div>
  )
}

/* ── Sub-components ── */

function SectionHeading({ number, title }: { number: number; title: string }) {
  return (
    <div className="mb-5 flex items-baseline gap-3">
      <span className="text-xs font-black tabular-nums" style={{ color: SIGNAL_GREEN }}>
        {String(number).padStart(2, "0")}
      </span>
      <h2 className="text-2xl font-normal text-white md:text-3xl">{title}</h2>
    </div>
  )
}

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-7 mb-3 text-sm font-black uppercase tracking-[0.14em] text-white/70">
      {children}
    </h3>
  )
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 text-base font-medium leading-8 text-white/55">
      {children}
    </p>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-3 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-[11px] h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: SIGNAL_GREEN }} />
          <span className="text-base font-medium leading-8 text-white/55">{item}</span>
        </li>
      ))}
    </ul>
  )
}
