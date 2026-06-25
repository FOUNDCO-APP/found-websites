import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Unsubscribe" }

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ email?: string; phone?: string }>
}) {
  const { slug } = await params
  const { email, phone } = await searchParams

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  let unsubscribed = false
  let alreadyDone = false

  if (email || phone) {
    const admin = createAdminClient()

    // Mark contact as unsubscribed
    if (email) {
      await admin.from("contacts")
        .update({ email_subscribed: false })
        .eq("company_id", company.id)
        .eq("email", email.toLowerCase())

      const { data: existing } = await admin.from("contact_suppressions")
        .select("id").eq("company_id", company.id).eq("email", email.toLowerCase()).maybeSingle()

      if (existing) { alreadyDone = true }
      else {
        await admin.from("contact_suppressions").insert({ company_id: company.id, email: email.toLowerCase(), channel: "email" })
        unsubscribed = true
      }
    }
  }

  const primary = company.primary_color

  return (
    <section style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        {unsubscribed || alreadyDone ? (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
            <h1 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "#111" }}>
              {alreadyDone ? "Already unsubscribed" : "You've been unsubscribed"}
            </h1>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#666", lineHeight: 1.6 }}>
              {alreadyDone
                ? `${email} is already removed from ${company.name}'s list.`
                : `${email} has been removed from ${company.name}'s list. You won't receive any more emails from them.`}
            </p>
            <a href={`/${slug}`} style={{ fontSize: 13, color: primary, fontWeight: 600, textDecoration: "none" }}>
              ← Back to {company.name}
            </a>
          </>
        ) : (
          <>
            <h1 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "#111" }}>Unsubscribe</h1>
            <p style={{ margin: 0, fontSize: 14, color: "#666" }}>
              No email address provided. Please use the unsubscribe link in the email you received.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
