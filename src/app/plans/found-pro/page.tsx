import type { Metadata } from "next"
import PlanPage from "@/components/PlanPage"

export const metadata: Metadata = {
  title: "Found Pro — $69/month | Website + Leads + Custom Domain for Growing Businesses",
  description: "Everything in Found plus a custom domain, 3-email lead follow-up sequences, lead tracking, contact database, and worker photo uploads. Built for businesses that are growing.",
  openGraph: {
    title: "Found Pro — $69/month | Website + Leads + Custom Domain for Growing Businesses",
    description: "Custom domain, automated lead follow-up, contact database, and team photo uploads. The complete system for a growing local business.",
    url: "https://foundco.app/plans/found-pro",
  },
}

export default function FoundProPlanPage() {
  return (
    <PlanPage
      plan="found_pro"
      name="Found Pro"
      identity="For the growing business"
      price={69}
      featured
      tagline="Your business runs itself while you work."
      description="Found Pro adds the systems that growing businesses need — a real domain, automated lead follow-up so no inquiry falls through the cracks, a contact database, and the ability for your team to contribute photos from the field."
      features={[
        { label: "Everything in Found", desc: "Full website, lead capture, auto-reply, photo pipeline." },
        { label: "Custom domain", desc: "Connect yourbusiness.com and show up professionally everywhere." },
        { label: "3-email lead follow-up sequence", desc: "Day 1 confirmation, day 3 check-in, day 7 final touch — all sent automatically, all branded to your business." },
        { label: "Lead open & click tracking", desc: "See who opened your follow-up, who clicked, and who's ready to buy." },
        { label: "Reply to leads from dashboard", desc: "Respond directly from Found without switching to your email app." },
        { label: "Contact database", desc: "Every lead is saved as a contact — with their history, what they asked about, and every email exchanged." },
        { label: "Workers can submit photos", desc: "Your crew takes photos on the job. They upload to Found. You heart or star them — they never touch your personal camera roll." },
        { label: "Claude copy regeneration", desc: "Rewrite any section of your website on demand. New service? New location? Done in seconds." },
      ]}
      faqs={[
        { q: "What makes Pro worth the extra $30/month?", a: "The lead follow-up sequence alone. Studies show businesses that follow up within an hour are 7x more likely to close a lead. Found Pro does it automatically — for every single inquiry, forever." },
        { q: "How does the custom domain work?", a: "You point your existing domain to Found (we walk you through it), or buy a new one through your registrar. Takes about 5 minutes." },
        { q: "What does 'workers can submit photos' mean?", a: "Your employees or subcontractors get a simple upload link — not full account access. They upload photos from a job site. You see them in Found and decide which ones go on the website or social." },
        { q: "Can I downgrade to Found if I don't need all of this?", a: "Yes, anytime. Your site stays live. You'd lose the custom domain routing and lead sequences, but nothing is deleted." },
        { q: "Is Found Pro right for a one-person business?", a: "Absolutely — especially if you're getting consistent leads and want to make sure none go cold. The automation works whether you have 1 employee or 10." },
      ]}
    />
  )
}
