import type { Metadata } from "next"
import Link from "next/link"
import SiteNav from "@/components/SiteNav"
import SiteFooter from "@/components/SiteFooter"
import MarketingPlanCard from "@/components/MarketingPlanCard"
import { INTRO_RATE_CUTOFF } from "@/lib/introRate"
import { FOUND_PLAN_OPTIONS } from "@/lib/foundPlans"

export const metadata: Metadata = {
  title: "Compare Plans | Found — $29, $39, $69/month",
  description: "Compare Found, Found Pro, and Found Business. Every plan includes a professional website, your own web address, and leads coming straight to you. Choose the level that fits your business.",
  openGraph: {
    title: "Compare Found Plans — $29, $39, $69/month",
    description: "Found, Found Pro, Found Business. Side-by-side feature comparison. Intro rates expire August 15.",
    url: "https://foundco.app/plans",
  },
}

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

const IS_INTRO_RATE_PERIOD = new Date() < INTRO_RATE_CUTOFF

const PLAN_HREFS = {
  found: "/plans/found",
  found_pro: "/plans/found-pro",
  found_business: "/plans/found-business",
}

const PLANS = FOUND_PLAN_OPTIONS.map((plan) => ({
  ...plan,
  href: PLAN_HREFS[plan.key],
  displayPrice: IS_INTRO_RATE_PERIOD ? plan.price : plan.normalPrice,
}))

const ROWS: { label: string; values: (boolean | string)[] }[] = [
  { label: "Complete website, five pages",            values: [true, true, true] },
  { label: "Your own web address",                    values: [true, true, true] },
  { label: "Professional copy, written for you",      values: [true, true, true] },
  { label: "Beautiful industry photos, built in",     values: [true, true, true] },
  { label: "Leads come straight to you",              values: [true, true, true] },
  { label: "New leads get an automatic reply from your business",  values: [true, true, true] },
  { label: "Take a photo. It's on your site.",        values: [true, true, true] },
  { label: "Plus automatic lead follow-up",           values: [false, true, true] },
  { label: "Drip-style messages keep new leads from going cold", values: [false, true, true] },
  { label: "See who's interested and ready to hire",  values: [false, true, true] },
  { label: "All your leads in one place",             values: [false, true, true] },
  { label: "Your entire contact list, organized",     values: [false, true, true] },
  { label: "Your crew contributes from the field",    values: [false, true, true] },
  { label: "Rewrite any page on your site, anytime",  values: [false, true, true] },
  { label: "Choose one growth tool: online ordering, booking calendar, estimates and deposits, or email marketing", values: [false, true, true] },
  { label: "Plus bookings, estimates, payments, and email marketing", values: [false, false, true] },
  { label: "Payment setup where it matters",          values: [false, true, true] },
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
        <h1 className="text-4xl font-normal leading-tight md:text-6xl text-white mb-5">
          The right plan for where you are.
        </h1>
        <p className="text-base text-white/50 font-medium">
          {IS_INTRO_RATE_PERIOD ? "Intro rates expire August 15. Locked in for your first year." : "Simple, honest pricing. Cancel anytime."}
        </p>
      </section>

      {/* Plan cards */}
      <div className="px-6 pb-8 md:px-10 max-w-5xl mx-auto grid md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <MarketingPlanCard
            key={plan.key}
            planKey={plan.key}
            name={plan.name}
            headline={plan.headline}
            price={`$${plan.displayPrice}`}
            normalPrice={`$${plan.normalPrice}`}
            featured={plan.featured}
            intro={IS_INTRO_RATE_PERIOD}
            href={`/?start=1&plan=${plan.key}`}
            ctaLabel="Get my site"
          />
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
              <>
                {i === 0 && (
                  <tr key="divider-all">
                    <td colSpan={4} className="pt-6 pb-2 pr-8">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: SIGNAL_GREEN }}>Included in all plans</p>
                    </td>
                  </tr>
                )}
                {i === 7 && (
                  <tr key="divider-pro">
                    <td colSpan={4} className="pt-8 pb-2 pr-8">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: SIGNAL_GREEN }}>Added in Found Pro</p>
                    </td>
                  </tr>
                )}
                {i === 15 && (
                  <tr key="divider-biz">
                    <td colSpan={4} className="pt-8 pb-2 pr-8">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: SIGNAL_GREEN }}>Added in Found Business</p>
                    </td>
                  </tr>
                )}
                <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td className="py-4 pr-8 text-white/65 font-medium">{row.label}</td>
                  {row.values.map((val, j) => (
                    <td key={j} className="py-4 px-4 text-center">
                      {val === true ? <span className="flex justify-center"><Check /></span> : <span className="flex justify-center"><Dash /></span>}
                    </td>
                  ))}
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom note */}
      <div className="px-6 md:px-10 pb-20 text-center">
        <p className="text-xs text-white/25 max-w-md mx-auto">
          {IS_INTRO_RATE_PERIOD
            ? <>Intro rates expire August 15 — <span className="font-black text-white/50">locked for 12 months</span>, then regular price. Results vary by market and business type.</>
            : "Cancel anytime. Results vary by market and business type."}
        </p>
      </div>

      <SiteFooter />
    </div>
  )
}

