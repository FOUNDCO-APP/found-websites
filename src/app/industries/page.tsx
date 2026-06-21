import type { Metadata } from "next"
import Link from "next/link"
import SiteNav from "@/components/SiteNav"

export const metadata: Metadata = {
  title: "Industries | Found — Websites Built for Your Type of Business",
  description: "Found builds professional websites for contractors, restaurants, salons, spas, real estate agents, retailers, photographers, and more. Find your industry.",
  openGraph: {
    title: "Industries | Found",
    description: "Find your industry. Found builds professional websites for local businesses — contractors, restaurants, salons, spas, real estate, retail, photography, cleaning, and more.",
    url: "https://foundco.app/industries",
  },
}

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

const INDUSTRIES = [
  { label: "Contractors & Home Services", href: "/industries/contractors", desc: "HVAC, plumbing, electrical, roofing, remodeling, and every trade in between." },
  { label: "Restaurants & Food", href: "/industries/restaurants", desc: "Restaurants, cafés, food trucks, catering, and every food concept that deserves to be found." },
  { label: "Salons & Barbers", href: "/industries/salons", desc: "Hair salons, barber shops, beauty studios, and everyone with a chair and a client list to grow." },
  { label: "Spas & Wellness", href: "/industries/spas", desc: "Day spas, massage studios, wellness centers, and practitioners who care for people deeply." },
  { label: "Real Estate", href: "/industries/real-estate", desc: "Agents, brokers, and property managers who need a professional presence that earns trust." },
  { label: "Retail & Boutiques", href: "/industries/retail", desc: "Shops, boutiques, gift stores, and local retailers who deserve a window on the internet." },
  { label: "Photographers", href: "/industries/photographers", desc: "Portrait, wedding, commercial, and event photographers who need their work to be seen." },
  { label: "Cleaning Services", href: "/industries/cleaning", desc: "Residential and commercial cleaning businesses ready to show up when clients search." },
]

export default function IndustriesPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: FOUND_BLACK }}>
      <SiteNav />

      {/* Header */}
      <section className="px-6 pt-36 pb-16 md:px-10 text-center max-w-3xl mx-auto">
        <p className="text-xs font-black uppercase tracking-[0.22em] mb-4" style={{ color: SIGNAL_GREEN }}>
          Industries
        </p>
        <h1 className="text-4xl font-normal leading-tight md:text-6xl text-white mb-5">
          Built for your business.
        </h1>
        <p className="text-base text-white/50 font-medium max-w-xl mx-auto">
          Found isn&apos;t a template you fill in. It&apos;s a website built around how your specific type of business actually wins customers. Find your industry below.
        </p>
      </section>

      {/* Industry grid */}
      <section className="px-6 pb-24 md:px-10 max-w-5xl mx-auto">
        <div className="grid gap-4 md:grid-cols-2">
          {INDUSTRIES.map((industry) => (
            <Link
              key={industry.href}
              href={industry.href}
              className="group rounded-2xl p-8 transition-all"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "2px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-black text-white group-hover:text-[#32D074] transition-colors">{industry.label}</h2>
                <svg className="shrink-0 text-white/20 group-hover:text-[#32D074] transition-colors" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
              <p className="text-sm text-white/45 leading-relaxed">{industry.desc}</p>
              <p className="mt-4 text-xs font-black uppercase tracking-widest transition-colors" style={{ color: SIGNAL_GREEN }}>
                Get online today →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 pb-24 md:px-10 text-center">
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-black uppercase tracking-[0.22em] mb-4" style={{ color: SIGNAL_GREEN }}>Don&apos;t see your industry?</p>
          <h2 className="text-3xl font-normal text-white mb-4">Found works for any local business.</h2>
          <p className="text-white/45 mb-8 font-medium">If you serve customers in your area, Found builds you a professional website that helps them find you.</p>
          <Link
            href="/?start=1"
            className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90"
            style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
          >
            Get my site
          </Link>
        </div>
      </section>
    </div>
  )
}
