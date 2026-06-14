import type { Metadata } from "next"
import PlanPage from "@/components/PlanPage"

export const metadata: Metadata = {
  title: "Found — $39/month | Professional Website for Solo Business Owners",
  description: "Get a professional website built in minutes. Lead capture, auto-reply emails, photo pipeline, and industry-curated content — all for $39/month with a 14-day free trial.",
  openGraph: {
    title: "Found — $39/month | Professional Website for Solo Business Owners",
    description: "Get a professional website built in minutes. Lead capture, auto-reply emails, and a photo pipeline that feeds your site and social automatically.",
    url: "https://foundco.app/plans/found",
  },
}

export default function FoundPlanPage() {
  return (
    <PlanPage
      plan="found"
      name="Found"
      identity="For the solo owner"
      price={39}
      tagline="Your business, professionally online — today."
      description="You do great work. Found makes sure people can find you, contact you, and trust you before they even pick up the phone. A complete website, lead capture, and photo pipeline — set up in minutes."
      features={[
        { label: "Professional website", desc: "5 pages built for your industry — Home, About, Services, Gallery, Contact. Claude writes the copy." },
        { label: "foundco.app subdomain", desc: "Go live immediately at yourbusiness.foundco.app. Upgrade to a custom domain anytime." },
        { label: "Industry photo library", desc: "Curated, professional photos matched to your industry — not random stock images." },
        { label: "Contact form + lead capture", desc: "Every inquiry is saved and forwarded to you instantly." },
        { label: "Lead auto-reply email", desc: "When someone fills out your form, they automatically get a branded confirmation — making your business look responsive 24/7." },
        { label: "Photo pipeline", desc: "Take a photo after a job. Heart it — it goes live on your website. Star it — it's sized and ready for Instagram and Facebook." },
      ]}
      faqs={[
        { q: "How long does it take to go live?", a: "Most businesses are live in under 10 minutes. You answer a few questions, Found builds the site, and you see the finished result." },
        { q: "Do I need any technical skills?", a: "None. Found asks you questions in plain English. No templates, no drag-and-drop, no code." },
        { q: "What happens after the 14-day trial?", a: "You're charged $39/month starting day 15. You can cancel anytime before that and you won't be charged." },
        { q: "Can I upgrade to Pro or Business later?", a: "Yes — upgrade anytime from your dashboard. Your site, leads, and photos carry over." },
        { q: "What's the photo pipeline?", a: "You take a photo on your phone. Heart it in Found and it automatically appears on your website gallery. Star it and it's exported in the right dimensions for Instagram and Facebook posts — no resizing, no Canva." },
      ]}
    />
  )
}
