import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Spa Website | Found — Your Spa Online",
  description: "A professional website for your spa, massage studio, or wellness center. Show treatments, capture booking requests, and grow with Found Pro or Business.",
  openGraph: {
    title: "Spa Website | Found",
    description: "A spa or wellness website that captures booking requests and presents your treatments. Review your site, then activate when ready.",
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
      description="A professional website for your spa or wellness center. Your treatments, your atmosphere, your booking process — ready for your review. Custom-domain setup can take longer."
      features={[
        { label: "A site that feels as good as your treatments", desc: "Found builds your spa website with the visual calm and professionalism that high-end wellness clients expect. Your services, your photos, your story — beautifully presented." },
        { label: "Treatment menu, clearly organized", desc: "Your massages, facials, body treatments, and packages presented clearly with descriptions and pricing. Clients know what to expect before they book." },
        { label: "Booking inquiries straight to you", desc: "Every contact form submission from your website is forwarded to you immediately — name, number, what they're interested in. No booking platform required to get started." },
        { label: "Your space and atmosphere, shown clearly", desc: "Photograph your treatment rooms, products, and team. The heart saves a private Favorite; it does not publish. Turn on Gallery to publish, or choose Use on Page for a page background." },
        { label: "A professional presence when clients search nearby", desc: "Found sites are built with your location, your treatments, and your business name structured for local search — so clients looking for a spa in your area can find you." },
        { label: "Gift certificate inquiries, captured", desc: "Spa gift certificates are one of the most searched wellness gifts. Your contact form captures those inquiries and gets them to you immediately." },
      ]}
      faqs={[
        { q: "How do I get a professional website for my spa?", a: "Answer a few questions about your treatments, location, and atmosphere. Review your site, then activate when ready. Custom-domain setup can take longer." },
        { q: "Can clients book appointments online?", a: "Found includes a contact form for booking inquiries. Clients submit their preferred date, treatment, and contact info — you confirm directly. Pro and Business plans include more advanced scheduling." },
        { q: "How do I show my space on the website?", a: "Photograph your treatment rooms, reception area, and products. Turn on Gallery to publish a photo, or choose Use on Page for a page background. The heart only saves a private Favorite." },
        { q: "Will clients be able to find my spa online?", a: "Found sites include your location, your treatments, and your business name structured for local search. How quickly your site gets traction depends on your market, your domain, and local competition." },
        { q: "We offer gift certificates — can we advertise that on the site?", a: "Yes. Your services page can highlight gift certificates as a purchase option, and your contact form captures gift certificate inquiries directly. This is especially valuable around holidays and Mother's Day." },
      ]}
      closingLine="Your clients are ready to relax. Make it easy for them to find you."
    />
  )
}
