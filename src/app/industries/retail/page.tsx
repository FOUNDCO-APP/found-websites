import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Retail Store Website | Found — Your Shop Online",
  description: "A professional website for your retail shop or boutique. Show your products, your story, and your hours with a Pro-first growth path.",
  openGraph: {
    title: "Retail Store Website | Found",
    description: "A website for your retail shop or boutique. Show your products and help local shoppers find you. Review your site, then activate when ready.",
    url: "https://foundco.app/industries/retail",
  },
}

export default function RetailPage() {
  return (
    <IndustryPage
      industry="retail"
      eyebrow="For retail shops & boutiques"
      headline="Local shoppers are looking for exactly what you sell. Help them find you."
      subheadline="Give local shoppers a place to explore your shop before they visit. Found builds the site for you to review, then activate when ready."
      description="A professional website for your retail store or boutique. Your products, your story, your hours and location — ready for your review. Custom-domain setup can take longer."
      features={[
        { label: "Show your products at their best", desc: "Photograph your products and collections. The heart saves a private Favorite; it does not publish. Turn on Gallery to publish, or choose Use on Page for a page background." },
        { label: "Your store's story and personality, front and center", desc: "Found writes copy that captures what makes your shop worth visiting — your curation, your sourcing, your neighborhood presence. Not a generic retail description." },
        { label: "Hours, location, and contact — always current", desc: "Update your hours for holidays, new location details, or seasonal changes directly from Found. Customers always have the right information before they make the trip." },
        { label: "Inquiries and special orders, captured instantly", desc: "Customers looking for something specific or wanting to place a special order can contact you through your site. Every message comes to your phone immediately." },
        { label: "A professional presence when local shoppers search nearby", desc: "Found sites are built with your neighborhood, your product category, and your store name structured for local search — so shoppers looking for what you sell can find you." },
        { label: "Turn product photos into social posts", desc: "Star a product photo in Found and it becomes a branded post draft you can share, download, or caption-copy from your phone." },
      ]}
      faqs={[
        { q: "How do I get a website for my retail store?", a: "Answer a few questions about your shop and products. Review your site, then activate when ready. Custom-domain setup can take longer." },
        { q: "Can I sell products online through my Found site?", a: "The base Found plan is built around driving foot traffic and phone inquiries. Found Business includes more advanced e-commerce capabilities for online selling." },
        { q: "Will local shoppers be able to find my store online?", a: "Found sites are built with your location, your store type, and your product category structured for local search. How quickly your site builds visibility depends on your market, your domain, and local competition." },
        { q: "How do I keep my inventory fresh on the site?", a: "Take product photos and turn on Gallery for the ones you want to publish. The heart only saves a private Favorite. Review which photos remain public when your inventory changes." },
        { q: "What if I have a sale or event coming up?", a: "Update your site copy directly from Found to promote upcoming sales, events, or seasonal collections. Your site reflects your business in real time." },
      ]}
      closingLine="Your shop deserves a window on the internet. This is it."
    />
  )
}
