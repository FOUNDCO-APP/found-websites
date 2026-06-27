import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ estimates: [] }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ estimates: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from("estimates")
    .select("id, client_name, client_phone, client_email, title, property_address, status, subtotal, tax_rate, tax_amount, total, valid_until, accepted_at, sent_at, created_at, updated_at")
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
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

  const body = await req.json()
  const { client_name, client_phone, client_email, title, property_address, ai_prompt, line_items = [], tax_rate = 0 } = body
  if (!client_name?.trim()) return NextResponse.json({ error: "Client name required" }, { status: 400 })

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

  const admin = createAdminClient()
  const { data: estimate, error } = await admin
    .from("estimates")
    .insert({
      company_id: company.id,
      client_name: client_name.trim(),
      client_phone: client_phone?.trim() || null,
      client_email: client_email?.trim() || null,
      title: title?.trim() || null,
      property_address: property_address?.trim() || null,
      ai_prompt: ai_prompt?.trim() || null,
      subtotal, tax_rate: taxRate, tax_amount: taxAmount, total,
      status: "draft",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (items.length > 0) {
    await admin.from("estimate_line_items").insert(items.map((item: Record<string, unknown>) => ({ ...item, estimate_id: estimate.id })))
  }

  return NextResponse.json({ estimate })
}
