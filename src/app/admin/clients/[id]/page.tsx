import { notFound } from "next/navigation"
import Link from "next/link"
import { getAdminClient } from "../../lib"
import ClientDetailWorkspace, { type ClientDetail } from "./ClientDetailWorkspace"

export const metadata = { title: "Client - Found HQ" }

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = getAdminClient()

  const [{ data: company }, { data: activities }, { data: emails }] = await Promise.all([
    admin
      .from("companies")
      .select(`
        id, name, slug, contact_name, email, phone, address, city, state, zip, address_visible,
        plan, subscription_status, client_state, account_kind, comp_reason, is_comp,
        trial_ends_at, billing_cycle_day, deferred_payment_amount, deferred_payment_method, deferred_payment_note,
        industry_category, is_test, included_addon_slug, disabled_addons, stripe_customer_id, stripe_connect_account_id, created_at
      `)
      .eq("id", id)
      .maybeSingle(),
    admin.from("client_activities").select("summary, activity_type, metadata, created_at").eq("company_id", id).order("created_at", { ascending: false }).limit(30),
    admin.from("email_log").select("subject, email_type, recipient_email, success, created_at").eq("company_id", id).order("created_at", { ascending: false }).limit(15),
  ])

  if (!company) notFound()

  const detail: ClientDetail = {
    ...company,
    activities: activities ?? [],
    emails: emails ?? [],
  }

  return (
    <div className="hq-page hq-page-narrow">
      <Link href="/admin/clients" className="hq-back-link"><span className="hq-back-chevron" />Clients</Link>
      <ClientDetailWorkspace client={detail} />
    </div>
  )
}
