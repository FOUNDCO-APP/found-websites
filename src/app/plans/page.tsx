import type { Metadata } from "next"
import Link from "next/link"
import SiteNav from "@/components/SiteNav"

export const metadata: Metadata = {
  title: "Compare Plans | Found — $29, $39, $69/month",
  description: "Compare Found, Found Pro, and Found Business. Every plan includes a professional website, your own web address, and leads coming straight to you. Choose the level that fits your business.",
  openGraph: {
    title: "Compare Found Plans — $29, $39, $69/month",
    description: "Found, Found Pro, Found Business. Side-by-side feature comparison. Founding rates expire July 15.",
    url: "https://foundco.app/plans",
  },
}

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

const PLANS = [
  { key: "found",          name: "Found",          href: "/plans/found",          price: 29,  normalPrice: 39, tagline: "Start here." },
  { key: "found_pro",      name: "Found Pro",       href: "/plans/found-pro",      price: 39,  normalPrice: 69, tagline: "Never lose a lead.", featured: true },
  { key: "found_business", name: "Found Business",  href: "/plans/found-business", price: 69,  normalPrice: 99, tagline: "Run your whole business." },
]

const ROWS: { label: string; values: (boolean | string)[] }[] = [
  { label: "Complete website, five pages",            values: [true, true, true] },
  { label: "Your own web address",                    values: [true, true, true] },
  { label: "Professional copy, written for you",      values: [true, true, true] },
  { label: "Beautiful industry photos, built in",     values: [true, true, true] },
  { label: "Leads come straight to you",              values: [true, true, true] },
  { label: "Every inquiry answered instantly",        values: [true, true, true] },
  { label: "Take a photo. It's on your site.",        values: [true, true, true] },
  { label: "Every lead followed up — automatically",  values: [false, true, true] },
  { label: "See who's interested and ready to hire",  values: [false, true, true] },
  { label: "All your leads in one place",             values: [false, true, true] },
  { label: "Your entire contact list, organized",     values: [false, true, true] },
  { label: "Your crew contributes from the field",    values: [false, true, true] },
  { label: "Rewrite any page on your site, anytime",  values: [false, true, true] },
  { label: "Clients book themselves",                 values: [false, false, true] },
  { label: "Send professional estimates, collect deposits", values: [false, false, true] },
  { label: "More five-star reviews, without asking",  values: [false, false, true] },
  { label: "Reach your full client list",             values: [false, false, true] },
  { label: "Your whole team, no extra charge",        values: [false, false, true] },
  { label: "Show clients their finished job",         values: [false, false, true] },
]

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function Dash() {
  return <span className="text-white/15 font-black text-lg">—</span>
}

export default function PlansPage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: FOUND_BLACK }}>

      <SiteNav />

      {/* Header */}
      <section className="px-6 pt-36 pb-16 md:px-10 text-center max-w-3xl mx-auto">
        <p className="text-xs font-black uppercase tracking-[0.22em] mb-4" style={{ color: SIGNAL_GREEN }}>
          Plans
        </p>
        <h1 className="text-4xl font-light leading-tight md:text-6xl text-white mb-5">
          Find your plan.
        </h1>
        <p className="text-base text-white/50 font-medium">
          Founding rates expire July 15. Locked in for your first year.
        </p>
      </section>

      {/* Plan cards */}
      <div className="px-6 pb-8 md:px-10 max-w-5xl mx-auto grid md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className="rounded-2xl p-6 text-center relative"
            style={{
              backgroundColor: plan.featured ? "rgba(50,208,116,0.07)" : "rgba(255,255,255,0.03)",
              border: plan.featured ? "2px solid rgba(50,208,116,0.35)" : "2px solid rgba(255,255,255,0.07)",
            }}
          >
            {plan.featured && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                  style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}>
                  Most Popular
                </span>
              </div>
            )}
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: plan.featured ? SIGNAL_GREEN : "rgba(255,255,255,0.35)" }}>
              {plan.tagline}
            </p>
            <p className="text-lg font-black text-white mb-2">{plan.name}</p>
            <p className="text-xs line-through text-white/25">${plan.normalPrice}/month</p>
            <p className="text-3xl font-black text-white">${plan.price}<span className="text-sm font-medium text-white/40">/mo</span></p>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-4 mt-0.5" style={{ color: SIGNAL_GREEN }}>Founding rate</p>
            <Link
              href={plan.href}
              className="block py-3 rounded-full text-xs font-black uppercase tracking-widest transition"
              style={{
                backgroundColor: plan.featured ? SIGNAL_GREEN : "rgba(255,255,255,0.07)",
                color: plan.featured ? FOUND_BLACK : "rgba(255,255,255,0.7)",
              }}
            >
              Learn more
            </Link>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="px-6 pb-24 md:px-10 max-w-5xl mx-auto overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left py-4 pr-8 text-xs font-black uppercase tracking-widest text-white/30 w-1/2">Feature</th>
              {PLANS.map(p => (
                <th key={p.key} className="text-center py-4 px-4 text-xs font-black uppercase tracking-widest"
                  style={{ color: p.featured ? SIGNAL_GREEN : "rgba(255,255,255,0.5)" }}>
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td className="py-4 pr-8 text-white/65 font-medium">{row.label}</td>
                {row.values.map((val, j) => (
                  <td key={j} className="py-4 px-4 text-center">
                    {val === true ? <span className="flex justify-center"><Check /></span> : <span className="flex justify-center"><Dash /></span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom note */}
      <div className="px-6 pb-20 text-center">
        <p className="text-xs text-white/25 max-w-md mx-auto">
          Founding rates expire July 15 — <span className="font-black text-white/50">locked for 12 months</span>, then regular price.
        </p>
      </div>

    </div>
  )
}
