import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Found vs. Wix & Squarespace | Found",
  description: "Wix and Squarespace still hand you a drag-and-drop editor to finish the design yourself, even with their AI. Found never hands you an editor at all. Starting at $29/month — intro rate expires August 15.",
  openGraph: {
    title: "Found vs. Wix & Squarespace | Found",
    description: "A drag-and-drop editor to finish yourself, or a finished site with nothing left to design. Here's the real difference.",
    url: "https://foundco.app/compare",
  },
}

export default function ComparePage() {
  return (
    <IndustryPage
      industry="compare"
      eyebrow="Found vs. website builders"
      headline="Wix gives you a website. Found gives you a business."
      subheadline="Wix and Squarespace can now auto-draft a starting site with AI — but you still land in a drag-and-drop editor afterward to actually finish it: moving sections, picking fonts, fixing how it looks on mobile. Found never hands you an editor at all."
      description="Found builds the site for you: real copy written for your trade and your town, photos chosen for your industry, pages laid out around how customers actually decide who to hire. Then it keeps going after launch — your job photos become marketing automatically, and quotes, orders, and payments run right from the same place. No dragging boxes, no separate apps, no agency."
      features={[
        { label: "No drag-and-drop editor, ever", desc: "Wix and Squarespace's AI can draft a starting point, but you still land in a visual editor to finish it yourself. Found never hands you a design tool — answer a few questions, and the finished site is what goes live." },
        { label: "Take a photo. It's on your site.", desc: "Finish a job, snap a photo, tap the heart in Found — it's live on your website and ready to become your next social post. Built the way CompanyCam works for contractors, except for every business, not just one trade." },
        { label: "Send a quote. Get paid.", desc: "Quotes and deposits from your phone, without learning QuickBooks. Built for a small business sending a handful of quotes a week, not an accounting department." },
        { label: "Take orders, right from your site", desc: "Built for restaurants that want to take orders and get paid online without adding a separate piece of software or a monthly Toast bill." },
        { label: "Sell without a separate store", desc: "Simple product sales with a real checkout, for a business selling a real menu of items — not a full Shopify-style storefront, and priced like it." },
        { label: "One system, not five logins", desc: "Website, leads, photos, quotes, and payments live in one place you check from your phone — instead of a website builder plus an invoicing app plus a separate way to show off your work." },
      ]}
      faqs={[
        { q: "What makes Found different from Wix or Squarespace?", a: "Wix and Squarespace can now auto-draft a starting site with AI, but real customization after that still takes real, hands-on time inside their drag-and-drop editor — moving sections, picking fonts, fixing how it looks on mobile. Found skips the editor completely: you answer a few questions, and the finished site is what goes live. No sections to drag, no fonts to pick, nothing left for you to design." },
        { q: "I already have a Wix or Squarespace site. Can I switch?", a: "Yes. Point your existing domain to Found, answer a few questions, and your business has a new site today. No agency, no waiting weeks for a redesign." },
        { q: "Is Found's shopping cart as powerful as Shopify?", a: "No, and it's not trying to be. Shopify is built for stores managing inventory across channels, shipping, and tax automation. Found's cart is built for a small business that wants to sell a straightforward set of products from their own site without paying for or learning a separate platform." },
        { q: "Is Found's online ordering the same as a Toast or restaurant POS system?", a: "No. Found doesn't run your kitchen — there's no kitchen display, ticket printer, or table management. It's a simple way for customers to order and pay from your website, and the order lands in your inbox instantly. If you need full POS hardware, Found isn't a replacement for that; it's a lightweight way to take orders online without adding one more system." },
        { q: "Do I need any design or tech experience to use Found?", a: "No. That's the whole difference from a template builder. There's no editor to learn — you answer questions about your business, and Found writes the copy, picks the photos, and builds the pages for you." },
      ]}
      closingLine="Stop building a website. Start running your business."
    />
  )
}
