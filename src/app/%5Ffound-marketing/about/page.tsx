import type { Metadata } from "next"
import Link from "next/link"
import MarketingInfoPage from "@/components/MarketingInfoPage"

export const metadata: Metadata = {
  title: "About | Found",
  description: "Found is a phone-first website and business platform from Found Co. LLC in Tucson, Arizona.",
  alternates: { canonical: "https://foundco.app/about" },
}

export default function AboutPage() {
  return (
    <MarketingInfoPage title="About Found" description="Found is a website and business platform for local small businesses, operated by Found Co. LLC in Tucson, Arizona.">
      <section>
        <h2 className="text-2xl font-normal text-white mb-4">Built around your phone</h2>
        <p>Running a business does not always happen at a desk. Found brings website and business tools together in a product designed for use from your phone.</p>
      </section>
      <section>
        <h2 className="text-2xl font-normal text-white mb-4">Your photos, your choices</h2>
        <p>Camera and photo tools help you capture and organize business images. You choose which photos appear on your site and where they belong.</p>
      </section>
      <section>
        <h2 className="text-2xl font-normal text-white mb-4">Find what fits your business</h2>
        <p>Features vary by plan. <Link href="/plans" className="text-[#32D074] underline">Compare plans</Link> to see what is included, or <Link href="/contact" className="text-[#32D074] underline">contact us</Link> with a question.</p>
      </section>
    </MarketingInfoPage>
  )
}
