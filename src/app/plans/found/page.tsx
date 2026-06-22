import type { Metadata } from "next"
import PlanPage from "@/components/PlanPage"

export const metadata: Metadata = {
  title: "Found Starter — $29/month | Get Your Business Online Today",
  description: "A complete professional website, your own web address, and a photo pipeline that keeps your site fresh — built in minutes for $29/month.",
  openGraph: {
    title: "Found Starter — $29/month | Get Your Business Online Today",
    description: "A complete website, your own web address, beautiful industry photos, and leads coming straight to you. Built in minutes.",
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
      closingLine="Your business is live tonight."
      tagline="Your business, professionally online — today."
      description="You do great work. Found makes sure people can find you, contact you, and trust you before they even pick up the phone. A complete website, your own domain, and a photo system that keeps your site looking fresh — set up in minutes."
      features={[
        { label: "A complete website", desc: "Five pages built for your business — Home, About, Services, Gallery, and Contact. Professional copy written for you, matched to what you actually do." },
        { label: "Your own web address", desc: "Connect yourbusiness.com and show up professionally everywhere — Google, text messages, business cards, everywhere." },
        { label: "Beautiful photos for your industry", desc: "Curated, professional photos matched to your type of business. Not random stock images — photos that look like your work." },
        { label: "Leads come straight to you", desc: "Every inquiry from your website is saved and forwarded to you the moment it comes in. Nothing falls through the cracks." },
        { label: "Inquiries get an automatic reply right away", desc: "When someone fills out your form, they automatically get a professional reply — making your business look responsive around the clock, even when you're on a job." },
        { label: "Take a photo. It's on your site.", desc: "Finish a job, take a photo. Heart it in Found and it appears on your website gallery. Star it and it's sized and ready to post on Instagram and Facebook — no resizing, no editing app." },
      ]}
      faqs={[
        { q: "How long does it take to go live?", a: "Most businesses are live in under 10 minutes. You answer a few questions about your business, Found builds the site, and you see the finished result right away." },
        { q: "Do I need any technical skills?", a: "None. Found asks you questions in plain English — your business name, what you do, where you're based, and how you want to sound. No templates, no drag-and-drop, no code." },
        { q: "Can I use my own domain name?", a: "Yes — every plan includes your own web address. You can connect an existing domain you already own, or buy a new one through any registrar. We walk you through it." },
        { q: "Can I upgrade to Pro or Business later?", a: "Yes — upgrade anytime from your dashboard. Your site, leads, and photos all carry over. Your intro rate stays locked in regardless of when you upgrade." },
        { q: "How does the photo system work?", a: "You take photos on your phone — after a job, at a project, anywhere. Open Found, heart a photo and it goes live on your website. Star it and it exports in the exact dimensions for Instagram and Facebook. No resizing, no Canva, no extra steps." },
      ]}
    />
  )
}
