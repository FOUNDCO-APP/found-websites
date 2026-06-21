import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Spa Website | Found — Get Your Spa Online Today",
  description: "A professional website for your spa, massage studio, or wellness center. Show your treatments, capture booking requests, and get found on Google. Starting at $29/month.",
  openGraph: {
    title: "Spa Website | Found",
    description: "Get your spa or wellness center online today. A professional site that captures booking requests and shows your treatments beautifully.",
    url: "https://foundco.app/industries/spas",
  },
}

export default function SpasPage() {
  return (
    <IndustryPage
      industry="spas"
      eyebrow="For spas, massage studios & wellness centers"
      headline="People searching for relaxation deserve to find you first."
      subheadline="Your clients come to you to feel taken care of. Your website should give them that feeling before they ever walk through the door. Found builds a spa website that earns trust on first sight."
      description="A professional website for your spa or wellness center. Your treatments, your atmosphere, your booking process — presented with the calm confidence your brand deserves. Live today."
      features={[
        { label: "A site that feels as good as your treatments", desc: "Found builds your spa website with the visual calm and professionalism that high-end wellness clients expect. Your services, your photos, your story — beautifully presented." },
        { label: "Treatment menu, clearly organized", desc: "Your massages, facials, body treatments, and packages presented clearly with descriptions and pricing. Clients know what to expect before they book." },
        { label: "Booking inquiries straight to you", desc: "Every contact form submission from your website is forwarded to you immediately — name, number, what they're interested in. No booking platform required to get started." },
        { label: "Your space and atmosphere, shown beautifully", desc: "Photograph your treatment rooms, your products, your team. Heart photos in Found and they appear on your website gallery instantly. Your ambiance is your sales pitch." },
        { label: "Found by people searching for spas near them", desc: "Found sites are structured for local wellness searches — massage near me, spa in [city], facial near me. Your location and services are connected the way Google needs to find you." },
        { label: "Gift certificate inquiries, captured", desc: "Spa gift certificates are one of the most searched wellness gifts. Your contact form captures those inquiries and gets them to you immediately." },
      ]}
      faqs={[
        { q: "How do I get a professional website for my spa?", a: "Tell Found about your spa — your treatments, your location, your atmosphere, and the experience you offer. Found writes the copy, selects beautiful wellness photography, and builds the site. You're live in under 10 minutes." },
        { q: "Can clients book appointments online?", a: "Found includes a contact form for booking inquiries. Clients submit their preferred date, treatment, and contact info — you confirm directly. Pro and Business plans include more advanced scheduling." },
        { q: "How do I show my space on the website?", a: "Photograph your treatment rooms, reception area, and products. Open Found, heart the photos you want on your site, and they appear in your gallery immediately. Your atmosphere sells itself." },
        { q: "Will my spa show up when people search for spas near me?", a: "Yes. Found sites are structured for local search — your location, your specialty treatments, and your business name are all connected the way Google needs to surface you to nearby clients." },
        { q: "We offer gift certificates — can we advertise that on the site?", a: "Yes. Your services page can highlight gift certificates as a purchase option, and your contact form captures gift certificate inquiries directly. This is especially valuable around holidays and Mother's Day." },
      ]}
      closingLine="Your clients are ready to relax. Make it easy for them to find you."
    />
  )
}
