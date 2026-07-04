import { requireDashboardAddonAccess } from "@/lib/dashboard/entitlements"
import { NextResponse } from "next/server"

export async function GET() {
  const guard = await requireDashboardAddonAccess("quote_payments")
  if (!guard.ok) return guard.response
  const { admin, company } = guard
  const { data } = await admin
    .from("estimates")
    .select("id, estimate_number, client_name, client_first_name, client_last_name, client_company, client_phone, client_email, title, property_address, status, payment_status, accepted_payment_choice, accepted_pay_later_at, payment_link_sent_at, subtotal, tax_rate, tax_amount, total, valid_until, accepted_at, sent_at, email_sent_at, viewed_at, deposit_amount, deposit_paid_at, paid_at, receipt_sent_at, stripe_payment_intent_id, created_at, updated_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(200)

  return NextResponse.json({ estimates: data ?? [] })
}

function calcTotals(items: { quantity: number; unit_price: number }[], taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100
  return { subtotal: Math.round(subtotal * 100) / 100, taxAmount, total: Math.round((subtotal + taxAmount) * 100) / 100 }
}

export async function POST(req: Request) {
  const guard = await requireDashboardAddonAccess("quote_payments")
  if (!guard.ok) return guard.response
  const { company } = guard

  const body = await req.json()
  const { client_name, client_first_name, client_last_name, client_company, client_phone, client_email, title, property_address, ai_prompt, line_items = [], tax_rate = 0 } = body
  const fullName = String(client_name ?? [client_first_name, client_last_name].filter(Boolean).join(" ")).trim()
  if (!fullName) return NextResponse.json({ error: "Client name required" }, { status: 400 })

  const items = line_items.map((item: Record<string, unknown>, i: number) => ({
    description: String(item.description ?? ""),
    quantity: Number(item.quantity ?? 1),
    unit: item.unit ? String(item.unit) : null,
    unit_price: Number(item.unit_price ?? 0),
    category: item.category ? String(item.category) : null,
    ai_generated: Boolean(item.ai_generated ?? false),
    sort_order: i,
  }))

  const taxRate = Number(tax_rate ?? 0)
  const { subtotal, taxAmount, total } = calcTotals(items, taxRate)

  const { admin } = guard

  // Sequential estimate number (per company)
  const { count } = await admin
    .from("estimates")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company.id)
  const estimateNumber = (count ?? 0) + 1

  // Default expiration: 30 days from now
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: estimate, error } = await admin
    .from("estimates")
    .insert({
      company_id: company.id,
      client_name: fullName,
      client_first_name: client_first_name?.trim() || null,
      client_last_name: client_last_name?.trim() || null,
      client_company: client_company?.trim() || null,
      client_phone: client_phone?.trim() || null,
      client_email: client_email?.trim() || null,
      title: title?.trim() || null,
      property_address: property_address?.trim() || null,
      ai_prompt: ai_prompt?.trim() || null,
      subtotal, tax_rate: taxRate, tax_amount: taxAmount, total,
      status: "draft",
      estimate_number: estimateNumber,
      valid_until: validUntil,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (items.length > 0) {
    await admin.from("estimate_line_items").insert(items.map((item: Record<string, unknown>) => ({ ...item, estimate_id: estimate.id })))
  }

  return NextResponse.json({ estimate })
}
