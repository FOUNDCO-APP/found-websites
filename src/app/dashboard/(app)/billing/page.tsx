import { requireDashboardAccess } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import Link from "next/link"
import Stripe from "stripe"
import { openBillingPortal } from "../more/actions"
import AddonsPanel from "@/components/dashboard/AddonsPanel"
import PlanUpgradeButton from "@/components/dashboard/PlanUpgradeButton"
import MoreActivateButton from "@/components/dashboard/MoreActivateButton"
import { TYPE, TEXT_OPACITY, ICON, GREEN, BLACK } from "@/lib/dashboard/typography"
import { getEffectiveAddons, getAllAddonsRanked, ALL_ADDONS } from "@/lib/featureAccess"
import { createAdminClient } from "@/lib/supabase/admin"

const PLAN_META: Record<string, { label: string; intro: number; normal: number; color: string }> = {
  found:          { label: "Found Starter",  intro: 29, normal: 39,  color: GREEN },
  found_pro:      { label: "Found Pro",      intro: 39, normal: 69,  color: GREEN },
  found_business: { label: "Found Business", intro: 69, normal: 99,  color: GREEN },
}

const PLAN_FEATURES: Record<string, string[]> = {
  found: [
    "Complete five-page website",
    "Your own web address",
    "Professional copy written for you",
    "Every inquiry saved and sent to you",
    "Automatic reply to every new lead",
    "Heart a photo and it appears on your site",
  ],
  found_pro: [
    "Everything in Found Starter",
    "Every lead followed up automatically",
    "See who's interested and ready to hire",
    "Your contact list organizes itself",
    "Your crew can upload job photos",
    "Rewrite any page on your site",
  ],
  found_business: [
    "Everything in Found Pro",
    "Clients book themselves",
    "Send estimates and collect deposits",
    "Review requests (coming soon)",
    "Reach your full client list",
    "Show clients their finished job",
  ],
}

const PLAN_PROMISE: Record<string, string> = {
  found: "Your business is online, trusted, and ready to get calls.",
  found_pro: "Found helps every lead get answered, followed up, and remembered.",
  found_business: "Found helps run the job from first booking to final invoice.",
}

const UPGRADE_TO: Record<string, { plan: string; label: string; eyebrow: string; headline: string; body: string; introPrice: number; normalPrice: number; features: string[] }> = {
  found: {
    plan: "found_pro",
    label: "Found Pro",
    eyebrow: "Recommended next",
    headline: "Stop losing leads when the day gets busy.",
    body: "Starter gets you found. Pro keeps every inquiry warm after it arrives, even when you're on a job, driving, or done for the day.",
    introPrice: 39,
    normalPrice: 69,
    features: [
      "Every new lead gets followed up automatically",
      "See who's interested and ready to hire",
      "Every lead becomes an organized contact",
      "Your crew can upload photos from the field",
      "Rewrite your site copy whenever your business changes",
    ],
  },
  found_pro: {
    plan: "found_business",
    label: "Found Business",
    eyebrow: "For growing crews",
    headline: "Run the job, not just the website.",
    body: "Pro helps with leads. Business helps with the work after the lead says yes: bookings, estimates, deposits, and client galleries.",
    introPrice: 69,
    normalPrice: 99,
    features: [
      "Clients book themselves without back-and-forth texts",
      "Send professional estimates and collect deposits",
      "Review requests (coming soon)",
      "Reach past clients with one clean message",
      "Share finished project galleries clients remember",
    ],
  },
}

type BusinessUpgradeCopy = {
  headline: string
  body: string
  features: string[]
}

function businessUpgradeCopy(industry: string): BusinessUpgradeCopy {
  if (industry === "food" || industry === "home_based_food") {
    return {
      headline: "Take orders, reservations, and payments.",
      body: "Business turns the restaurant site into a working front counter: orders, reservations, guest tools, and secure payments from the same account.",
      features: [
        "Online orders and cart tools",
        "Reservations and guest management",
        "Secure payment setup when you're ready",
      ],
    }
  }
  if (["wellness", "beauty", "fitness", "pet_services", "education", "healthcare"].includes(industry)) {
    return {
      headline: "Let clients book and pay without the back-and-forth.",
      body: "Business adds booking, client tools, payments, and follow-up so the work keeps moving after someone is ready.",
      features: [
        "Booking calendar and client management",
        "Online payment setup when you're ready",
        "Email and follow-up tools included",
      ],
    }
  }
  return {
    headline: "Run the job after the customer says yes.",
    body: "Business adds the operating tools: estimates, deposits, booking, email, and client follow-up inside the same Found account.",
    features: [
      "Estimates and deposit payments",
      "Booking and client management",
      "Email marketing included",
    ],
  }
}

