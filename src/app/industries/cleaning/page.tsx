import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Cleaning Business Website | Found",
  description: "A professional website for your cleaning business or maid service. Capture leads, look established, and grow with Found Pro or Business.",
  openGraph: {
    title: "Cleaning Business Website | Found",
    description: "A cleaning business website that captures leads and presents your services. Review your site, then activate when ready.",
    url: "https://foundco.app/industries/cleaning",
  },
}

export default function CleaningPage() {
  return (
    <IndustryPage
      industry="cleaning"
      eyebrow="For cleaning businesses & maid services"
      headline="When someone needs a cleaner, they Google it. Show up."
      subheadline="Give customers a clear place to learn about your cleaning services and contact you. Review your Found site, then activate when ready."
      description="A professional website for your cleaning business. Your services, your service area, your pricing structure — presented for your review. Custom-domain setup can take longer."
      features={[
        { label: "A professional site that earns immediate trust", desc: "Cleaning clients invite you into their homes. Your website is the first trust signal. Found builds a professional, clean site that tells clients you're established, reliable, and ready to work." },
        { label: "Your services and rates, presented clearly", desc: "Found builds a services page that covers what you clean, how you price it, and what's included. Clients know what to expect before they even pick up the phone." },
        { label: "Quote requests and bookings, straight to you", desc: "Every quote request from your website comes to your phone immediately — address, home size, what they need. You respond, you book, you work." },
        { label: "Every inquiry answered the moment it arrives", desc: "When a potential client submits a request, they immediately receive a professional response. You look responsive 24/7 even when you're on a job." },
        { label: "A professional presence when clients search for cleaners nearby", desc: "Found sites are built with your location, your services, and your business name structured for local search — so potential clients in your area have a way to find you." },
        { label: "Show your before-and-after photos", desc: "Photograph your work before and after. The heart saves a private Favorite; it does not publish. Turn on Gallery to publish, or choose Use on Page for a page background." },
      ]}
      faqs={[
        { q: "How do I get a website for my cleaning business?", a: "Answer a few questions about your cleaning services and service area. Review your site, then activate when ready. Custom-domain setup can take longer." },
        { q: "Will clients be able to find my cleaning business online?", a: "Found sites include your service area, your type of cleaning, and your business name structured for local search. How quickly your site gains visibility depends on your market, your domain, and local competition." },
        { q: "How do I get quote requests from the website?", a: "Every contact form submission on your Found site is forwarded to you immediately. Clients include their address, what they need cleaned, and their contact info. You respond with a quote and book the job." },
        { q: "Can I show before-and-after photos?", a: "Yes. Photograph your work, then turn on Gallery for the photos you want to publish. The heart saves a private Favorite and does not publish." },
        { q: "I get all my clients from word of mouth. Do I need a website?", a: "Every referral you get Googles you before they call. What they find determines whether they follow through. A professional website converts your referrals — without it, you're losing a percentage of every warm lead you've already earned." },
      ]}
      closingLine="Your cleaning business does great work. Now the internet knows it."
    />
  )
}
