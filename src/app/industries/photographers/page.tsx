import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Photography Website | Found — Get Your Portfolio Online Today",
  description: "A professional portfolio website for photographers. Show your work, capture booking inquiries, get found on Google. Starting at $29/month.",
  openGraph: {
    title: "Photography Website | Found",
    description: "Get your photography business online today. A beautiful portfolio site that captures booking requests and shows your best work.",
    url: "https://foundco.app/industries/photographers",
  },
}

export default function PhotographersPage() {
  return (
    <IndustryPage
      industry="photographers"
      eyebrow="For photographers & creative studios"
      headline="Your best work deserves a gallery the whole internet can find."
      subheadline="Clients hire photographers they can see before they meet. Found builds you a portfolio site that shows your eye, your style, and your range — and gets you found when people search for a photographer in your area."
      description="A professional portfolio website for your photography business. Your galleries, your specialties, your booking process — beautifully presented and easy to update after every shoot. Live today."
      features={[
        { label: "A portfolio that sells your style before you say a word", desc: "Found builds a gallery-first website designed around your photography. Add shots from any shoot, heart the ones you want live, and your portfolio stays current automatically." },
        { label: "Your shoots, organized by project", desc: "Upload and organize photos by shoot — weddings, portraits, commercial, events. Clients can see exactly the style of work relevant to what they're booking." },
        { label: "Booking inquiries straight to you", desc: "Every booking request comes to you immediately with name, number, event date, and what they're looking for. You respond, they book. Simple." },
        { label: "Inquiries get an automatic reply right away", desc: "When a potential client contacts you, they automatically get a professional response. You look available and responsive even when you're on a shoot." },
        { label: "Turn shoots into branded social posts", desc: "Star a photo in Found and it becomes branded square, portrait, and story post drafts you can share or download without cropping or editing." },
        { label: "A professional presence when clients search for a photographer", desc: "Found sites are built with your photography specialty, your location, and your business name structured for local search — so clients looking for a photographer in your area can find you." },
      ]}
      faqs={[
        { q: "How do I get a photography portfolio website?", a: "Tell Found about your photography business — your specialties, your location, your style, and the types of shoots you do. Found builds the site around your work. You're live in under 10 minutes, then add your photos immediately after." },
        { q: "How do I add my photos to the site?", a: "Take or import your best shots. Heart them in Found and they appear on your website gallery. Organize them by shoot or project. Your portfolio updates in real time as your work grows." },
        { q: "Will clients be able to find me when they search for a photographer?", a: "Found sites include your photography specialty, your location, and your business name structured for local search. How quickly your site gains visibility depends on your market, your domain, and local competition." },
        { q: "Can I show different galleries for different types of photography?", a: "Yes. Found's album system lets you organize photos by shoot type — weddings, portraits, commercial, events. Clients looking for a wedding photographer see your wedding work specifically." },
        { q: "What if I already have a portfolio site on another platform?", a: "Switch to Found and consolidate. Your photos, your booking form, and your contact info all in one place — updated from your phone, not a complicated dashboard. Point your existing domain to Found and you're live." },
      ]}
      closingLine="The best photographer for the job is the one clients can actually find."
    />
  )
}
