import type { Metadata } from "next"
import PlanPage from "@/components/PlanPage"

export const metadata: Metadata = {
  title: "Found Pro — $39/month | Never Lose a Lead Again",
  description: "Every inquiry followed up automatically. Your own domain, a contact list that builds itself, and your crew contributing photos from the field — $39/month.",
  openGraph: {
    title: "Found Pro — $39/month | Never Lose a Lead Again",
    description: "Automated follow-up, contact database, team photo uploads, and every lead handled — without lifting a finger.",
    url: "https://foundco.app/plans/found-pro",
  },
}

export default function FoundProPlanPage() {
  return (
    <PlanPage
      plan="found_pro"
      name="Found Pro"
      identity="Never lose a lead again."
      price={39}
      normalPrice={69}
      closingLine="Never let another lead slip."
      featured
      tagline="Your business runs itself while you work."
      description="Most businesses lose clients not because of bad work, but because they forgot to follow up. Found Pro fixes that — every inquiry gets answered, followed up, and tracked automatically. You stay focused on the job. Found handles the rest."
      features={[
        { label: "Everything in Found", desc: "Complete website, your own web address, industry photos, lead capture, and the photo system that keeps your site fresh." },
        { label: "Every lead followed up — automatically", desc: "When someone contacts you, Found sends them a confirmation right away. Then checks in three days later. Then one final message a week after that. All sent on your behalf, all sounding like you. Every single time." },
        { label: "See who's interested and ready to hire", desc: "Found shows you exactly who opened your follow-up, who clicked through, and who's been reading every message. So you know where to focus your time." },
        { label: "All your leads in one place", desc: "Reply to any inquiry directly from Found without switching to your email app. Your whole conversation history is right there." },
        { label: "Your entire contact list, organized", desc: "Every person who's ever reached out to you is saved as a contact — with what they asked about, when they reached out, and every message you've exchanged." },
        { label: "Your crew contributes from the field", desc: "Your employees or crew get a simple upload link — not full account access. They take photos on the job and upload them. You see them in Found and decide what goes on your website and social." },
        { label: "Rewrite any page on your site, anytime", desc: "Added a new service? Moved to a new city? Want a different tone? Found rewrites any section of your website in seconds — no designer, no developer." },
      ]}
      faqs={[
        { q: "What makes Pro worth the extra $10/month over Found?", a: "The follow-up sequence. Businesses that follow up within the first few days are far more likely to close a lead. Found Pro does it automatically, for every single inquiry, forever. Most Pro customers recover the cost on their first extra closed job." },
        { q: "How does the automatic follow-up work?", a: "When someone fills out your contact form, they get an immediate reply. Three days later, Found sends a check-in on your behalf. Seven days later, one final message. All of them look like they came from you — your business name, your phone number, your tone." },
        { q: "What does 'your crew contributes from the field' mean?", a: "You give your employees or subcontractors a simple upload link. They take photos at a job site and send them through. Those photos appear in Found for you to review. You heart them to go on the website, star them for social — the crew never sees your contacts, your leads, or your business data." },
        { q: "Can I downgrade to Found if I don't need all of this?", a: "Yes, anytime. Your website stays live and your domain stays connected. You'd lose the automatic follow-up and contact history, but nothing is deleted." },
        { q: "Is Found Pro right if it's just me running my business?", a: "Especially then. When you're running everything yourself, the automated follow-up does the job you don't have time to do. Every lead gets attention even when you're on a job, on the weekend, or just busy." },
      ]}
    />
  )
}
