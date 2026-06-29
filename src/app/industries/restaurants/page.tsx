import type { Metadata } from "next"
import IndustryPage from "@/components/IndustryPage"

export const metadata: Metadata = {
  title: "Restaurant Website | Found — Get Your Restaurant Online Today",
  description: "A professional restaurant website in minutes. Your menu, your photos, your story — with a contact form that turns visitors into reservations. Starting at $29/month.",
  openGraph: {
    title: "Restaurant Website | Found",
    description: "Get your restaurant, café, or food business online today. Professional photos, your menu, and a site that brings people through the door.",
    url: "https://foundco.app/industries/restaurants",
  },
}

export default function RestaurantsPage() {
  return (
    <IndustryPage
      industry="restaurants"
      eyebrow="For restaurants, cafés & food businesses"
      headline="People are searching for a place to eat. Make sure they find yours."
      subheadline="When someone searches for a restaurant near them, they click the one that looks worth it. Found builds you a site that makes your food — and your story — impossible to scroll past."
      description="A professional website for your restaurant, café, or food business. Beautiful food photography, your story, your hours, and a contact form for reservations and catering inquiries. Live today."
      features={[
        { label: "A site that makes food look incredible", desc: "Found curates professional food photography matched to your cuisine style and uses your own photos as you add them. First impressions are everything — yours will be good." },
        { label: "Your story, told right", desc: "The copy on your site isn't generic. It's written around what makes your place different — your neighborhood, your style, your reason for opening. People feel it before they walk in." },
        { label: "Reservations and catering inquiries, straight to you", desc: "Every inquiry from your website comes to you immediately. No third-party booking platform taking a cut. Just a direct line from your website to your phone." },
        { label: "Your menu and hours, always current", desc: "Update your site directly from Found when your hours change or you add a seasonal menu. No waiting for a web designer, no FTP, no code." },
        { label: "Take a food photo. It's on your site.", desc: "Plate something beautiful, take a photo. Heart it in Found and it goes live on your gallery. Star it and Found turns it into branded social post drafts. No editing app needed." },
        { label: "A professional presence when locals search for food nearby", desc: "Found sites are built with your neighborhood, your cuisine type, and your name structured for local search — so hungry people in your area have a way to find you." },
      ]}
      faqs={[
        { q: "How do I get a website for my restaurant?", a: "Tell Found about your restaurant — your name, cuisine style, neighborhood, vibe, and what makes you worth visiting. Found builds the site from that. Professional copy, matched food photography, complete pages. You're live in under 10 minutes." },
        { q: "Can I show my menu on the site?", a: "Yes. You can add your menu items and pricing through Found, and they appear on your site. When your menu changes seasonally, update it directly from your phone." },
        { q: "Will people be able to find my restaurant online?", a: "Found sites are built with your location, your cuisine, and your business name structured for local search. A well-built site is the foundation — how quickly it gains traction depends on your market and how long your domain has been active." },
        { q: "What about reservations — does Found handle online booking?", a: "Found Pro and Found Business include more advanced booking features. The base plan includes a contact form for reservation requests and catering inquiries that come straight to you." },
        { q: "I use Instagram to show food photos. Is that enough?", a: "Instagram is great for discovery but doesn't rank on Google, can't take reservations, and disappears when the algorithm changes. Your website is the permanent home for your restaurant's story — Instagram feeds it, Found builds it." },
      ]}
      closingLine="Your restaurant deserves a real home on the internet. Now it has one."
    />
  )
}
