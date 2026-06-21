import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Real Estate Agent Website | Found — Get Online in 10 Minutes",
  description: "A professional website for real estate agents and property managers. Your listings, your story, leads straight to your phone. Starting at $29/month.",
  openGraph: {
    title: "Real Estate Agent Website | Found",
    description: "Get your real estate business online today. A professional site that captures buyer and seller leads and shows your listings beautifully.",
    url: "https://foundco.app/industries/real-estate",
  },
}

export default function RealEstatePage() {
  return (
    <IndustryPage
      industry="real-estate"
      eyebrow="For real estate agents & property managers"
      headline="Every buyer and seller you don't have a website for is someone else's client."
      subheadline="In real estate, trust is everything. A professional website is the first signal that you're established, credible, and worth calling. Found builds yours today."
      description="A professional website for your real estate business. Your listings, your track record, your contact information — all presented with the credibility that earns buyer and seller trust. Live today."
      features={[
        { label: "A professional presence that earns trust immediately", desc: "Your website copy is written to position you as the expert in your area — your market knowledge, your track record, your approach to helping clients buy and sell." },
        { label: "Your listings and property photos, beautifully presented", desc: "Photograph properties, heart them in Found, and they appear on your website gallery instantly. Your best listings are always on display — no manual updating." },
        { label: "Buyer and seller leads, straight to your phone", desc: "Every inquiry from your website comes to you immediately with name, number, and what they're looking for. First-response speed is everything in real estate — Found makes sure you're always first." },
        { label: "Every inquiry answered instantly", desc: "When someone contacts you, they immediately receive a professional response from your business. You look available and responsive even when you're showing a property." },
        { label: "Your own domain, looking established", desc: "youragency.com or yourname.com — connected to Found. When clients Google you after a referral, they find a professional site that confirms you're the real deal." },
        { label: "Found by buyers and sellers searching in your market", desc: "Found sites are structured for local real estate searches. Your area, your specialty (residential, commercial, rentals), and your name — connected the way Google needs to find you." },
      ]}
      faqs={[
        { q: "How do I get a real estate agent website?", a: "Tell Found about your business — your name, your market, your specialty, and how you work. Found writes professional agent copy, selects real estate photography, and builds the site. You're live in under 10 minutes." },
        { q: "Can I show my current listings on the site?", a: "Yes. You can add listing photos through Found and they appear on your gallery. For a full MLS-connected listing system, Found Business includes more advanced property management features." },
        { q: "Will buyers and sellers find me on Google?", a: "Yes. Found sites include your market area, your specialty, and your business name structured the way Google needs to surface you in local real estate searches. Most agents start appearing in local results within a few weeks." },
        { q: "I get most of my business from referrals. Do I still need a website?", a: "More than ever. When a referral Googles you, what do they find? A professional website converts a warm referral into a signed client. Without one, you're relying entirely on that first phone call going perfectly." },
        { q: "What about my headshot and bio?", a: "Found includes an About section where your photo and bio appear prominently. Update it anytime from Found as your experience and credentials grow." },
      ]}
      closingLine="The most trusted agent in your market has the best website. Now that's you."
    />
  )
}
