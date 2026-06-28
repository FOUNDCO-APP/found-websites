import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { getBusinessModel } from "@/lib/getBusinessModel"
import PeopleClient from "@/components/dashboard/PeopleClient"

export type LeadItem = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  type: string | null
  source: string | null
  status: string | null
  created_at: string | null
  partial_answers: Record<string, unknown> | null
}

export type PersonRecord = {
  key: string
  name: string | null
  phone: string | null
  email: string | null
  firstSeen: string
  lastSeen: string
  orderCount: number
  reservationCount: number
  inquiryCount: number
  leads: LeadItem[]
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  return digits.length >= 7 ? digits : null
}

function isOrder(l: LeadItem) {
  return l.type === "online_order" || l.source === "online_ordering" || l.type === "shopping_order" || l.source === "shopping_cart"
}

function isReservation(l: LeadItem) {
  return l.type === "reservation_request" || l.source === "reservation" || l.source === "reservations"
}

function groupLeads(leads: LeadItem[]): PersonRecord[] {
  const byPhone = new Map<string, LeadItem[]>()
  const byEmail = new Map<string, LeadItem[]>()
  const unmatched: LeadItem[] = []

  for (const lead of leads) {
    const phone = normalizePhone(lead.phone)
    if (phone) {
      if (!byPhone.has(phone)) byPhone.set(phone, [])
      byPhone.get(phone)!.push(lead)
    } else if (lead.email) {
      const email = lead.email.toLowerCase().trim()
      if (!byEmail.has(email)) byEmail.set(email, [])
      byEmail.get(email)!.push(lead)
    } else {
      unmatched.push(lead)
    }
  }

  const records: PersonRecord[] = []

  for (const [phone, group] of byPhone) {
    const sorted = [...group].sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )
    records.push({
      key: phone,
      name: sorted.find(l => l.name)?.name ?? null,
      phone: sorted.find(l => l.phone)?.phone ?? null,
      email: sorted.find(l => l.email)?.email ?? null,
      firstSeen: sorted[sorted.length - 1].created_at ?? "",
      lastSeen: sorted[0].created_at ?? "",
      orderCount: group.filter(isOrder).length,
      reservationCount: group.filter(isReservation).length,
      inquiryCount: group.filter(l => !isOrder(l) && !isReservation(l)).length,
      leads: sorted,
    })
  }

  for (const [email, group] of byEmail) {
    const sorted = [...group].sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )
    records.push({
      key: email,
      name: sorted.find(l => l.name)?.name ?? null,
      phone: null,
      email,
      firstSeen: sorted[sorted.length - 1].created_at ?? "",
      lastSeen: sorted[0].created_at ?? "",
      orderCount: group.filter(isOrder).length,
      reservationCount: group.filter(isReservation).length,
      inquiryCount: group.filter(l => !isOrder(l) && !isReservation(l)).length,
      leads: sorted,
    })
  }

  for (const lead of unmatched) {
    records.push({
      key: lead.id,
      name: lead.name,
      phone: null,
      email: null,
      firstSeen: lead.created_at ?? "",
      lastSeen: lead.created_at ?? "",
      orderCount: isOrder(lead) ? 1 : 0,
      reservationCount: isReservation(lead) ? 1 : 0,
      inquiryCount: !isOrder(lead) && !isReservation(lead) ? 1 : 0,
      leads: [lead],
    })
  }

  return records.sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  )
}

export default async function PeoplePage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) redirect("/login")

  const admin = createAdminClient()
  const { data: leads } = await admin
    .from("leads")
    .select("id, name, email, phone, message, type, source, status, created_at, partial_answers")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })

  const people = groupLeads((leads ?? []) as LeadItem[])
  const bm = getBusinessModel(company.industry_category, null)
  const tabLabel = company.industry_category === "food" ? "Guests" : bm.tabLabel
  const tabLabelSingular = company.industry_category === "food" ? "Guest" : bm.tabLabelSingular

  return (
    <PeopleClient
      people={people}
      tabLabel={tabLabel}
      tabLabelSingular={tabLabelSingular}
      industry={company.industry_category ?? null}
      companyName={company.name ?? ""}
    />
  )
}

