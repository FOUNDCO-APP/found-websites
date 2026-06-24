import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import { heroGradient } from "@/lib/color"
import { getStockImages, pickImg } from "@/lib/stockImages"
import { SCHEDULING_CTA } from "@/lib/industryCTAs"
import { getBookingNoun } from "@/lib/bookings/bookingVocab"
import ReservationForm from "./ReservationForm"
import BookingCalendar from "@/components/public/BookingCalendar"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  const pageTitle = SCHEDULING_CTA[company?.industry_category ?? ""]?.label ?? "Book Now"
  return { title: company ? `${pageTitle} | ${company.name}` : pageTitle }
}

export default async function ReservePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const admin = createAdminClient()

  // Check if reservation_calendar add-on is active
  const { data: addon } = await admin
    .from("addon_subscriptions")
    .select("id")
    .eq("company_id", company.id)
    .eq("addon_slug", "reservation_calendar")
    .maybeSingle()

  const hasCalendar = !!addon

  // Fetch working days to grey non-working days on the calendar (no API calls from client)
  let workingDays: number[] = []
  if (hasCalendar) {
    const { data: availability } = await admin
      .from("company_availability")
      .select("day_of_week")
      .eq("company_id", company.id)
      .eq("is_working", true)
    workingDays = (availability ?? []).map((a: { day_of_week: number }) => a.day_of_week)
  }

  const primary = company.primary_color
  const gradient = heroGradient(primary)
  const imgs = await getStockImages(company)
  const img = (i: number) => pickImg(imgs, i)

  const pageTitle = SCHEDULING_CTA[company.industry_category ?? ""]?.label ?? "Book Now"
  const bookingNoun = getBookingNoun(company.industry_category)
  const pageSubtitle = hasCalendar
    ? bookingNoun.confirmMode === "instant"
      ? `Pick a date and time that works for you — your ${bookingNoun.noun} is confirmed instantly.`
      : `Pick a date and time that works for you — we’ll reach out shortly to confirm the details.`
    : "Submit your request and we’ll confirm as soon as possible."

  return (
    <>
      <section className="relative min-h-[45vh] flex items-center overflow-hidden">
        {img(0) ? (
          <>
            <img src={img(0)!} alt={company.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/70" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        <div className="relative z-10 max-w-6xl mx-auto px-8 py-16 w-full">
          <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: "#ffffff" }}>
            {company.name}
          </p>
          <h1 className="text-5xl md:text-6xl font-black mb-5 text-white"
            style={{ fontFamily: "var(--font-heading, inherit)" }}>
            {pageTitle}
          </h1>
          <p className="text-lg max-w-xl" style={{ color: "#cccccc" }}>
            {pageSubtitle}
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">
            <div className="lg:col-span-2 border border-gray-100 p-8 shadow-sm"
              style={{ borderRadius: "var(--card-radius, 10px)" }}>
              {hasCalendar ? (
                <BookingCalendar
                  companyId={company.id}
                  primaryColor={primary}
                  workingDays={workingDays}
                  companyName={company.name}
                  pageTitle={pageTitle}
                  industry={company.industry_category ?? null}
                  companyServices={(company.website_config?.services ?? []).map((s: { name: string }) => s.name)}
                />
              ) : (
                <>
                  <h2 className="text-xl font-black mb-6" style={{ color: "#111111" }}>
                    Tell us about your visit
                  </h2>
                  <ReservationForm companyId={company.id} primaryColor={primary} showPartySize={company.industry_category === "food"} />
                </>
              )}
            </div>

            <div className="space-y-8">
              {company.phone && company.phone_visible !== false && (
                <div>
                  <h3 className="text-base font-bold mb-3" style={{ color: "#111111" }}>Prefer to call?</h3>
                  <a href={`tel:${company.phone.replace(/\D/g, "")}`}
                    className="btn inline-flex items-center gap-2"
                    style={{ borderColor: primary, color: primary }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call to Book
                  </a>
                </div>
              )}
              <div className="p-6" style={{ backgroundColor: "#f9f9f9", borderRadius: "var(--card-radius, 10px)" }}>
                <p className="text-sm font-semibold mb-1" style={{ color: primary }}>What to expect</p>
                <ul className="mt-3 space-y-2">
                  {(hasCalendar ? (bookingNoun.confirmMode === "instant" ? [
                    "Pick any available date and time",
                    "Instant confirmation — no waiting",
                    "You’ll receive an email confirmation",
                  ] : [
                    "Pick any available date and time",
                    "We’ll reach out shortly to confirm",
                    "You’ll receive an email with your details",
                  ]) : [
                    "We’ll confirm as soon as possible",
                    "You’ll receive an email confirmation",
                    "Call us for immediate availability",
                  ]).map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke={primary} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {company.website_config?.about_text && img(1) && (
                <div className="overflow-hidden" style={{ borderRadius: "var(--card-radius, 10px)" }}>
                  <img src={img(1)!} alt={company.name} className="w-full h-48 object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
