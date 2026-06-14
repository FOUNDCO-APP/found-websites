import type { Metadata } from "next"
import PlanPage from "@/components/PlanPage"

export const metadata: Metadata = {
  title: "Found Business — $99/month | Full Business System with Booking, Quotes & Reviews",
  description: "The complete Found Business system — online booking, quote & estimate management, automated review collection, unlimited workers, and a full client pipeline. For businesses ready to scale.",
  openGraph: {
    title: "Found Business — $99/month | Booking, Quotes, Reviews & Full Team Management",
    description: "Online booking, quote system with photo attachments, automated review collection, and unlimited team management. The full operation in one platform.",
    url: "https://foundco.app/plans/found-business",
  },
}

export default function FoundBusinessPlanPage() {
  return (
    <PlanPage
      plan="found_business"
      name="Found Business"
      identity="For the full operation"
      price={99}
      tagline="Run your entire business from your phone."
      description="Found Business is everything a growing local business needs to operate professionally — from the first website visit to the final invoice and review request. One platform. One monthly fee. No other software."
      features={[
        { label: "Everything in Found Pro", desc: "Website, custom domain, lead sequences, contact database, worker uploads." },
        { label: "Online booking & scheduling", desc: "Clients book directly from your website. You control your availability. No more back-and-forth texts." },
        { label: "Quote & estimate system", desc: "Send professional estimates with photos attached from your last job. Client approves, you collect a deposit, you invoice — all in Found." },
        { label: "Post-job review automation", desc: "After a job is marked complete, Found automatically asks the client for a review. More reviews, less effort." },
        { label: "Full client pipeline", desc: "Lead → active client → past client. See the full history of every relationship in one place." },
        { label: "Email marketing sequences", desc: "Send targeted emails to your full contact list — or just past clients, or just leads. Seasonal offers, re-engagement, announcements." },
        { label: "Unlimited workers", desc: "Add as many team members as you need. Control exactly what they can see and do." },
        { label: "Shareable client galleries", desc: "After a job, share a gallery link with the client — 'here's everything we did.' Professional. Memorable." },
      ]}
      faqs={[
        { q: "Is this really everything I need to run my business?", a: "For most local service businesses — yes. Website, leads, booking, estimates, invoicing, reviews, team management, and social content — all in one place." },
        { q: "How does the quote system work?", a: "You build a quote in Found, attach photos from previous jobs, set line items, and send it. The client sees a professional estimate page, approves it, and you collect a deposit. When the job is done, Found sends the invoice." },
        { q: "What's the review automation?", a: "When you mark a job complete in Found, the client automatically gets a text and email asking them to leave a review. You can customize the timing and message. Most businesses double their review count within 60 days." },
        { q: "Can workers see client information?", a: "You control that. Workers on the upload-only access level can only submit photos — they can't see leads, contacts, or financials." },
        { q: "What if I start on Pro and want to upgrade to Business?", a: "Upgrade anytime from your dashboard. Your subscription updates immediately and you're only billed the difference for the remaining billing period." },
      ]}
    />
  )
}
