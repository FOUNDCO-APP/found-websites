import type { Metadata } from "next"
import Link from "next/link"
import MarketingInfoPage from "@/components/MarketingInfoPage"

export const metadata: Metadata = {
  title: "Contact | Found",
  description: "Contact Found Co. LLC in Tucson, Arizona at hello@foundco.app.",
  alternates: { canonical: "https://foundco.app/contact" },
}

export default function ContactPage() {
  return (
    <MarketingInfoPage title="Contact Found" description="Questions about Found, your website, or your account? Get in touch by email.">
      <section>
        <h2 className="text-2xl font-normal text-white mb-4">Email us</h2>
        <a href="mailto:hello@foundco.app" className="text-[#32D074] underline break-all">hello@foundco.app</a>
        <p className="mt-4">If you already use Found, include your business name and site address so we can understand your request. Do not send passwords or full payment card details.</p>
      </section>
      <section>
        <h2 className="text-2xl font-normal text-white mb-4">Found Co. LLC</h2>
        <p>Tucson, Arizona, USA</p>
        <p className="mt-4">For website help, cancellation, content export requests, or account deletion requests, visit <Link href="/support" className="text-[#32D074] underline">Support</Link>.</p>
      </section>
    </MarketingInfoPage>
  )
}
