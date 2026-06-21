import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Website for Contractors | Found — Get Online in 10 Minutes",
  description: "Get a professional contractor website built in minutes. Your services, your photos, leads coming straight to your phone. Starting at $29/month — founding rate expires July 15.",
  openGraph: {
    title: "Website for Contractors | Found",
    description: "A professional website for your contracting business. Leads come straight to your phone. Up in under 10 minutes.",
    url: "https://foundco.app/industries/contractors",
  },
}

export default function ContractorsPage() {
  return (
    <IndustryPage
      industry="contractors"
      eyebrow="For contractors & home services"
      headline="Stop losing jobs to contractors with better websites."
      subheadline="Right now, someone in your area is Googling what you do. They'll call the first business that looks professional and trustworthy online. Found makes sure that's you."
      description="Found builds your contracting business a complete professional website — your services, your work photos, your contact form — and gets you live today. When a lead comes in, you're notified immediately. No web designer, no monthly agency fees."
      features={[
        { label: "A complete website, built for your trade", desc: "Five pages written for your contracting business — Home, About, Services, Gallery, and Contact. Professional copy that makes you sound established, trustworthy, and ready to work." },
        { label: "Your project gallery, always up to date", desc: "Finish a job, take a photo. Heart it in Found and it appears on your website gallery automatically. Your best work, front and center, with zero extra effort." },
        { label: "Leads come straight to your phone", desc: "Every estimate request from your website is forwarded to you the moment it arrives. Name, phone number, what they need. Nothing falls through the cracks." },
        { label: "Every inquiry answered instantly", desc: "When someone submits a request, they immediately get a professional response from your business — not Found. You look responsive 24/7, even when you're on a job." },
        { label: "Your own web address", desc: "Connect yourbusiness.com to Found. Show up professionally on Google, in text messages, on business cards. Not a template URL — your actual domain." },
        { label: "Built for how contractors win jobs", desc: "Your phone number is the primary call to action. Contact form for estimates. Gallery front and center. Built around how homeowners actually decide who to hire." },
      ]}
      faqs={[
        { q: "How do I get a website for my contracting business?", a: "Answer a few questions about your business — what you do, where you work, how you want to sound. Found writes the copy, picks professional photos matched to your trade, and builds the site. You're live in under 10 minutes." },
        { q: "Will this help my contracting business show up on Google?", a: "Yes. Every Found site is built with a real domain, structured copy, and your location — the three things Google needs to connect you with local searches. Most contractors start appearing in local search results within 2–4 weeks." },
        { q: "I already have a website but it's outdated. Can Found replace it?", a: "Yes. Point your existing domain to Found, answer the questions, and your business has a new professional site today. No agency required, no waiting weeks for a designer." },
        { q: "What if I get a new big project and want to add it to my site?", a: "Take a photo on your phone. Open Found, heart it, and it's on your website gallery. That's it. Your site stays current without you having to think about it." },
        { q: "What makes Found different from a website builder like Wix or Squarespace?", a: "Found builds the site for you — you don't build it yourself. The copy is written, the photos are selected, the layout is set up for how contractors win jobs. There's nothing to drag, drop, or design. You answer questions; Found handles everything else." },
      ]}
      closingLine="Your next job found you online. You just didn't have a site."
    />
  )
}
