import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Photography Website | Found — Your Portfolio Online",
  description: "A professional portfolio website for photographers. Show your work, capture booking inquiries, and grow with Found Pro or Business.",
  openGraph: {
    title: "Photography Website | Found",
    description: "A photography portfolio site that captures booking requests and shows your work. Review your site, then activate when ready.",
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
      description="A professional portfolio website for your photography business. Your galleries, your specialties, your booking process — presented for your review before you activate. Custom-domain setup can take longer."
      features={[
        { label: "A portfolio that shows your style", desc: "Add shots from a shoot. The heart saves a private Favorite; it does not publish. Turn on Gallery to publish, or choose Use on Page for a page background." },
        { label: "Your shoots, organized by project", desc: "Upload and organize photos by shoot — weddings, portraits, commercial, events. Clients can see exactly the style of work relevant to what they're booking." },
        { label: "Booking inquiries straight to you", desc: "Every booking request comes to you immediately with name, number, event date, and what they're looking for. You respond, they book. Simple." },
        { label: "Inquiries get an automatic reply right away", desc: "When a potential client contacts you, they automatically get a professional response. You look available and responsive even when you're on a shoot." },
        { label: "Turn shoots into branded social posts", desc: "Star a photo in Found and it becomes branded square, portrait, and story post drafts you can share or download without cropping or editing." },
        { label: "A professional presence when clients search for a photographer", desc: "Found sites are built with your photography specialty, your location, and your business name structured for local search — so clients looking for a photographer in your area can find you." },
      ]}
      faqs={[
        { q: "How do I get a photography portfolio website?", a: "Answer a few questions about your specialties, location, and style. Review your site, then activate when ready. Custom-domain setup can take longer." },
        { q: "How do I add my photos to the site?", a: "Take or upload your shots. The heart saves a private Favorite, not a public photo. Turn on Gallery to publish, or choose Use on Page for a page background." },
        { q: "Will clients be able to find me when they search for a photographer?", a: "Found sites include your photography specialty, your location, and your business name structured for local search. How quickly your site gains visibility depends on your market, your domain, and local competition." },
        { q: "Can I show different galleries for different types of photography?", a: "Yes. Found's album system lets you organize photos by shoot type — weddings, portraits, commercial, events. Clients looking for a wedding photographer see your wedding work specifically." },
        { q: "What if I already have a portfolio site on another platform?", a: "Switch to Found and consolidate. Your photos, your booking form, and your contact info all in one place — updated from your phone, not a complicated dashboard. Point your existing domain to Found and you're live." },
      ]}
      closingLine="The best photographer for the job is the one clients can actually find."
    />
  )
}
