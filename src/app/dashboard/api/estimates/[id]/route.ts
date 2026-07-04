import { requireDashboardAddonAccess } from "@/lib/dashboard/entitlements"
import { NextResponse } from "next/server"

type Params = { params: Promise<{ id: string }> }

function calcTotals(items: { quantity: number; unit_price: number }[], taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100
  return { subtotal: Math.round(subtotal * 100) / 100, taxAmount, total: Math.round((subtotal + taxAmount) * 100) / 100 }
}

export async function GET(req: Request, { params }: Params) {
  const { id } = await params
  const guard = await requireDashboardAddonAccess("quote_payments")
  if (!guard.ok) return guard.response
  const { admin, company } = guard
  const { data } = await admin
    .from("estimates")
    .select("*, estimate_line_items(id, sort_order, description, quantity, unit, unit_price, category, ai_generated)")
    .eq("id", id)
    .eq("company_id", company.id)
    .single()

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const sorted = { ...data, estimate_line_items: [...(data.estimate_line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order) }
  return NextResponse.json({ estimate: sorted })
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const guard = await requireDashboardAddonAccess("quote_payments")
  if (!guard.ok) return guard.response
  const { company } = guard

  const body = await req.json()
  const { client_name, client_first_name, client_last_name, client_company, client_phone, client_email, title, property_address, status, payment_status, accepted_payment_choice, accepted_pay_later_at, payment_link_sent_at, line_items, tax_rate, sent_at, accepted_at } = body

  const { admin } = guard
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (client_name !== undefined) updates.client_name = client_name?.trim() || null
  if (client_first_name !== undefined) updates.client_first_name = client_first_name?.trim() || null
  if (client_last_name !== undefined) updates.client_last_name = client_last_name?.trim() || null
  if (client_company !== undefined) updates.client_company = client_company?.trim() || null
  if (client_phone !== undefined) updates.client_phone = client_phone?.trim() || null
  if (client_email !== undefined) updates.client_email = client_email?.trim() || null
  if (title !== undefined) updates.title = title?.trim() || null
  if (property_address !== undefined) updates.property_address = property_address?.trim() || null
  if (status !== undefined) updates.status = status
  if (payment_status !== undefined) updates.payment_status = payment_status
  if (accepted_payment_choice !== undefined) updates.accepted_payment_choice = accepted_payment_choice
  if (accepted_pay_later_at !== undefined) updates.accepted_pay_later_at = accepted_pay_later_at
  if (payment_link_sent_at !== undefined) updates.payment_link_sent_at = payment_link_sent_at
  if (sent_at !== undefined) updates.sent_at = sent_at
  if (accepted_at !== undefined) updates.accepted_at = accepted_at

  if (line_items !== undefined) {
    const items = line_items.map((item: Record<string, unknown>, i: number) => ({
      description: String(item.description ?? ""),
      quantity: Number(item.quantity ?? 1),
      unit: item.unit ? String(item.unit) : null,
      unit_price: Number(item.unit_price ?? 0),
      category: item.category ? String(item.category) : null,
      ai_generated: Boolean(item.ai_generated ?? false),
      sort_order: i,
      estimate_id: id,
    }))
    const taxRate = tax_rate !== undefined ? Number(tax_rate) : 0
    const { subtotal, taxAmount, total } = calcTotals(items, taxRate)
    updates.subtotal = subtotal
    if (tax_rate !== undefined) updates.tax_rate = taxRate
    updates.tax_amount = taxAmount
    updates.total = total

    await admin.from("estimate_line_items").delete().eq("estimate_id", id)
    if (items.length > 0) {
      await admin.from("estimate_line_items").insert(items)
    }
  } else if (tax_rate !== undefined) {
    const { data: rows } = await admin.from("estimate_line_items").select("quantity, unit_price").eq("estimate_id", id)
    const taxRate = Number(tax_rate)
    const { subtotal, taxAmount, total } = calcTotals(rows ?? [], taxRate)
    updates.subtotal = subtotal
    updates.tax_rate = taxRate
    updates.tax_amount = taxAmount
    updates.total = total
  }

  const { data, error } = await admin.from("estimates").update(updates).eq("id", id).eq("company_id", company.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ estimate: data })
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params
  const guard = await requireDashboardAddonAccess("quote_payments")
  if (!guard.ok) return guard.response
  const { admin, company } = guard
  await admin.from("estimates").delete().eq("id", id).eq("company_id", company.id)
  return NextResponse.json({ success: true })
}
