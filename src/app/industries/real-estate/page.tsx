import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Real Estate Agent Website | Found",
  description: "A professional website for real estate agents and property managers. Your listings, your story, and a Pro-first path for capturing leads.",
  openGraph: {
    title: "Real Estate Agent Website | Found",
    description: "A professional real estate site that captures buyer and seller leads and shows your listings. Review your site, then activate when ready.",
    url: "https://foundco.app/industries/real-estate",
  },
}

export default function RealEstatePage() {
  return (
    <IndustryPage
      industry="real-estate"
      eyebrow="For real estate agents & property managers"
      headline="Every buyer and seller you don't have a website for is someone else's client."
      subheadline="Give buyers and sellers a clear place to learn about your work. Found builds your site for you to review, then activate when ready."
      description="A professional website for your real estate business. Your listings, your background, your contact information — ready for your review. Custom-domain setup can take longer."
      features={[
        { label: "A professional presence that earns trust immediately", desc: "Your website copy is written to position you as the expert in your area — your market knowledge, your track record, your approach to helping clients buy and sell." },
        { label: "Your listings and property photos, chosen by you", desc: "Photograph properties. The heart saves a private Favorite; it does not publish. Turn on Gallery to publish, or choose Use on Page for a page background." },
        { label: "Buyer and seller leads, straight to your phone", desc: "Every inquiry from your website comes to you immediately with name, number, and what they're looking for. You're notified the moment an inquiry arrives — so you can respond first." },
        { label: "Inquiries get an automatic reply right away", desc: "When someone contacts you, they automatically receive a professional response from your business. You look available and responsive even when you're showing a property." },
        { label: "Your own domain, looking established", desc: "youragency.com or yourname.com — connected to Found. When clients Google you after a referral, they find a professional site that confirms you're the real deal." },
        { label: "A professional presence when buyers and sellers search nearby", desc: "Found sites are built with your market area, your specialty, and your business name structured for local search — so serious buyers and sellers can find you." },
      ]}
      faqs={[
        { q: "How do I get a real estate agent website?", a: "Answer a few questions about your market and specialty. Review your site, then activate when ready. Custom-domain setup can take longer." },
        { q: "Can I show my current listings on the site?", a: "Yes. You can add listing photos through Found and they appear on your gallery. For a full MLS-connected listing system, Found Business includes more advanced property management features." },
        { q: "Will buyers and sellers be able to find me online?", a: "Found sites include your market area, your specialty, and your business name structured for local search. How quickly your site builds visibility depends on your market, your domain, and the competition in your area." },
        { q: "I get most of my business from referrals. Do I still need a website?", a: "More than ever. When a referral Googles you, what do they find? A professional website converts a warm referral into a signed client. Without one, you're relying entirely on that first phone call going perfectly." },
        { q: "What about my headshot and bio?", a: "Found includes an About section where your photo and bio appear prominently. Update it anytime from Found as your experience and credentials grow." },
      ]}
      closingLine="The best referral you can give yourself is a website worth finding. Now you have one."
    />
  )
}
