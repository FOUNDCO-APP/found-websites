import type { Metadata } from "next"
import Link from "next/link"
import SiteNav from "@/components/SiteNav"

export const metadata: Metadata = {
  title: "Terms of Service | Found",
  description: "Terms of Service for Found (foundco.app) — the website platform built for local small businesses. Read about subscriptions, cancellations, intellectual property, and your rights.",
  openGraph: {
    title: "Terms of Service | Found",
    description: "Terms of Service for Found (foundco.app).",
    url: "https://foundco.app/terms",
  },
}

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

const SECTIONS = [
  "Acceptance of Terms",
  "Description of Service",
  "Subscription Plans, Billing, and Cancellation",
  "User Responsibilities",
  "Acceptable Use",
  "Intellectual Property",
  "Stock Photos (Pexels)",
  "AI-Generated Copy",
  "Email Sending on Your Behalf",
  "No Guarantee of Results",
  "Limitation of Liability",
  "Indemnification",
  "Privacy",
  "Termination and What Happens to Your Site",
  "Governing Law",
  "Contact Us",
]

export default function TermsPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: FOUND_BLACK }}>

      <SiteNav />

      {/* Page header */}
      <section className="px-6 pt-36 pb-12 md:px-10 max-w-3xl mx-auto">
        <p className="text-xs font-black uppercase tracking-[0.22em] mb-4" style={{ color: SIGNAL_GREEN }}>
          Legal
        </p>
        <h1 className="text-4xl font-normal leading-tight md:text-6xl text-white mb-5">
          Terms of Service
        </h1>
        <p className="text-sm font-medium text-white/40">
          Last updated: June 21, 2026
        </p>
        <p className="mt-6 text-base text-white/55 font-medium leading-8 max-w-2xl">
          These are the rules of the road for using Found. We wrote them in plain language because you are running a business, not a law firm. Please read them — they explain what we do, what you own, and what to expect.
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

          {/* 1. Acceptance of Terms */}
          <div id="section-1">
            <SectionHeading number={1} title="Acceptance of Terms" />
            <Body>
              By creating an account, starting a free trial, or paying for a Found subscription, you agree to these Terms and Conditions in full. If you do not agree, do not use the platform.
            </Body>
            <Body>
              These Terms form a binding agreement between you (the business owner) and Found Co. LLC, a company operating at foundco.app ("Found," "we," "us," or "our"). "You" means the person or entity that owns the Found account.
            </Body>
            <Body>
              We may update these Terms from time to time. When we do, we will update the "Last updated" date at the top of this page and, for material changes, send a notice to the email address on your account. Continuing to use Found after an update takes effect means you accept the revised Terms.
            </Body>
          </div>

          {/* 2. Description of Service */}
          <div id="section-2">
            <SectionHeading number={2} title="Description of Service" />
            <Body>
              Found is a subscription-based website platform for local small businesses. When you sign up, we build you a professional website — complete with pages, copy, and photos — and host it for you at a subdomain (for example, <span className="font-mono text-white/70 text-sm">yourbusiness.foundco.app</span>) or, on paid plans, at a custom domain you own.
            </Body>
            <Body>
              Depending on your plan, Found may also provide: lead capture forms, automated email replies to your leads, a photo upload and gallery system, contact management, appointment booking, estimate tools, and team access. Features vary by plan — see{" "}
              <Link href="/plans" className="underline transition-colors" style={{ color: SIGNAL_GREEN }}>
                foundco.app/plans
              </Link>{" "}
              for the current breakdown.
            </Body>
            <Body>
              We reserve the right to modify, add, or remove features at any time. We will give reasonable advance notice for changes that significantly reduce your plan's core functionality.
            </Body>
          </div>

          {/* 3. Subscription Plans, Billing, and Cancellation */}
          <div id="section-3">
            <SectionHeading number={3} title="Subscription Plans, Billing, and Cancellation" />
            <Subheading>Plans and Pricing</Subheading>
            <Body>
              Found offers three subscription tiers: Found ($39/month), Found Pro ($69/month), and Found Business ($99/month). Prices shown at signup are the prices you pay. Promotional rates (such as our founding member pricing) are locked for the period stated at the time of purchase, then revert to the then-current standard price.
            </Body>
            <Subheading>Billing</Subheading>
            <Body>
              Subscriptions are billed monthly, automatically, on the same calendar day each month using the payment method on file. Payment is processed through Stripe. By subscribing, you authorize Found to charge your payment method on a recurring basis until you cancel.
            </Body>
            <Body>
              If a payment fails, we will attempt to collect it again. If payment cannot be collected, your account may be suspended or downgraded until the balance is resolved.
            </Body>
            <Subheading>Cancellation</Subheading>
            <Body>
              You may cancel your subscription at any time from your account dashboard or by contacting us at hello@foundco.app. Cancellation stops future billing immediately. Your site and account remain active through the end of the billing period you have already paid for.
            </Body>
            <Subheading>Refunds</Subheading>
            <Body>
              All subscription fees are non-refundable except where required by law. If you cancel mid-month, you will not receive a prorated refund for the unused portion of that billing period. If you believe a charge was made in error, contact us within 30 days and we will review it.
            </Body>
            <Subheading>Plan Changes</Subheading>
            <Body>
              You may upgrade or downgrade your plan at any time. Upgrades take effect immediately; the price difference is prorated for the current billing cycle. Downgrades take effect at the start of your next billing cycle.
            </Body>
          </div>

          {/* 4. User Responsibilities */}
          <div id="section-4">
            <SectionHeading number={4} title="User Responsibilities" />
            <Body>
              You are responsible for the content on your Found website. This includes your business name, services, pricing, hours, location, contact information, photos you upload, and any other details specific to your business.
            </Body>
            <Body>
              You agree to:
            </Body>
            <BulletList items={[
              "Keep your business information accurate and up to date.",
              "Review all AI-generated copy on your site before it goes live (see Section 8).",
              "Maintain the security of your account credentials and not share login access with unauthorized individuals.",
              "Notify us promptly at hello@foundco.app if you suspect unauthorized use of your account.",
              "Comply with all applicable local, state, and federal laws in connection with operating your business and using Found.",
            ]} />
            <Body>
              Found is a platform for business owners. You must be at least 18 years old and have the legal authority to enter into these Terms on behalf of your business.
            </Body>
          </div>

          {/* 5. Acceptable Use */}
          <div id="section-5">
            <SectionHeading number={5} title="Acceptable Use" />
            <Body>
              Found is built for legitimate local businesses. You agree not to use Found to:
            </Body>
            <BulletList items={[
              "Operate or advertise any illegal business or activity.",
              "Publish false, misleading, or defamatory content about any person or business.",
              "Send spam, unsolicited bulk messages, or harassing communications to your leads or contacts.",
              "Upload content that infringes a third party's copyright, trademark, or other intellectual property rights.",
              "Upload content that is obscene, hateful, or sexually explicit.",
              "Scrape, crawl, or copy the Found platform, its code, or its infrastructure.",
              "Interfere with or disrupt Found's servers, networks, or the experience of other users.",
              "Use Found to impersonate another business, person, or entity.",
              "Resell or sublicense Found to third parties without our written permission.",
            ]} />
            <Body>
              We may remove content or suspend accounts that violate these rules, without prior notice if necessary.
            </Body>
          </div>

          {/* 6. Intellectual Property */}
          <div id="section-6">
            <SectionHeading number={6} title="Intellectual Property" />
            <Subheading>You own your business content</Subheading>
            <Body>
              Any content that is uniquely yours — your business name, your logo, photos you took, your own written descriptions — belongs to you. Found does not claim ownership over your original business content.
            </Body>
            <Body>
              By uploading content to Found, you grant us a non-exclusive, royalty-free license to store, display, and deliver that content as part of operating your website. This license ends when you delete the content or close your account.
            </Body>
            <Subheading>Found owns the platform</Subheading>
            <Body>
              Everything else — the Found platform, codebase, design system, templates, onboarding flow, dashboard, and all software — is owned by Found Co. LLC. These Terms do not transfer any ownership of the Found platform to you. You receive a limited, non-exclusive, non-transferable license to use the platform during your active subscription.
            </Body>
            <Subheading>AI-generated copy</Subheading>
            <Body>
              Copy written by Found's AI on your behalf (headlines, service descriptions, about sections, etc.) is provided to you for use on your website. Once you approve it and it is published on your site, you may treat it as your business content. See Section 8 for important responsibilities around AI copy.
            </Body>
          </div>

          {/* 7. Stock Photos */}
          <div id="section-7">
            <SectionHeading number={7} title="Stock Photos (Pexels)" />
            <Body>
              Found sources stock photography from Pexels (pexels.com), which provides photos under the Pexels License. These photos are licensed for commercial use within the Found platform, meaning they may be displayed on your Found-hosted website.
            </Body>
            <Body>
              Important limitations:
            </Body>
            <BulletList items={[
              "Stock photos provided through Found may not be downloaded and used outside the Found platform (for example, in printed materials, social media posts, or other websites) without independently verifying the license terms on Pexels for each specific photo.",
              "You may not resell, sublicense, or claim ownership of any Pexels stock photo.",
              "Found does not guarantee that a specific stock photo will remain available. Photos may be rotated or replaced.",
            ]} />
            <Body>
              If you need photos for use beyond your Found website, we recommend sourcing them independently or uploading your own original photos, which you own.
            </Body>
          </div>

          {/* 8. AI-Generated Copy */}
          <div id="section-8">
            <SectionHeading number={8} title="AI-Generated Copy" />
            <Body>
              Found uses AI to write copy for your website — including headlines, service descriptions, about sections, and other text. This copy is written based on information you provide during onboarding (your business name, industry, location, services, and voice).
            </Body>
            <Body>
              You are responsible for reviewing all AI-generated copy before and after it is published on your site. Specifically:
            </Body>
            <BulletList items={[
              "AI copy may contain inaccuracies, outdated information, or language that does not reflect your actual business. It is your responsibility to read it and request changes if needed.",
              "Any claims made on your website — about your services, credentials, experience, or pricing — are your responsibility, regardless of whether AI generated them.",
              "Found is not liable for errors, omissions, or inaccuracies in AI-generated copy that you have published on your site.",
            ]} />
            <Body>
              You can update your site copy at any time from your dashboard. On Found Pro and Found Business plans, you can request a full page rewrite.
            </Body>
          </div>

          {/* 9. Email Sending on Your Behalf */}
          <div id="section-9">
            <SectionHeading number={9} title="Email Sending on Your Behalf" />
            <Body>
              Some Found plans send automated emails on behalf of your business — for example, an auto-reply sent to a lead who fills out your contact form. These emails are sent from Found's email infrastructure (via Resend) but appear to come from your business.
            </Body>
            <Body>
              By using these features, you:
            </Body>
            <BulletList items={[
              "Authorize Found to send emails on your behalf to contacts who have submitted your lead forms.",
              "Agree that you are the sender of record for those communications under applicable law.",
              "Accept responsibility for ensuring your email communications comply with the CAN-SPAM Act and any other applicable email laws in your jurisdiction.",
              "Acknowledge that your recipients are individuals who contacted you first through your website, not cold or unsolicited contacts.",
            ]} />
            <Body>
              Found is not a marketing email platform and is not designed for bulk email campaigns. Using Found's email features for mass mailings or spam is a violation of Section 5 (Acceptable Use) and may result in account suspension.
            </Body>
          </div>

          {/* 10. No Guarantee of Results */}
          <div id="section-10">
            <SectionHeading number={10} title="No Guarantee of Results" />
            <Body>
              Found gives you a professional website and the tools to be found online. We cannot guarantee — and expressly do not promise — any of the following:
            </Body>
            <BulletList items={[
              "Rankings in Google, Bing, or any other search engine.",
              "A specific number of leads, inquiries, or form submissions.",
              "Increased revenue or business growth.",
              "That your website will appear in local search results for any specific keyword or location.",
              "That any paid advertising, social media sharing, or other marketing you do will produce results.",
            ]} />
            <Body>
              Search engine visibility depends on many factors outside our control, including Google's algorithms, local competition, your domain history, and the quality and age of your content. We build you a solid, professional foundation — what you do with it is up to you.
            </Body>
          </div>

          {/* 11. Limitation of Liability */}
          <div id="section-11">
            <SectionHeading number={11} title="Limitation of Liability" />
            <Body>
              To the fullest extent permitted by applicable law, Found Co. LLC and its officers, employees, and contractors will not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of Found — including lost profits, lost revenue, lost data, or business interruption — even if we have been advised of the possibility of such damages.
            </Body>
            <Body>
              Our total liability to you for any claim arising out of or related to these Terms or the Found platform will not exceed the total amount you paid to Found in the three (3) months immediately preceding the event giving rise to the claim.
            </Body>
            <Body>
              Found is provided "as is" and "as available." We do not warrant that the platform will be uninterrupted, error-free, or free of security vulnerabilities. We will make reasonable efforts to maintain uptime and address issues promptly.
            </Body>
            <Body>
              Some jurisdictions do not allow the exclusion of certain warranties or limitations on liability. In those jurisdictions, the limitations above apply to the fullest extent permitted by law.
            </Body>
          </div>

          {/* 12. Indemnification */}
          <div id="section-12">
            <SectionHeading number={12} title="Indemnification" />
            <Body>
              You agree to defend, indemnify, and hold harmless Found Co. LLC and its officers, employees, and contractors from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from:
            </Body>
            <BulletList items={[
              "Content you publish on your Found website, including inaccurate business information or claims.",
              "Your violation of these Terms.",
              "Your violation of any applicable law or regulation.",
              "Any dispute between you and a customer, lead, or third party arising from your business operations.",
              "Your use of Found's email features in a way that violates CAN-SPAM or other applicable law.",
            ]} />
          </div>

          {/* 13. Privacy */}
          <div id="section-13">
            <SectionHeading number={13} title="Privacy" />
            <Body>
              Your use of Found is also governed by our Privacy Policy, available at{" "}
              <Link href="/privacy" className="underline transition-colors" style={{ color: SIGNAL_GREEN }}>
                foundco.app/privacy
              </Link>
              . The Privacy Policy explains what data we collect, how we use it, and your rights regarding that data.
            </Body>
            <Body>
              Found stores your account data and your website content in Supabase. Payment processing is handled by Stripe — Found does not store your full credit card number. Email delivery is handled by Resend. By using Found, you consent to data being processed by these third-party providers in accordance with their respective privacy policies.
            </Body>
            <Body>
              When a lead submits a form on your Found website, their contact information is stored in your Found account and used to send them the automated reply you have configured. You are responsible for handling that lead data appropriately and in compliance with applicable privacy laws.
            </Body>
          </div>

          {/* 14. Termination */}
          <div id="section-14">
            <SectionHeading number={14} title="Termination and What Happens to Your Site" />
            <Subheading>You can cancel anytime</Subheading>
            <Body>
              You may cancel your subscription at any time. Your site stays live through the end of your paid billing period. After that, your site is taken offline and your subdomain (yourbusiness.foundco.app) will no longer resolve.
            </Body>
            <Subheading>If we terminate your account</Subheading>
            <Body>
              We may suspend or terminate your account immediately and without prior notice if you violate these Terms, engage in fraudulent activity, or if required by law. In cases of termination for cause, you forfeit any remaining subscription period and no refund will be issued.
            </Body>
            <Subheading>Your data after cancellation</Subheading>
            <Body>
              After your subscription ends, we retain your account data for 90 days, during which you may contact us at hello@foundco.app to request an export of your content. After 90 days, your data may be permanently deleted. We do not guarantee data retention after account closure.
            </Body>
            <Subheading>Custom domains</Subheading>
            <Body>
              If you connected a custom domain to your Found website, that domain remains yours — we have no claim over it. After your subscription ends, you will need to update your DNS settings to point the domain elsewhere, or it will simply not resolve until you do.
            </Body>
          </div>

          {/* 15. Governing Law */}
          <div id="section-15">
            <SectionHeading number={15} title="Governing Law" />
            <Body>
              These Terms are governed by the laws of the State of Arizona, USA, without regard to its conflict of law provisions. Any disputes arising from or related to these Terms or your use of Found that cannot be resolved informally will be subject to the exclusive jurisdiction of the state and federal courts located in Pima County, Arizona.
            </Body>
            <Body>
              Before initiating any legal action, you agree to contact us at hello@foundco.app and give us 30 days to attempt to resolve the dispute informally.
            </Body>
          </div>

          {/* 16. Contact */}
          <div id="section-16">
            <SectionHeading number={16} title="Contact Us" />
            <Body>
              If you have questions about these Terms, your account, or anything else, reach out:
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
          <Link href="/privacy" className="underline transition-colors hover:text-white/50" style={{ color: "rgba(255,255,255,0.25)" }}>
            Privacy Policy
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
