import type { Metadata } from "next"
import PlanPage from "@/components/PlanPage"

export const metadata: Metadata = {
  title: "Found Business — $69/month | Run Your Whole Business From Your Phone",
  description: "Clients book themselves, estimates go out automatically, and your full team is connected — all in one place for $69/month.",
  openGraph: {
    title: "Found Business — $69/month | Run Your Whole Business From Your Phone",
    description: "Online booking, professional estimates, unlimited team members, and a complete client history. One platform, one monthly fee.",
    url: "https://foundco.app/plans/found-business",
  },
}

export default function FoundBusinessPlanPage() {
  return (
    <PlanPage
      plan="found_business"
      name="Found Business"
      identity="Run your whole business."
      price={69}
      normalPrice={99}
      closingLine="Your business is built to impress — from the first search to the final invoice."
      tagline="Run your entire business from your phone."
      description="Found Business is everything a growing local business needs — from the first website visit to the final invoice. One platform. One monthly fee. No other software to pay for, learn, or switch between."
      features={[
        { label: "Everything in Found Pro", desc: "Complete website, your domain, automated lead follow-up, contact database, crew photo uploads, and copy that updates on demand." },
        { label: "Clients book themselves", desc: "Clients schedule directly from your website. You control your availability. No more back-and-forth texts to find a time — they pick a slot, you show up." },
        { label: "Send professional estimates, collect deposits", desc: "Build a quote in Found, attach photos from your last job, set your line items, and send it. The client sees a clean estimate page, approves it, and you collect a deposit — all before you start the job." },
        { label: "More five-star reviews, without the awkward ask — coming soon", desc: "Automatic review requests after every finished job are on the way. When it ships, you won't have to remember, feel awkward, or follow up — the request will go out on its own." },
        { label: "Reach your full client list", desc: "Send a message to everyone who's ever worked with you — or just past clients, or just open leads. Seasonal offers, re-engagement, announcements. One tap, sent." },
        { label: "Your whole team, no extra charge", desc: "Add as many team members as your business needs. Control exactly what each person can see and do — estimators, crew, office staff, anyone." },
        { label: "Show clients their finished job", desc: "After a job is done, share a gallery link with the client — every photo from the project, organized and professional. Something they'll remember and share." },
      ]}
      faqs={[
        { q: "Is this really everything I need to run my business?", a: "For most local service businesses — yes. Website, booking, estimates, invoicing, team management, and social content all in one place. The goal is to replace the scattered stack of tools you're already paying for." },
        { q: "How does the estimate system work?", a: "You build a quote in Found, attach photos from previous jobs to show your quality, set your line items and pricing, and send it. The client receives a professional estimate page on their phone or computer, approves it, and you collect a deposit. When the job is done, Found sends the invoice." },
        { q: "How does the review request work?", a: "Automatic review requests are coming soon — when it ships, marking a job complete in Found will send the client a text and email asking for a review, with the timing and message customizable. Not live yet, but on the roadmap." },
        { q: "Can my team members see client information?", a: "You control that completely. A crew member on upload-only access can submit photos and nothing else — they can't see your leads, contacts, financials, or any business data. Managers can see more. You decide." },
        { q: "What if I want to start on Pro and upgrade to Business later?", a: "Upgrade anytime from your dashboard. Your subscription updates immediately and you're only billed the difference for the rest of the billing period. Your intro rate stays locked in — upgrading doesn't reset the clock." },
      ]}
    />
  )
}