function ChevronRight() {
  return (
    <svg width={ICON.action} height={ICON.action} viewBox="0 0 24 24" fill="none"
      stroke={`rgba(255,255,255,${TEXT_OPACITY.disabled})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function formatBillingDate(value: number | null | undefined) {
  if (!value) return "Not scheduled yet"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value * 1000))
}

function formatInvoiceAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}

function subscriptionStatusLabel(status: string | null | undefined, isComp: boolean | null | undefined) {
  if (isComp) return "Comped by Found"
  if (status === "trialing") return "Trial active"
  if (status === "active") return "Active"
  if (status === "past_due") return "Past due"
  if (status === "canceled" || status === "cancelled") return "Canceled"
  return "Not active yet"
}

function subscriptionStatusDetail(status: string | null | undefined, nextBillingDate: string | null | undefined) {
  if (status === "trialing") return nextBillingDate ? `Trial ends ${nextBillingDate}` : "Trial is active"
  if (status === "active") return nextBillingDate ? `Renews ${nextBillingDate}` : "Renews monthly"
  if (status === "past_due") return "Payment needs attention"
  if (status === "canceled" || status === "cancelled") return "Plan has ended"
  return "Found account"
}

function cardLabel(paymentMethod: Stripe.PaymentMethod | null | undefined) {
  const card = paymentMethod?.card
  if (!card) return null
  const brand = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : "Card"
  return `${brand} ending ${card.last4}`
}

async function getFoundBillingSummary(customerId: string | null | undefined) {
  if (!customerId || !process.env.STRIPE_SECRET_KEY) return null
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    const [customer, subscriptions, invoices] = await Promise.all([
      stripe.customers.retrieve(customerId, { expand: ["invoice_settings.default_payment_method"] }),
      stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
        expand: ["data.default_payment_method", "data.items.data.price"],
      }),
      stripe.invoices.list({ customer: customerId, limit: 3 }),
    ])

    const subscription = subscriptions.data.find((sub) => sub.status === "active" || sub.status === "trialing") ?? subscriptions.data[0] ?? null
    const subscriptionAny = subscription as (Stripe.Subscription & { current_period_end?: number }) | null
    const primaryItem = subscription?.items.data[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined
    const subPaymentMethod = subscription?.default_payment_method
    const customerPaymentMethod = !customer.deleted ? customer.invoice_settings.default_payment_method : null
    let paymentMethod = typeof subPaymentMethod === "string" ? null : subPaymentMethod as Stripe.PaymentMethod | null
    if (!paymentMethod) paymentMethod = typeof customerPaymentMethod === "string" ? null : customerPaymentMethod as Stripe.PaymentMethod | null

    if (!paymentMethod) {
      const methods = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 })
      paymentMethod = methods.data[0] ?? null
    }

    return {
      card: cardLabel(paymentMethod),
      nextBillingDate: formatBillingDate(subscriptionAny?.current_period_end ?? primaryItem?.current_period_end),
      stripeStatus: subscription?.status ?? null,
      invoices: invoices.data.slice(0, 3).map((invoice) => ({
        id: invoice.id,
        label: formatBillingDate(invoice.created),
        amount: formatInvoiceAmount(invoice.amount_paid || invoice.amount_due || invoice.total || 0, invoice.currency || "usd"),
        status: invoice.status ?? "invoice",
        description: invoice.lines.data[0]?.description ?? "Found plan",
      })),
    }
  } catch (err) {
    console.error("[billing] summary error:", err)
    return null
  }
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireDashboardAccess()

  const company = await getCompany(user?.id ?? "", user?.email ?? "")
  if (!company) redirect(user ? "/login" : "/admin")
  if (!(await requireOwnerAccess(user?.id ?? "", user?.email ?? "", company))) redirect("/photos")

  const sp = await searchParams
  const addonAdded = sp.addon_added ?? null
  const addonUnavailable = sp.addon_unavailable === "1"
  const paymentReturnState = sp.payments ?? null
  const billingUpdateIssue = sp.billing_update === "1"
  const billingTask = sp.billing_task ?? null

  const isActive = company.subscription_status === "active" || company.subscription_status === "trialing"
  const plan = company.plan ?? "found"
  const meta = PLAN_META[plan] ?? PLAN_META.found
  const upgrade = UPGRADE_TO[plan]
  const hasIntroRate = !!company.is_founding_member
  const useIntroPrice = !isActive || hasIntroRate
  const hasStripe = !!company.stripe_customer_id
  const industryCategory = company.industry_category ?? ""
  const displayPrice = useIntroPrice ? meta.intro : meta.normal
  const upgradePrice = upgrade ? (useIntroPrice ? upgrade.introPrice : upgrade.normalPrice) : 0
  const businessUpgrade = plan === "found_business" ? null : businessUpgradeCopy(industryCategory)
  const businessPrice = useIntroPrice ? PLAN_META.found_business.intro : PLAN_META.found_business.normal

  const rankedAddons = getAllAddonsRanked(industryCategory)

  const admin = createAdminClient()
  const { data: addonRows } = await admin
    .from("addon_subscriptions")
    .select("addon_slug")
    .eq("company_id", company.id)
    .eq("active", true)
  const activeAddonSlugs = (addonRows ?? []).map((r: { addon_slug: string }) => r.addon_slug)

  const billingSummary = await getFoundBillingSummary(company.stripe_customer_id)
  const activeAddonSum = activeAddonSlugs.reduce((sum, slug) => {
    const def = ALL_ADDONS.find(a => a.slug === slug)
    return sum + (def?.price ?? 0)
  }, 0)
  const totalMonthly = displayPrice + activeAddonSum
  const showUpsellBanner = upgrade && activeAddonSum > 0 && totalMonthly >= (upgradePrice - 15)

  return (
    <main style={{ padding: "28px 20px" }}>
      <h1 style={{ margin: "0 0 24px", ...TYPE.largeTitle, color: "white" }}>
        Billing &amp; Plan
      </h1>

      {addonAdded && (
        <div style={{ marginBottom: 20, borderRadius: 14, padding: "14px 18px", backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}35` }}>
          <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 700, color: GREEN }}>
            ✓ Add-on activated successfully
          </p>
        </div>
      )}
      {paymentReturnState && (
        <div style={{ marginBottom: 20, borderRadius: 14, padding: "14px 18px", backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}35` }}>
          <p style={{ margin: "0 0 3px", ...TYPE.subhead, fontWeight: 760, color: GREEN }}>
            Payment setup updated.
          </p>
          <p style={{ margin: 0, ...TYPE.footnote, lineHeight: 1.45, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
            Your customer payment tools live with the work tools that use them.
          </p>
        </div>
      )}
      {addonUnavailable && (
        <div style={{ marginBottom: 20, borderRadius: 14, padding: "14px 18px", backgroundColor: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.3)" }}>
          <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 700, color: "#FF3B30" }}>
            Something went wrong — please try again or contact support.
          </p>
        </div>
      )}
      {billingUpdateIssue && (
        <div style={{ marginBottom: 20, borderRadius: 14, padding: "14px 18px", backgroundColor: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.3)" }}>
          <p style={{ margin: "0 0 3px", ...TYPE.subhead, fontWeight: 760, color: "#FF3B30" }}>
            Plan upgrade could not open.
          </p>
          <p style={{ margin: 0, ...TYPE.footnote, lineHeight: 1.45, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
            Found support needs to finish one billing setting before this plan can change.
          </p>
        </div>
      )}
      {billingTask === "card" && (
        <div style={{ marginBottom: 20, borderRadius: 14, padding: "14px 18px", backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}35` }}>
          <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 700, color: GREEN }}>
            Card update finished.
          </p>
        </div>
      )}

      <section style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Account
        </p>
        <div style={{
          borderRadius: 20,
          padding: "18px 20px",
          backgroundColor: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <p style={{ margin: "0 0 4px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>Plan</p>
              <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 800, color: "white" }}>{meta.label}</p>
              <p style={{ margin: "3px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>${displayPrice}/month</p>
            </div>
            <div>
              <p style={{ margin: "0 0 4px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>Status</p>
              <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 800, color: isActive ? GREEN : "white" }}>{subscriptionStatusLabel(company.subscription_status, company.is_comp)}</p>
              <p style={{ margin: "3px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{subscriptionStatusDetail(company.subscription_status, billingSummary?.nextBillingDate)}</p>
            </div>
            <div>
              <p style={{ margin: "0 0 4px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>Card</p>
              <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 800, color: billingSummary?.card ? "white" : "#FFB340" }}>{billingSummary?.card ?? "No card on file"}</p>
              <p style={{ margin: "3px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{billingSummary?.card ? "Secure card on file" : "Add one before billing starts"}</p>
            </div>
            <div>
              <p style={{ margin: "0 0 4px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>Next bill</p>
              <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 800, color: "white" }}>{billingSummary?.nextBillingDate ?? "Not scheduled yet"}</p>
              <p style={{ margin: "3px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{hasIntroRate ? `Intro rate saves $${meta.normal - meta.intro}/mo` : "Monthly subscription"}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Unified features list - every add-on always visible (relevant ones
          first), each row showing Included / Active / Available so a
          customer never has to guess what's free vs billed vs findable. */}
      {plan !== "found_business" && company.id && company.slug && (
        <AddonsPanel
          companyId={company.id}
          companySlug={company.slug}
          companyName={company.name}
          plan={plan}
          isActive={isActive}
          addons={rankedAddons}
          includedAddonSlug={company.included_addon_slug ?? null}
          activeAddonSlugs={activeAddonSlugs}
        />
      )}

      {/* Plan details stay below Account only when they add useful detail. Active
          Business accounts already have their full plan/price/status summary at
          the top, so repeating the same facts here creates noise. */}
      {!(plan === "found_business" && isActive) && (
      <section style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Plan Details
        </p>
          <div style={{
            borderRadius: 22,
            overflow: "hidden",
            border: `1px solid ${GREEN}24`,
            background: "linear-gradient(180deg, rgba(50,208,116,0.10) 0%, rgba(255,255,255,0.035) 52%, rgba(255,255,255,0.025) 100%)",
            boxShadow: "0 22px 70px rgba(0,0,0,0.22)",
          }}>
            <div style={{ padding: "22px 20px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: meta.color, boxShadow: `0 0 10px ${meta.color}`, flexShrink: 0 }} />
                    <span style={{ ...TYPE.caption, color: meta.color }}>{meta.label}</span>
                    {hasIntroRate && (
                      <span style={{ ...TYPE.footnote, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: GREEN, backgroundColor: `${GREEN}15`, padding: "2px 7px", borderRadius: 20 }}>
                        Intro
                      </span>
                    )}
                  </div>
                  <h2 style={{ margin: 0, ...TYPE.title, fontWeight: 300, color: "white", letterSpacing: 0 }}>
                    {PLAN_PROMISE[plan] ?? PLAN_PROMISE.found}
                  </h2>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" as const }}>
                  {isActive && hasIntroRate && (
                    <p style={{ margin: "0 0 1px", ...TYPE.footnote, fontWeight: 700, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, textDecoration: "line-through" }}>
                      ${meta.normal}/mo
                    </p>
                  )}
                  <p style={{ margin: 0, ...TYPE.largeTitle, fontSize: "1.85rem", color: "white" }}>${displayPrice}</p>
                  <p style={{ margin: "-2px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>/month</p>
                  {isActive && hasIntroRate && (
                    <p style={{ margin: "4px 0 0", ...TYPE.footnote, fontWeight: 800, color: GREEN }}>
                      Save ${meta.normal - meta.intro}/mo
                    </p>
                  )}
                </div>
              </div>

              <p style={{ margin: "0 0 16px", ...TYPE.footnote, fontWeight: 400, lineHeight: 1.55, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                {isActive
                  ? hasIntroRate
                    ? `Your intro rate is locked in. You save $${meta.normal - meta.intro}/month compared with the regular $${meta.normal}/month price.`
                    : "Your subscription is active."
                  : `Activate today to lock in $${meta.intro}/month before the regular $${meta.normal}/month price.`}
              </p>

              <div style={{ display: "grid", gap: 8 }}>
                {(PLAN_FEATURES[plan] ?? PLAN_FEATURES.found).map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 3 }}
                      stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span style={{ ...TYPE.footnote, fontWeight: 500, lineHeight: 1.45, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{f}</span>
                  </div>
                ))}
              </div>

              {!isActive && company.slug && (
                <div style={{ marginTop: 18 }}>
                  <MoreActivateButton
                    slug={company.slug}
                    companyName={company.name}
                    targetPlan={plan}
                  >
                    Lock In My Rate - ${displayPrice}/mo
                  </MoreActivateButton>
                </div>
              )}
            </div>
          </div>
      </section>
      )}

      {/* Upgrade */}
      {upgrade && company.id && (
        <section style={{ marginBottom: 24 }}>
          <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            Recommendations
          </p>
          <div style={{
            borderRadius: 22,
            padding: "22px 20px",
            backgroundColor: GREEN,
            color: BLACK,
            boxShadow: `0 22px 80px ${GREEN}1F`,
          }}>
            <p style={{ margin: "0 0 8px", ...TYPE.caption, color: "rgba(8,10,9,0.58)" }}>
              {upgrade.eyebrow}
            </p>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 10 }}>
              <h2 style={{ margin: 0, ...TYPE.title, fontWeight: 300, lineHeight: 1.12, color: BLACK }}>
                {upgrade.headline}
              </h2>
              <div style={{ flexShrink: 0, textAlign: "right" as const }}>
                <p style={{ margin: 0, ...TYPE.largeTitle, fontSize: "1.85rem", color: BLACK }}>${upgradePrice}</p>
                <p style={{ margin: "-2px 0 0", ...TYPE.footnote, fontWeight: 700, color: "rgba(8,10,9,0.54)" }}>/month</p>
              </div>
            </div>
            <p style={{ margin: "0 0 16px", ...TYPE.subhead, fontWeight: 500, lineHeight: 1.55, color: "rgba(8,10,9,0.68)" }}>
              {upgrade.body}
            </p>
            <div style={{ display: "grid", gap: 9, marginBottom: 18 }}>
              {upgrade.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 3 }}
                    stroke={BLACK} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ ...TYPE.footnote, fontWeight: 800, lineHeight: 1.45, color: "rgba(8,10,9,0.78)" }}>{f}</span>
                </div>
              ))}
            </div>
            {isActive ? (
              <PlanUpgradeButton
                companyId={company.id}
                targetPlan={upgrade.plan}
                targetLabel={upgrade.label}
                variant="black"
              >
                Upgrade to {upgrade.label} for +${Math.max(upgradePrice - displayPrice, 0)}/mo
              </PlanUpgradeButton>
            ) : company.slug ? (
              <MoreActivateButton
                slug={company.slug}
                companyName={company.name}
                targetPlan={upgrade.plan}
                variant="black"
              >
                Upgrade to {upgrade.label} for +${Math.max(upgradePrice - displayPrice, 0)}/mo
              </MoreActivateButton>
            ) : null}
            <p style={{ margin: "12px 0 0", ...TYPE.footnote, fontWeight: 800, textAlign: "center" as const, color: "rgba(8,10,9,0.72)" }}>
              {hasIntroRate
                ? `Intro price locked. Regular price is $${upgrade.normalPrice}/month.`
                : "Upgrade anytime. Your site, leads, and photos stay with you."}
            </p>
          </div>
        </section>
      )}

      {businessUpgrade && plan === "found" && company.id && (
        <section style={{ marginBottom: 24 }}>
          <div style={{
            borderRadius: 18,
            padding: "18px 20px",
            backgroundColor: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 6px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                  Run more of the business
                </p>
                <h2 style={{ margin: 0, ...TYPE.title, fontWeight: 360, lineHeight: 1.14, color: "white" }}>
                  {businessUpgrade.headline}
                </h2>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" as const }}>
                <p style={{ margin: 0, ...TYPE.title, color: "white" }}>${businessPrice}</p>
                <p style={{ margin: "-2px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>/month</p>
              </div>
            </div>
            <p style={{ margin: "0 0 14px", ...TYPE.footnote, lineHeight: 1.55, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
              {businessUpgrade.body}
            </p>
            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              {businessUpgrade.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 3 }}
                    stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ ...TYPE.footnote, fontWeight: 650, lineHeight: 1.45, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{f}</span>
                </div>
              ))}
            </div>
            {isActive ? (
              <PlanUpgradeButton
                companyId={company.id}
                targetPlan="found_business"
                targetLabel="Found Business"
                variant="black"
              >
                Upgrade to Business
              </PlanUpgradeButton>
            ) : company.slug ? (
              <MoreActivateButton
                slug={company.slug}
                companyName={company.name}
                targetPlan="found_business"
                variant="black"
              >
                Activate Business for {company.name}
              </MoreActivateButton>
            ) : null}
          </div>
        </section>
      )}

      {/* Smart upsell banner */}
      {isActive && showUpsellBanner && upgrade && company.id && (
        <section style={{ marginBottom: 24 }}>
          <div style={{
            borderRadius: 18,
            padding: "16px 18px",
            background: `linear-gradient(135deg, ${GREEN}12 0%, ${GREEN}06 100%)`,
            border: `1px solid ${GREEN}30`,
          }}>
            <p style={{ margin: "0 0 4px", ...TYPE.subhead, fontWeight: 700, color: GREEN }}>
              Better value available
            </p>
            <p style={{ margin: "0 0 12px", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
              You're paying <strong style={{ color: "white" }}>${totalMonthly}/month</strong> with add-ons. {upgrade.label} is <strong style={{ color: "white" }}>${upgradePrice}/month</strong> and keeps it all in one plan.
            </p>
            <PlanUpgradeButton
              companyId={company.id}
              targetPlan={upgrade.plan}
              targetLabel={upgrade.label}
            >
              Switch to {upgrade.label}
            </PlanUpgradeButton>
          </div>
        </section>
      )}

      <div style={{ marginBottom: 24 }}>
        <Link href="https://foundco.app/plans" target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "block" }}>
          <div style={{
            borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            padding: "15px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ ...TYPE.subhead, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>Compare plan details</span>
            <ChevronRight />
          </div>
        </Link>
      </div>

      {hasStripe && company.id && (
        <section style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            Card
          </p>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.025)" }}>
            <form action={openBillingPortal}>
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="task" value="payment_method" />
              <button type="submit" style={{ width: "100%", background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                <div style={{ minHeight: 70, padding: "14px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span>
                    <span style={{ display: "block", ...TYPE.subhead, color: "white" }}>{billingSummary?.card ? "Update card" : "Add card"}</span>
                    <span style={{ display: "block", marginTop: 2, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>Securely update the card used for Found</span>
                  </span>
                  <ChevronRight />
                </div>
              </button>
            </form>
          </div>
        </section>
      )}

      {billingSummary?.invoices && billingSummary.invoices.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            Receipts
          </p>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.025)" }}>
            {billingSummary.invoices.map((invoice, index) => (
              <Link key={invoice.id} href={`/billing/receipts/${invoice.id}`} style={{ textDecoration: "none" }}>
                <div style={{ minHeight: 68, padding: "13px 0", borderTop: index === 0 ? "none" : "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", ...TYPE.subhead, color: "white" }}>{invoice.label}</span>
                    <span style={{ display: "block", marginTop: 2, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{invoice.description}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{ ...TYPE.footnote, fontWeight: 850, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{invoice.amount}</span>
                    <ChevronRight />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {company.id && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ marginTop: 16, borderRadius: 16, padding: "15px 16px", backgroundColor: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ margin: "0 0 4px", ...TYPE.subhead, fontWeight: 760, color: "white" }}>Need to change or cancel?</p>
            <p style={{ margin: "0 0 12px", ...TYPE.footnote, lineHeight: 1.5, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
              Found will walk through what happens to your site, billing date, photos, leads, and domain before anything is turned off.
            </p>
            <a href={`sms:+15202226308?&body=${encodeURIComponent(`Hi Found, I need help with billing for ${company.name}.`)}`} style={{ ...TYPE.footnote, fontWeight: 850, color: GREEN, textDecoration: "none" }}>
              Text Found about my plan
            </a>
          </div>
        </section>
      )}
    </main>
  )
}
