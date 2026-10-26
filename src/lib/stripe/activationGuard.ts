import "server-only"
import Stripe from "stripe"
import type { SupabaseClient } from "@supabase/supabase-js"

type Attempt = {
  id: string; company_id: string; customer_id: string; setup_intent_id: string;
  livemode: boolean; state: "pending" | "completed";
  request_params: Stripe.SubscriptionCreateParams | null;
  first_dispatched_at: string | null; stripe_subscription_id: string | null;
}
export type ActivationClaim = { attempt: Attempt; token: string }
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000
const terminal = new Set(["canceled", "incomplete_expired"])

async function checked<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function claimActivation(admin: SupabaseClient, companyId: string, customerId: string,
  intent: Stripe.SetupIntent): Promise<ActivationClaim> {
  const token = crypto.randomUUID()
  const attempt = await checked(admin.rpc("claim_activation_attempt", {
    p_company: companyId, p_customer: customerId, p_intent: intent.id,
    p_live: intent.livemode, p_token: token,
  })) as Attempt | null
  if (!attempt) throw new Error("Activation is already being checked. Please try again shortly.")
  return { attempt, token }
}

function ownedSubscription(sub: Stripe.Subscription, claim: ActivationClaim): boolean {
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id
  return customer === claim.attempt.customer_id && sub.livemode === claim.attempt.livemode &&
    (!sub.metadata.company_id || sub.metadata.company_id === claim.attempt.company_id)
}

export async function resolveActivationSubscription(admin: SupabaseClient, stripe: Stripe,
  claim: ActivationClaim, params: Stripe.SubscriptionCreateParams, mayCreate: boolean) {
  const a = claim.attempt
  const subscriptions: Stripe.Subscription[] = []
  for await (const sub of stripe.subscriptions.list({ customer: a.customer_id, status: "all", limit: 100 })) {
    if (!ownedSubscription(sub, claim)) throw new Error("Subscription ownership is uncertain")
    if (!terminal.has(sub.status)) subscriptions.push(sub)
  }
  if (subscriptions.length > 1) throw new Error("Multiple subscriptions require review; no activation created")
  const existing = subscriptions[0]
  if (existing) {
    if (a.stripe_subscription_id && a.stripe_subscription_id !== existing.id) {
      throw new Error("Activation subscription changed; review required")
    }
    // A subscription already charging or collecting must never be replaced.
    if (!["active", "trialing"].includes(existing.status)) {
      throw new Error("Existing subscription needs attention; no replacement created")
    }
    const fromAttempt = existing.metadata.activation_attempt_id === a.id
    if (fromAttempt && a.state !== "completed" && a.request_params) {
      const frozenMetadata = a.request_params.metadata
      const expectedPlan = frozenMetadata && typeof frozenMetadata === "object" ? frozenMetadata.plan : null
      if (expectedPlan && existing.metadata.plan !== expectedPlan) throw new Error("Subscription plan changed after activation")
      if (existing.items.has_more || a.request_params.items?.some(item =>
        !existing.items.data.some(current => current.price.id === item.price && current.quantity === (item.quantity ?? 1)))) {
        throw new Error("Subscription items changed after activation; no old plan will be restored")
      }
    }
    if (a.first_dispatched_at && !fromAttempt && !a.stripe_subscription_id) {
      throw new Error("Interrupted activation has an ambiguous subscription")
    }
    await noteActivationSubscription(admin, existing, a.id, a.company_id)
    return { subscription: existing, fromAttempt }
  }
  if (a.state === "completed" || a.stripe_subscription_id || !mayCreate) {
    throw new Error("No matching live subscription; activation will not be recreated")
  }
  // Freeze all monetary parameters before the first external request. A timeout
  // retries the exact same request, including deferrals, prices and discounts.
  if (!a.first_dispatched_at) {
    const frozen = { ...params, metadata: { ...params.metadata,
      activation_attempt_id: a.id, company_id: a.company_id } }
    const stored = await checked(admin.from("activation_attempts").update({
      request_params: frozen, first_dispatched_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", a.id).eq("lease_token", claim.token).gt("lease_until", new Date().toISOString())
      .is("first_dispatched_at", null).select("*").single()) as Attempt | null
    if (!stored) throw new Error("Lost activation lease before dispatch")
    claim.attempt = stored
  }
  const dispatched = Date.parse(claim.attempt.first_dispatched_at ?? "")
  if (!Number.isFinite(dispatched) || Date.now() - dispatched >= RETRY_WINDOW_MS || !claim.attempt.request_params) {
    throw new Error("Activation result needs reconciliation; safe retry window elapsed")
  }
  const sub = await stripe.subscriptions.create(claim.attempt.request_params, {
    idempotencyKey: `found-activation:${a.id}`,
  })
  if (!ownedSubscription(sub, claim) || sub.metadata.activation_attempt_id !== a.id) {
    throw new Error("Created subscription does not match activation")
  }
  await noteActivationSubscription(admin, sub, a.id, a.company_id)
  return { subscription: sub, fromAttempt: true }
}

export async function noteActivationSubscription(admin: SupabaseClient, subscription: Stripe.Subscription,
  attemptId = subscription.metadata.activation_attempt_id, companyId = subscription.metadata.company_id) {
  if (!attemptId) return
  if (!companyId || !/^[0-9a-f-]{36}$/i.test(attemptId)) throw new Error("Invalid activation receipt metadata")
  const customer = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  const noted = await checked(admin.rpc("note_activation_subscription", {
    p_attempt: attemptId, p_company: companyId, p_customer: customer,
    p_live: subscription.livemode, p_subscription: subscription.id,
  }))
  if (!noted) throw new Error("Activation receipt mapping mismatch")
}

export async function assertActivationLease(admin: SupabaseClient, claim: ActivationClaim) {
  const row = await checked(admin.from("activation_attempts").select("id")
    .eq("id", claim.attempt.id).eq("lease_token", claim.token)
    .gt("lease_until", new Date().toISOString()).single())
  if (!row) throw new Error("Lost activation lease")
}

export async function finishActivation(admin: SupabaseClient, claim: ActivationClaim, subscriptionId: string,
  companyUpdate: Record<string, string | boolean | null> | null = null) {
  const complete = await checked(admin.rpc("complete_activation_attempt", {
    p_attempt: claim.attempt.id, p_token: claim.token,
    p_subscription: subscriptionId, p_update: companyUpdate,
  }))
  if (!complete) throw new Error("Could not persist completed activation")
}

export async function releaseActivation(admin: SupabaseClient, claim: ActivationClaim) {
  await checked(admin.from("activation_attempts").update({ lease_token: null, lease_until: null,
    updated_at: new Date().toISOString() }).eq("id", claim.attempt.id).eq("lease_token", claim.token))
}
