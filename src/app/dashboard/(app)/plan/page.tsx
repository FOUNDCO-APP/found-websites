import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

const SIGNAL_GREEN = "#32D074"

const PLAN_LABELS: Record<string, string> = {
  found:          "Found",
  found_pro:      "Found Pro",
  found_business: "Found Business",
}

const PLAN_PRICE: Record<string, { founding: number; normal: number }> = {
  found:          { founding: 29, normal: 39 },
  found_pro:      { founding: 39, normal: 69 },
  found_business: { founding: 69, normal: 99 },
}

const PLAN_FEATURES: Record<string, string[]> = {
  found: [
    "Business website",
    "Found subdomain",
    "Contact form & lead capture",
    "Mobile-optimized design",
    "Auto-reply to new leads",
  ],
  found_pro: [
    "Everything in Found",
    "Custom domain",
    "Lead tracking & history",
    "Auto-reply to new leads",
    "Contact database",
    "Worker photo uploads",
  ],
  found_business: [
    "Everything in Found Pro",
    "Online booking",
    "Quote requests",
    "Review collection",
    "Priority support",
  ],
}

const PLAN_UPGRADE_COPY: Record<string, string> = {
  found:     "Unlock a custom domain, lead tracking, auto-reply, and more.",
  found_pro: "Unlock online booking, quote requests, review collection, and priority support.",
}

export default async function PlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()
  const { data: company } = await admin
    .from("companies")
    .select("id, plan, subscription_status, stripe_customer_id")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle()

  const plan = company?.plan ?? "found"
  const label = PLAN_LABELS[plan] ?? plan
  const pricing = PLAN_PRICE[plan] ?? { founding: 39, normal: 69 }
  const features = PLAN_FEATURES[plan] ?? []
  const isActive = company?.subscription_status === "active"

  return (
    <main style={{ padding: "28px 20px" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
        Plan
      </h1>

      {/* Current plan card */}
      <div style={{
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        marginBottom: 12,
      }}>
        <div style={{ height: 2, backgroundColor: SIGNAL_GREEN }} />
        <div style={{ padding: "20px", backgroundColor: "rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: SIGNAL_GREEN,
              boxShadow: `0 0 6px ${SIGNAL_GREEN}`,
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: SIGNAL_GREEN,
            }}>
              {label}
            </span>
          </div>
          <p style={{ margin: "0 0 4px", fontSize: 30, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
            ${pricing.founding}
            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.35)" }}>/month</span>
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            {isActive
              ? `Founding rate — locked in. Then $${pricing.normal}/month.`
              : "Activate to lock in your founding rate."}
          </p>
        </div>
      </div>

      {/* Features */}
      <div style={{
        borderRadius: 14,
        padding: "18px 20px",
        backgroundColor: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 12,
      }}>
        <p style={{
          margin: "0 0 14px",
          fontSize: 10,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "rgba(255,255,255,0.3)",
        }}>
          Included
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {features.map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade CTA */}
      {plan !== "found_business" && (
        <div style={{
          borderRadius: 14,
          padding: "18px 20px",
          backgroundColor: `${SIGNAL_GREEN}08`,
          border: `1px solid ${SIGNAL_GREEN}20`,
          textAlign: "center",
        }}>
          <p style={{ margin: "0 0 4px", fontSize: 14, color: "white", fontWeight: 500 }}>
            Need more? Upgrade your plan.
          </p>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
            {PLAN_UPGRADE_COPY[plan]}
          </p>
          <a
            href="mailto:hello@foundco.app?subject=Upgrade%20my%20Found%20plan"
            style={{
              display: "inline-block",
              borderRadius: 10,
              padding: "11px 24px",
              fontSize: 12,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              backgroundColor: SIGNAL_GREEN,
              color: "#080A09",
              textDecoration: "none",
            }}>
            Talk to us →
          </a>
        </div>
      )}
    </main>
  )
}
