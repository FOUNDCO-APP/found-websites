import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Salon Website | Found — Get Your Salon Online Today",
  description: "A professional website for your hair salon, barber shop, or beauty studio. Show your work, book clients, get found on Google. Starting at $29/month.",
  openGraph: {
    title: "Salon Website | Found",
    description: "Get your salon or barber shop online today. Show your best work, capture leads, and get found by clients searching near you.",
    url: "https://foundco.app/industries/salons",
  },
}

export default function SalonsPage() {
  return (
    <IndustryPage
      industry="salons"
      eyebrow="For salons, barbers & beauty studios"
      headline="New clients are searching for a stylist right now. Are they finding you?"
      subheadline="The best stylists in town are losing clients to competitors who simply have a better website. Found builds yours today — so your work speaks for itself before anyone sits in your chair."
      description="A professional website for your salon or barber shop. Showcase your best looks, capture booking inquiries, and show up when people in your area search for a stylist. Live today."
      features={[
        { label: "A gallery that shows off your best work", desc: "Your most impressive cuts, colors, and styles front and center. Finish a look, take a photo, heart it in Found — it's on your website gallery instantly. Your portfolio grows with every job." },
        { label: "Booking inquiries straight to you", desc: "Every contact form submission comes to you immediately with the client's name, number, and what they're looking for. No third-party booking app required to get started." },
        { label: "Your services and pricing, clearly presented", desc: "Found builds a clean services page with your cuts, colors, treatments, and pricing. Clients know exactly what to expect before they book." },
        { label: "Turn finished looks into social posts", desc: "Star a photo in Found and it becomes branded square, portrait, and story post drafts. Post your best work without opening a separate editing app." },
        { label: "A professional presence when clients search nearby", desc: "Found sites are built with your neighborhood, your specialty, and your business name structured for local search — so your business is easy to find online." },
        { label: "Professional copy that builds trust instantly", desc: "Your website copy is written around what makes your salon worth choosing — your experience, your style, your approach. Not generic salon copy. Yours." },
      ]}
      faqs={[
        { q: "How do I get a website for my salon?", a: "Tell Found about your salon — your name, your specialty (cuts, color, extensions, etc.), your location, and your style. Found writes the copy, selects professional beauty photography, and builds the site. You're live in under 10 minutes." },
        { q: "Can clients book appointments through the website?", a: "Found includes a contact form for booking inquiries on every plan. Pro and Business plans include more advanced scheduling features. For launch, clients contact you directly and you confirm — simple and immediate." },
        { q: "How do I show my work on the site?", a: "Take a photo of a finished look. Open Found, heart it, and it goes live on your gallery. Star it and Found creates branded social post drafts you can share or download." },
        { q: "Will clients be able to find my salon online?", a: "Found sites include your location, your specialty, and your business name structured for local search. How quickly your site gets traction depends on your market, your domain age, and local competition." },
        { q: "What if I want to add a new stylist to the team?", a: "Update your site directly from Found. Add a stylist, their specialties, and photos of their work — your site reflects your team as it grows." },
      ]}
      closingLine="Your best work deserves to be the first thing new clients see."
    />
  )
}
