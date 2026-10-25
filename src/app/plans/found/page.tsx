import type { Metadata } from "next"
import PlanPage from "@/components/PlanPage"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Found Starter | Your Business Website",
  description: "A complete professional website, your own web address, and photos you choose to publish. Review your site, then activate when ready. See current Found Starter pricing.",
  openGraph: {
    title: "Found Starter | Your Business Website",
    description: "A complete website, your own web address, industry photos, and lead capture. Review your site, then activate when ready.",
    url: "https://foundco.app/plans/found",
  },
}

export default function FoundPlanPage() {
  return (
    <PlanPage
      plan="found"
      name="Found Starter"
      identity="Start here."
      price={29}
      normalPrice={39}
      closingLine="Your business, ready for its next chapter."
      tagline="Your business, professionally presented."
      description="A complete website, your own web address, and a photo system you control. Answer a few questions, review your site, then activate when ready. Custom-domain setup can take longer."
      features={[
        { label: "A complete website", desc: "Five pages built for your business — Home, About, Services, Gallery, and Contact. Professional copy written for you, matched to what you actually do." },
        { label: "Your own web address", desc: "Connect yourbusiness.com and show up professionally everywhere — Google, text messages, business cards, everywhere." },
        { label: "Beautiful photos for your industry", desc: "Curated, professional photos matched to your type of business. Not random stock images — photos that look like your work." },
        { label: "Leads come straight to you", desc: "Every inquiry from your website is saved and forwarded to you the moment it comes in. Nothing falls through the cracks." },
        { label: "Inquiries get an automatic reply right away", desc: "When someone fills out your form, they automatically get a professional reply — making your business look responsive around the clock, even when you're on a job." },
        { label: "Choose which photos appear on your site", desc: "Take or upload a photo. The heart saves a private Favorite; it does not publish. Turn on Gallery to publish it, or choose Use on Page for a page background." },
      ]}
      faqs={[
        { q: "How do I get my site live?", a: "Answer a few questions, review your site, then activate when ready. Custom-domain setup can take longer." },
        { q: "Do I need any technical skills?", a: "None. Found asks you questions in plain English — your business name, what you do, where you're based, and how you want to sound. No templates, no drag-and-drop, no code." },
        { q: "Can I use my own domain name?", a: "Yes — every plan includes your own web address. You can connect an existing domain you already own, or buy a new one through any registrar. We walk you through it." },
        { q: "Can I upgrade to Pro or Business later?", a: "Contact Found to review an upgrade and confirm the price and any remaining promotional period before changing plans. Your site, leads, and photos carry over." },
        { q: "How does the photo system work?", a: "Take or upload photos from your phone. The heart is a private Favorite, not a publishing control. Turn on Gallery to publish a photo, or choose Use on Page to place it on a page." },
      ]}
    />
  )
}
