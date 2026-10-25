import type { Metadata } from "next"
import Link from "next/link"
import MarketingInfoPage from "@/components/MarketingInfoPage"

export const metadata: Metadata = {
  title: "Support | Found",
  description: "Contact Found support for website help, cancellation, content export requests, and account deletion requests.",
  alternates: { canonical: "https://foundco.app/support" },
}

export default function SupportPage() {
  return (
    <MarketingInfoPage title="Support" description="Help with your Found website or account starts with an email.">
      <section>
        <h2 className="text-2xl font-normal text-white mb-4">Contact support</h2>
        <p>Email <a href="mailto:hello@foundco.app" className="text-[#32D074] underline break-all">hello@foundco.app</a> with your business name, site address, and what you need help with.</p>
        <p className="mt-4">Use the email address associated with your account. Do not send passwords or full payment card details.</p>
      </section>
      <section>
        <h2 className="text-2xl font-normal text-white mb-4">Cancel your subscription</h2>
        <p>Support assists with cancellation requests. Email <a href="mailto:hello@foundco.app" className="text-[#32D074] underline break-all">hello@foundco.app</a> and include your business name or site address.</p>
        <p className="mt-4">See the <Link href="/terms#section-3" className="text-[#32D074] underline">Terms of Service</Link> for cancellation and billing details.</p>
      </section>
      <section>
        <h2 className="text-2xl font-normal text-white mb-4">Request a content export</h2>
        <p>Email <a href="mailto:hello@foundco.app" className="text-[#32D074] underline break-all">hello@foundco.app</a> to request an export of your content. Export requests are handled by support.</p>
        <p className="mt-4">The <Link href="/terms#section-14" className="text-[#32D074] underline">Terms of Service</Link> describe a 90-day window after your subscription ends to request an export. Retention after account closure is not guaranteed.</p>
      </section>
      <section>
        <h2 className="text-2xl font-normal text-white mb-4">Account deletion and privacy</h2>
        <p>To request account deletion or exercise your privacy rights, email <a href="mailto:hello@foundco.app" className="text-[#32D074] underline break-all">hello@foundco.app</a>.</p>
        <p className="mt-4">See our <Link href="/privacy" className="text-[#32D074] underline">Privacy Policy</Link> for details and applicable limitations.</p>
      </section>
    </MarketingInfoPage>
  )
}
