type SupabaseLike = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error?: { message?: string } | null }>
  }
}

export type BillingPlanEventInput = {
  company_id?: string | null
  event_type: string
  source: string
  actor_type?: string | null
  actor_email?: string | null
  old_plan?: string | null
  new_plan?: string | null
  old_subscription_status?: string | null
  new_subscription_status?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_price_id?: string | null
  amount_cents?: number | null
  currency?: string | null
  effective_at?: string | null
  note?: string | null
  metadata?: Record<string, unknown> | null
}

export async function recordBillingPlanEvent(
  admin: SupabaseLike,
  event: BillingPlanEventInput,
): Promise<boolean> {
  try {
    if (!event.company_id) return false

    const metadata = {
      event_type: event.event_type,
      source: event.source,
      actor_type: event.actor_type ?? null,
      actor_email: event.actor_email ?? null,
      old_plan: event.old_plan ?? null,
      new_plan: event.new_plan ?? null,
      old_subscription_status: event.old_subscription_status ?? null,
      new_subscription_status: event.new_subscription_status ?? null,
      stripe_customer_id: event.stripe_customer_id ?? null,
      stripe_subscription_id: event.stripe_subscription_id ?? null,
      stripe_price_id: event.stripe_price_id ?? null,
      amount_cents: event.amount_cents ?? null,
      currency: event.currency ?? null,
      effective_at: event.effective_at ?? null,
      note: event.note ?? null,
      ...(event.metadata ?? {}),
    }

    const row = {
      company_id: event.company_id ?? null,
      activity_type: "billing",
      summary: buildBillingActivitySummary(event),
      metadata,
    }

    const { error } = await admin.from("client_activities").insert(row)
    if (error) {
      console.error("[billing_audit_activity] insert failed:", error.message)
      return false
    }
    return true
  } catch (error) {
    console.error("[billing_audit_activity] insert threw:", error)
    return false
  }
}

function planLabel(plan: string | null | undefined) {
  if (plan === "found_business") return "Found Business"
  if (plan === "found_pro") return "Found Pro"
  if (plan === "found") return "Found Starter"
  return plan || "No plan"
}

function moneyLabel(amountCents: number | null | undefined, currency: string | null | undefined) {
  if (typeof amountCents !== "number" || !Number.isFinite(amountCents)) return null
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(amountCents / 100)
}

function buildBillingActivitySummary(event: BillingPlanEventInput) {
  const parts: string[] = []
  const actor = event.actor_email ? `${event.actor_type || "system"} ${event.actor_email}` : event.actor_type || "system"
  if (event.old_plan && event.new_plan && event.old_plan !== event.new_plan) {
    parts.push(`${planLabel(event.old_plan)} → ${planLabel(event.new_plan)}`)
  } else if (event.new_plan) {
    parts.push(planLabel(event.new_plan))
  }
  if (event.old_subscription_status && event.new_subscription_status && event.old_subscription_status !== event.new_subscription_status) {
    parts.push(`${event.old_subscription_status} → ${event.new_subscription_status}`)
  } else if (event.new_subscription_status) {
    parts.push(event.new_subscription_status)
  }
  const amount = moneyLabel(event.amount_cents, event.currency)
  if (amount) parts.push(amount)
  if (event.effective_at) parts.push(`effective ${event.effective_at.slice(0, 10)}`)
  const detail = parts.length ? `: ${parts.join(" · ")}` : ""
  const note = event.note ? ` — ${event.note}` : ""
  return `Billing audit (${event.source}, ${actor})${detail}${note}`
}
