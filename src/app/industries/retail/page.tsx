import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Retail Store Website | Found — Get Your Shop Online Today",
  description: "A professional website for your retail shop or boutique. Show your products, your story, and your hours. Get found on Google. Starting at $29/month.",
  openGraph: {
    title: "Retail Store Website | Found",
    description: "Get your retail shop or boutique online today. Show your products beautifully and get found by local shoppers.",
    url: "https://foundco.app/industries/retail",
  },
}

export default function RetailPage() {
  return (
    <IndustryPage
      industry="retail"
      eyebrow="For retail shops & boutiques"
      headline="Local shoppers are looking for exactly what you sell. Help them find you."
      subheadline="When someone searches for a shop like yours in your neighborhood, the business with a real website gets the visit. Found gets you that website today."
      description="A professional website for your retail store or boutique. Your products, your story, your hours and location — all presented in a way that makes people want to walk in the door. Live today."
      features={[
        { label: "Show your products at their best", desc: "Photograph your products and collections. Heart them in Found and they appear on your website gallery instantly. Your inventory becomes your best marketing." },
        { label: "Your store's story and personality, front and center", desc: "Found writes copy that captures what makes your shop worth visiting — your curation, your sourcing, your neighborhood presence. Not a generic retail description." },
        { label: "Hours, location, and contact — always current", desc: "Update your hours for holidays, new location details, or seasonal changes directly from Found. Customers always have the right information before they make the trip." },
        { label: "Inquiries and special orders, captured instantly", desc: "Customers looking for something specific or wanting to place a special order can contact you through your site. Every message comes to your phone immediately." },
        { label: "Found by local shoppers searching near them", desc: "Found sites are structured for local shopping searches. Your neighborhood, your product category, your store name — connected the way Google needs to bring foot traffic to your door." },
        { label: "Share your products on social, instantly", desc: "Star a product photo in Found and it's sized perfectly for Instagram and Facebook. Your best products reach your social audience without any editing or resizing." },
      ]}
      faqs={[
        { q: "How do I get a website for my retail store?", a: "Tell Found about your shop — what you sell, where you are, what makes you worth visiting. Found writes the copy, selects retail photography matched to your category, and builds the site. You're live in under 10 minutes." },
        { q: "Can I sell products online through my Found site?", a: "The base Found plan is built around driving foot traffic and phone inquiries. Found Business includes more advanced e-commerce capabilities for online selling." },
        { q: "Will local shoppers find my store on Google?", a: "Yes. Found sites are built to help local retailers appear when people search for shops in your neighborhood or product category. Your location, your store type, and your name are all connected the way Google needs." },
        { q: "How do I keep my inventory fresh on the site?", a: "Take product photos, heart them in Found, and they appear on your site gallery. When seasons change or new products arrive, take new photos. Your gallery stays current with your actual inventory." },
        { q: "What if I have a sale or event coming up?", a: "Update your site copy directly from Found to promote upcoming sales, events, or seasonal collections. Your site reflects your business in real time." },
      ]}
      closingLine="Your shop deserves a window on the internet. This is it."
    />
  )
}
