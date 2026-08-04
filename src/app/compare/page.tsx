import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Found vs. Wix & Squarespace | Found",
  description: "Wix and Squarespace give you a blank template and a lot of building to do yourself. Found builds the site, picks the photos, and hands you the tools to actually run your business. Starting at $29/month — intro rate expires August 15.",
  openGraph: {
    title: "Found vs. Wix & Squarespace | Found",
    description: "A template and a blank canvas, or a finished site and the tools to run your business. Here's the real difference.",
    url: "https://foundco.app/compare",
  },
}

export default function ComparePage() {
  return (
    <IndustryPage
      industry="compare"
      eyebrow="Found vs. website builders"
      headline="Wix gives you a website. Found gives you a business."
      subheadline="A template builder hands you a blank canvas, a drag-and-drop editor, and a monthly bill — then it's on you to write the copy, pick the photos, and figure out what goes where."
      description="Found builds the site for you: real copy written for your trade and your town, photos chosen for your industry, pages laid out around how customers actually decide who to hire. Then it keeps going after launch — your job photos become marketing automatically, and quotes, orders, and payments run right from the same place. No dragging boxes, no separate apps, no agency."
      features={[
        { label: "Nobody builds it for you on Wix", desc: "Found writes your copy, picks your photos, and builds every page — tuned to your industry and your town. Answer a few questions; there's nothing to drag, drop, or design yourself." },
        { label: "Take a photo. It's on your site.", desc: "Finish a job, snap a photo, tap the heart in Found — it's live on your website and ready to become your next social post. Built the way CompanyCam works for contractors, except for every business, not just one trade." },
        { label: "Send a quote. Get paid.", desc: "Quotes and deposits from your phone, without learning QuickBooks. Built for a small business sending a handful of quotes a week, not an accounting department." },
        { label: "Take orders, right from your site", desc: "Built for restaurants that want to take orders and get paid online without adding a separate piece of software or a monthly Toast bill." },
        { label: "Sell without a separate store", desc: "Simple product sales with a real checkout, for a business selling a real menu of items — not a full Shopify-style storefront, and priced like it." },
        { label: "One system, not five logins", desc: "Website, leads, photos, quotes, and payments live in one place you check from your phone — instead of a website builder plus an invoicing app plus a separate way to show off your work." },
      ]}
      faqs={[
        { q: "What makes Found different from Wix or Squarespace?", a: "Wix and Squarespace are tools you build with — you're still the one writing the copy, choosing the layout, and finding the photos. Found builds the actual site for you: the copy is written, the photos are selected, the layout is set up for how your kind of business wins customers. You answer questions; Found handles the rest." },
        { q: "I already have a Wix or Squarespace site. Can I switch?", a: "Yes. Point your existing domain to Found, answer a few questions, and your business has a new site today. No agency, no waiting weeks for a redesign." },
        { q: "Is Found's shopping cart as powerful as Shopify?", a: "No, and it's not trying to be. Shopify is built for stores managing inventory across channels, shipping, and tax automation. Found's cart is built for a small business that wants to sell a straightforward set of products from their own site without paying for or learning a separate platform." },
        { q: "Is Found's online ordering the same as a Toast or restaurant POS system?", a: "No. Found doesn't run your kitchen — there's no kitchen display, ticket printer, or table management. It's a simple way for customers to order and pay from your website, and the order lands in your inbox instantly. If you need full POS hardware, Found isn't a replacement for that; it's a lightweight way to take orders online without adding one more system." },
        { q: "Do I need any design or tech experience to use Found?", a: "No. That's the whole difference from a template builder. There's no editor to learn — you answer questions about your business, and Found writes the copy, picks the photos, and builds the pages for you." },
      ]}
      closingLine="Stop building a website. Start running your business."
    />
  )
}
