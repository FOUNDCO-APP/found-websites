import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/dashboard/SignOutButton"
import BusinessNameEditor from "@/components/dashboard/BusinessNameEditor"
import InstallButton from "@/components/dashboard/InstallButton"
import MoreActivateButton from "@/components/dashboard/MoreActivateButton"
import DashboardPages from "@/components/dashboard/DashboardPages"
import Link from "next/link"
import { openBillingPortal, startUpgradeCheckout } from "./actions"
import AddonActivateButton from "@/components/dashboard/AddonActivateButton"
import PaymentSetupButton from "@/components/dashboard/PaymentSetupButton"
import { TYPE, TEXT_OPACITY, ICON, GREEN, BLACK } from "@/lib/dashboard/typography"
import { getEffectiveAddons, getRelevantAddons, ALL_ADDONS } from "@/lib/featureAccess"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripeConnectStatus } from "@/lib/stripe/connect"

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
    "Review requests go out for you",
    "Reach your full client list",
    "Show clients their finished job",
  ],
}

const PLAN_PROMISE: Record<string, string> = {
  found: "Your business is online, trusted, and ready to get calls.",
  found_pro: "Found helps every lead get answered, followed up, and remembered.",
  found_business: "Found helps run the job from first booking to final review.",
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
    body: "Pro helps with leads. Business helps with the work after the lead says yes: bookings, estimates, deposits, reviews, and client galleries.",
    introPrice: 69,
    normalPrice: 99,
    features: [
      "Clients book themselves without back-and-forth texts",
      "Send professional estimates and collect deposits",
      "Review requests go out after finished jobs",
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
function paymentSetupCopy(industry: string, activeAddons: string[]) {
  if (industry === "retail" || industry === "makers_crafts" || activeAddons.includes("shopping_cart")) {
    return {
      headline: "Sell products online by card.",
      body: "Customers can buy shirts, merch, packaged goods, or products from your site. Secure setup takes a few minutes. Found will bring you right back when it is done.",
      button: "Continue secure setup",
    }
  }
  if (industry === "food" || industry === "home_based_food" || activeAddons.includes("online_ordering")) {
    return {
      headline: "Accept paid orders by card.",
      body: "Customers can place an order and pay electronically before pickup. Secure setup takes a few minutes. Found will bring you right back when it is done.",
      button: "Continue secure setup",
    }
  }
  if (["wellness", "beauty", "fitness", "events", "pet_services", "automotive", "creative_services", "professional_services"].includes(industry)) {
    return {
      headline: "Let clients pay deposits by card.",
      body: "Clients can book or approve work and pay electronically. Secure setup takes a few minutes. Found will bring you right back when it is done.",
      button: "Continue secure setup",
    }
  }
  return {
    headline: "Make estimates payable by card.",
    body: "Clients can accept an estimate and pay a deposit electronically. Secure setup takes a few minutes. Found will bring you right back when it is done.",
    button: "Continue secure setup",
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

export default async function MorePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")
  const sp = await searchParams
  const addonAdded = sp.addon_added ?? null
  const addonUnavailable = sp.addon_unavailable === "1"
  const paymentReturnState = sp.payments ?? null

  const isActive = company?.subscription_status === "active" || company?.subscription_status === "trialing"
  const plan = company?.plan ?? "found"
  const meta = PLAN_META[plan] ?? PLAN_META.found
  const upgrade = UPGRADE_TO[plan]
  const hasIntroRate = !!company?.is_founding_member
  const useIntroPrice = !isActive || hasIntroRate
  const hasStripe = !!company?.stripe_customer_id
  const industryCategory = company?.industry_category ?? ""
  const subIndustry = company?.sub_industry ?? null
  const displayPrice = useIntroPrice ? meta.intro : meta.normal
  const upgradePrice = upgrade ? (useIntroPrice ? upgrade.introPrice : upgrade.normalPrice) : 0
  const businessUpgrade = plan === "found_business" ? null : businessUpgradeCopy(industryCategory)
  const businessPrice = useIntroPrice ? PLAN_META.found_business.intro : PLAN_META.found_business.normal

  const relevantAddons = getRelevantAddons(industryCategory)

  let activeAddonSlugs: string[] = []
  if (company?.id) {
    const admin = createAdminClient()
    const { data: addonRows } = await admin
      .from("addon_subscriptions")
      .select("addon_slug")
      .eq("company_id", company.id)
      .eq("active", true)
    activeAddonSlugs = (addonRows ?? []).map((r: { addon_slug: string }) => r.addon_slug)
  }

  const effectiveAddonSlugs = getEffectiveAddons(plan, activeAddonSlugs)
  const availableAddons = plan === "found_business" ? [] : relevantAddons.filter((a) => !effectiveAddonSlugs.includes(a.slug))
  const paymentCopy = paymentSetupCopy(industryCategory, activeAddonSlugs)
  const stripeConnect = await getStripeConnectStatus(company?.stripe_connect_account_id)
  const paymentsReady = stripeConnect.ready

  const activeAddonSum = activeAddonSlugs.reduce((sum, slug) => {
    const def = ALL_ADDONS.find(a => a.slug === slug)
    return sum + (def?.price ?? 0)
  }, 0)
  const totalMonthly = displayPrice + activeAddonSum
  const showUpsellBanner = upgrade && activeAddonSum > 0 && totalMonthly >= (upgradePrice - 15)

  return (
    <main style={{ padding: "28px 20px" }}>
      <h1 style={{ margin: "0 0 24px", ...TYPE.largeTitle, color: "white" }}>
        More
      </h1>

      {addonAdded && (
        <div style={{ marginBottom: 20, borderRadius: 14, padding: "14px 18px", backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}35` }}>
          <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 700, color: GREEN }}>
            ✓ Add-on activated successfully
          </p>
        </div>
      )}
      {paymentReturnState && (
        <div style={{ marginBottom: 20, borderRadius: 14, padding: "14px 18px", backgroundColor: paymentsReady ? `${GREEN}18` : "rgba(255,255,255,0.045)", border: paymentsReady ? `1px solid ${GREEN}35` : "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ margin: "0 0 3px", ...TYPE.subhead, fontWeight: 760, color: paymentsReady ? GREEN : "white" }}>
            {paymentsReady ? "Payments are ready" : "Payment setup is not finished yet"}
          </p>
          <p style={{ margin: 0, ...TYPE.footnote, lineHeight: 1.45, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
            {paymentsReady ? "Clients can now pay online when the job calls for it." : "You can continue secure setup whenever you are ready."}
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

      {/* My Site */}
      <section style={{ marginBottom: 12 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          My Site
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Link href="/site" style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden",
              padding: "16px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: `${GREEN}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                  </svg>
                </div>
                <div>
                  <p style={{ margin: "0 0 2px", ...TYPE.subhead, fontWeight: 600, color: "white" }}>Edit My Site</p>
                  <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Words, photos, services · Rewrite for me</p>
                </div>
              </div>
              <ChevronRight />
            </div>
          </Link>
        </div>
      </section>

      {/* My Dock */}
      <DashboardPages
        companyName={company?.name ?? null}
        industry={industryCategory}
        subIndustry={subIndustry}
        activeAddons={effectiveAddonSlugs}
      />

      {/* Add to Home Screen — shown early so owners don't miss it */}
      <section style={{ marginBottom: 20 }}>
        <InstallButton />
      </section>

      {/* Get Paid Faster — high-value action, shown early */}
      {company && !paymentsReady && (
        <section style={{ marginBottom: 20 }}>
          <div style={{ borderRadius: 18, padding: "18px 20px", border: `1px solid ${GREEN}28`, backgroundColor: `${GREEN}10` }}>
            <p style={{ margin: "0 0 5px", ...TYPE.caption, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: GREEN }}>
              Get paid faster
            </p>
            <p style={{ margin: "0 0 7px", ...TYPE.subhead, fontWeight: 850, color: "white" }}>
              {paymentCopy.headline}
            </p>
            <p style={{ margin: "0 0 14px", ...TYPE.footnote, lineHeight: 1.55, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
              {paymentCopy.body}
            </p>
            <PaymentSetupButton returnTo="/more?payments=connected">{paymentCopy.button}</PaymentSetupButton>
          </div>
        </section>
      )}

      {/* Add Features */}
      {availableAddons.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            Add Features
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {availableAddons.map((addon) => (
              <div key={addon.slug} style={{
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "16px 18px",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 3px", ...TYPE.subhead, fontWeight: 600, color: "white" }}>
                      {addon.label}
                    </p>
                    <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                      {addon.description}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" as const }}>
                    <p style={{ margin: "0 0 6px", ...TYPE.subhead, fontWeight: 700, color: GREEN }}>
                      +${addon.price}/mo
                    </p>
                    {company?.id && isActive && (
                      <AddonActivateButton
                        companyId={company.id}
                        addonSlug={addon.slug}
                        addonLabel={addon.label}
                        addonPrice={addon.price}
                      />
                    )}
                    {company?.slug && !isActive && (
                      <div style={{ width: 112 }}>
                        <MoreActivateButton
                          slug={company.slug}
                          companyName={company.name}
                          targetPlan={plan}
                          targetAddonSlug={addon.slug}
                          targetAddonLabel={addon.label}
                          targetAddonPrice={addon.price}
                          size="compact"
                        >
                          Activate
                        </MoreActivateButton>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Add-ons */}
      {plan !== "found_business" && activeAddonSlugs.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            My Add-ons
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {activeAddonSlugs.map((slug) => {
              const def = ALL_ADDONS.find((a) => a.slug === slug)
              if (!def) return null
              return (
                <div key={slug} style={{
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 6px ${GREEN}`, flexShrink: 0 }} />
                    <span style={{ ...TYPE.subhead, color: "white" }}>{def.label}</span>
                  </div>
                  <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                    {`Active - $${def.price}/mo`}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* My Plan */}
      <section style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          My Plan
        </p>
        {plan === "found_business" && isActive ? (
          <div style={{
            borderRadius: 18,
            padding: "18px 20px",
            border: `1px solid ${GREEN}24`,
            backgroundColor: `${GREEN}08`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 10px ${GREEN}`, flexShrink: 0 }} />
                  <span style={{ ...TYPE.caption, color: GREEN }}>{meta.label}</span>
                  {hasIntroRate && (
                    <span style={{ ...TYPE.footnote, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: GREEN, backgroundColor: `${GREEN}15`, padding: "2px 7px", borderRadius: 20 }}>
                      Intro
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 760, color: "white" }}>You have the top plan.</p>
                <p style={{ margin: "4px 0 0", ...TYPE.footnote, lineHeight: 1.5, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                  Booking, estimates, payments, email, contacts, and customer tools are active.
                </p>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" as const }}>
                <p style={{ margin: 0, ...TYPE.title, color: "white" }}>${displayPrice}</p>
                <p style={{ margin: "-2px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>/month</p>
              </div>
            </div>
          </div>
        ) : (
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
                  <p style={{ margin: 0, ...TYPE.largeTitle, fontSize: "1.85rem", color: "white" }}>${displayPrice}</p>
                  <p style={{ margin: "-2px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>/month</p>
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

              {!isActive && company?.slug && (
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
        )}
      </section>

      {/* Upgrade */}
      {upgrade && company?.id && (
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
              <form action={startUpgradeCheckout}>
                <input type="hidden" name="companyId" value={company.id} />
                <input type="hidden" name="targetPlan" value={upgrade.plan} />
                <button type="submit" style={{
                  width: "100%",
                  minHeight: 52,
                  borderRadius: 999,
                  padding: "0 18px",
                  ...TYPE.subhead,
                  fontWeight: 900,
                  backgroundColor: BLACK,
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 12px 34px rgba(8,10,9,0.22)",
                }}>
                  Upgrade to {upgrade.label} for +${Math.max(upgradePrice - displayPrice, 0)}/mo
                </button>
              </form>
            ) : company?.slug ? (
              <MoreActivateButton
                slug={company.slug}
                companyName={company.name}
                targetPlan={upgrade.plan}
                variant="black"
              >
                Upgrade to {upgrade.label} for +${Math.max(upgradePrice - displayPrice, 0)}/mo
              </MoreActivateButton>
            ) : null}
            <p style={{ margin: "12px 0 0", ...TYPE.footnote, fontWeight: 700, textAlign: "center" as const, color: "rgba(8,10,9,0.46)" }}>
              {hasIntroRate
                ? `Intro price locked. Regular price is $${upgrade.normalPrice}/month.`
                : "Upgrade anytime. Your site, leads, and photos stay with you."}
            </p>
          </div>
        </section>
      )}

      {businessUpgrade && plan === "found" && company?.id && (
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
              <form action={startUpgradeCheckout}>
                <input type="hidden" name="companyId" value={company.id} />
                <input type="hidden" name="targetPlan" value="found_business" />
                <button type="submit" style={{
                  width: "100%",
                  minHeight: 50,
                  borderRadius: 999,
                  padding: "0 18px",
                  ...TYPE.subhead,
                  fontWeight: 900,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: GREEN,
                  border: `1px solid ${GREEN}40`,
                  cursor: "pointer",
                }}>
                  Upgrade to Business
                </button>
              </form>
            ) : company?.slug ? (
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
      {isActive && showUpsellBanner && upgrade && company?.id && (
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
            <form action={startUpgradeCheckout}>
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="targetPlan" value={upgrade.plan} />
              <button type="submit" style={{
                width: "100%", padding: "12px 0", borderRadius: 999,
                backgroundColor: GREEN, color: BLACK, border: "none",
                ...TYPE.subhead, fontWeight: 800, cursor: "pointer",
              }}>
                Switch to {upgrade.label}
              </button>
            </form>
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

      {/* My Account — business name, email, password */}
      <section style={{ marginBottom: 20 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          My Account
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <BusinessNameEditor initialName={company?.name ?? ""} />
          <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ padding: "14px 18px", backgroundColor: "rgba(255,255,255,0.04)" }}>
              <p style={{ margin: "0 0 2px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Signed in as</p>
              <p style={{ margin: 0, ...TYPE.subhead, color: "white" }}>{user.email}</p>
            </div>
          </div>
          <Link href="/auth/set-password" style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: "14px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg width={ICON.action} height={ICON.action} viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,${TEXT_OPACITY.tertiary})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <span style={{ ...TYPE.subhead, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>Change Password</span>
              </div>
              <ChevronRight />
            </div>
          </Link>
        </div>
      </section>

      {/* My Settings — billing, help, home screen install */}
      <section style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          My Settings
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {hasStripe && company?.id && (
            <form action={openBillingPortal}>
              <input type="hidden" name="companyId" value={company.id} />
              <button type="submit" style={{ width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                <div style={{ borderRadius: 14, padding: "15px 18px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ ...TYPE.subhead, color: "white" }}>Manage billing</span>
                  <ChevronRight />
                </div>
              </button>
            </form>
          )}
          <a href="mailto:hello@foundco.app" style={{ textDecoration: "none" }}>
            <div style={{ borderRadius: 14, padding: "15px 18px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ ...TYPE.subhead, color: "white" }}>Get help</span>
              <ChevronRight />
            </div>
          </a>
        </div>
      </section>

      <SignOutButton />

      <p style={{ textAlign: "center", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, padding: "8px 0 40px" }}>
        v2026.5
      </p>
    </main>
  )
}
