import { cookies } from "next/headers"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import {
  buildLeadEmail,
  buildAutoReplyEmail,
  buildReservationEmail,
  buildReservationAutoReply,
} from "@/lib/emailBuilders"
import EmailPreviewTabs from "./EmailPreviewTabs"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const MOCK_NAME = "Maria Santos"
const MOCK_PHONE = "(520) 555-0142"
const MOCK_EMAIL = "maria@example.com"
const MOCK_DATE = "Wednesday, July 9"
const MOCK_TIME = "7:00 PM"
const MOCK_PARTY_SIZE = "4"
const MOCK_NOTES = "We have a birthday celebration."
const MOCK_MESSAGE = "Hi, I'm interested in learning more about your services. Please get back to me at your earliest convenience."
const MOCK_REPLY_URL = "https://foundco.app/reply/preview-token-abc123"
const MOCK_RECEIVED = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })

export default async function AdminEmailPreviewPage({
  params,
}: {
  params: Promise<{ companyId: string }>
}) {
  const { companyId } = await params

  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) redirect("/admin/photos")

  const supabase = getAdminClient()
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, email, phone, industry_category, primary_intent, website_config(*)")
    .eq("id", companyId)
    .single()

  if (!company) notFound()

  const config = company.website_config as { services?: { name: string }[] } | null
  const firstService = (Array.isArray(config?.services) ? config.services[0]?.name : null) ?? ""

  const FOOD_INDUSTRIES = new Set(["food", "home_based_food"])
  const usesReservations =
    company.primary_intent === "reservations" ||
    FOOD_INDUSTRIES.has(company.industry_category ?? "")

  const ownerCompany = {
    name: company.name,
    email: company.email ?? "owner@example.com",
    phone: company.phone,
    primary_intent: company.primary_intent,
  }

  const tabs = [
    {
      key: "owner_lead",
      label: "Owner",
      sublabel: "New lead",
      html: buildLeadEmail({
        company: ownerCompany,
        name: MOCK_NAME,
        phone: MOCK_PHONE,
        email: MOCK_EMAIL,
        service: firstService,
        message: MOCK_MESSAGE,
        replyUrl: MOCK_REPLY_URL,
      }),
    },
    {
      key: "customer_lead",
      label: "Customer",
      sublabel: "Auto-reply",
      html: buildAutoReplyEmail({
        company: { name: company.name, phone: company.phone },
        name: MOCK_NAME,
        phone: company.phone,
      }),
    },
    ...(usesReservations ? [
      {
        key: "owner_reservation",
        label: "Owner",
        sublabel: "Reservation",
        html: buildReservationEmail({
          company: ownerCompany,
          name: MOCK_NAME,
          phone: MOCK_PHONE,
          email: MOCK_EMAIL,
          date: MOCK_DATE,
          time: MOCK_TIME,
          partySize: MOCK_PARTY_SIZE,
          notes: MOCK_NOTES,
          replyUrl: MOCK_REPLY_URL,
        }),
      },
      {
        key: "customer_reservation",
        label: "Customer",
        sublabel: "Res. confirmation",
        html: buildReservationAutoReply({
          company: { name: company.name, phone: company.phone },
          name: MOCK_NAME,
          date: MOCK_DATE,
          time: MOCK_TIME,
          partySize: MOCK_PARTY_SIZE,
          phone: company.phone,
        }),
      },
    ] : []),
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080A09" }}>
      <div className="max-w-3xl mx-auto px-6 py-12">

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin/emails"
              className="text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
              style={{ color: "rgba(255,255,255,0.35)" }}>
              ← All Companies
            </Link>
          </div>
          <h1 className="text-3xl font-black" style={{ color: "#ffffff" }}>{company.name}</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            {company.industry_category ?? "—"}
            {company.primary_intent ? ` · intent: ${company.primary_intent}` : ""}
            {company.email ? ` · ${company.email}` : " · no owner email"}
          </p>
        </div>

        <EmailPreviewTabs tabs={tabs} />

        <div className="mt-8 p-5 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
            How copy is generated
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
            Owner emails use the company&apos;s <strong style={{ color: "rgba(255,255,255,0.6)" }}>primary_intent</strong> to set the lead type line
            (e.g. &ldquo;new estimate request&rdquo; vs &ldquo;new booking request&rdquo;).
            Services shown are pulled from the company&apos;s live <strong style={{ color: "rgba(255,255,255,0.6)" }}>website_config.services</strong>.
            All other fields use sample data.
          </p>
        </div>

      </div>
    </div>
  )
}
