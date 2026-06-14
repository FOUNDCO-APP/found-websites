import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Compare Plans | Found — $39, $69, $99/month",
  description: "Compare Found, Found Pro, and Found Business. Every plan includes a professional website, photo pipeline, and lead capture. Choose the level that fits your business.",
  openGraph: {
    title: "Compare Found Plans — $39, $69, $99/month",
    description: "Found, Found Pro, Found Business. Side-by-side feature comparison. 14-day free trial on every plan.",
    url: "https://foundco.app/plans",
  },
}

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

const PLANS = [
  { key: "found",          name: "Found",          href: "/plans/found",          price: 39,  identity: "Solo owner" },
  { key: "found_pro",      name: "Found Pro",       href: "/plans/found-pro",      price: 69,  identity: "Growing business", featured: true },
  { key: "found_business", name: "Found Business",  href: "/plans/found-business", price: 99,  identity: "Full operation" },
]

const ROWS: { label: string; values: (boolean | string)[] }[] = [
  { label: "Professional website (5 pages)",         values: [true, true, true] },
  { label: "Industry photo library",                 values: [true, true, true] },
  { label: "Claude-written copy",                    values: [true, true, true] },
  { label: "Contact form + lead capture",            values: [true, true, true] },
  { label: "Lead auto-reply email",                  values: [true, true, true] },
  { label: "Photo pipeline (heart → site, star → social)", values: [true, true, true] },
  { label: "Custom domain",                          values: [false, true, true] },
  { label: "3-email lead follow-up sequence",        values: [false, true, true] },
  { label: "Lead open & click tracking",             values: [false, true, true] },
  { label: "Reply to leads from dashboard",          values: [false, true, true] },
  { label: "Contact database",                       values: [false, true, true] },
  { label: "Workers can submit photos",              values: [false, true, true] },
  { label: "Claude copy regeneration",               values: [false, true, true] },
  { label: "Online booking & scheduling",            values: [false, false, true] },
  { label: "Quote & estimate system",                values: [false, false, true] },
  { label: "Post-job review automation",             values: [false, false, true] },
  { label: "Email marketing sequences",              values: [false, false, true] },
  { label: "Unlimited workers",                      values: [false, false, true] },
  { label: "Shareable client galleries",             values: [false, false, true] },
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

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-10 border-b border-white/[0.06]">
        <Link href="/" className="text-xs font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition">
          ← Found
        </Link>
      </nav>

      {/* Header */}
      <section className="px-6 py-20 md:px-10 text-center max-w-3xl mx-auto">
        <p className="text-xs font-black uppercase tracking-[0.22em] mb-4" style={{ color: SIGNAL_GREEN }}>
          Plans
        </p>
        <h1 className="text-4xl font-light leading-tight md:text-6xl text-white mb-5">
          Find your plan.
        </h1>
        <p className="text-base text-white/50 font-medium">
          14-day free trial on every plan. No charge today.
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
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                  style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}>
                  Most Popular
                </span>
              </div>
            )}
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: plan.featured ? SIGNAL_GREEN : "rgba(255,255,255,0.35)" }}>
              {plan.identity}
            </p>
            <p className="text-lg font-black text-white mb-2">{plan.name}</p>
            <p className="text-3xl font-black text-white mb-1">${plan.price}<span className="text-sm font-medium text-white/40">/mo</span></p>
            <Link
              href={plan.href}
              className="mt-4 block py-3 rounded-full text-xs font-black uppercase tracking-widest transition"
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
          First 25 clients lock in at <span className="font-black text-white/50">$29/month forever</span>.
          All plans include a 14-day free trial — no charge until day 15.
        </p>
      </div>

    </div>
  )
}
