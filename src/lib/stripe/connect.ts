import Stripe from "stripe"

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

export function isStripeConnectReady(account: Stripe.Account | null | undefined) {
  if (!account) return false

  const cardPayments = account.capabilities?.card_payments
  const transfers = account.capabilities?.transfers

  return Boolean(
    account.details_submitted &&
      account.charges_enabled &&
      (cardPayments === "active" || cardPayments === undefined) &&
      (transfers === "active" || transfers === undefined)
  )
}

export async function getStripeConnectStatus(accountId: string | null | undefined) {
  const stripe = getStripe()

  if (!stripe || !accountId) {
    return { accountId: accountId ?? null, ready: false, account: null as Stripe.Account | null }
  }

  try {
    const account = await stripe.accounts.retrieve(accountId)
    return { accountId, ready: isStripeConnectReady(account), account }
  } catch (err) {
    console.error("[stripe/connect] Unable to retrieve account", err)
    return { accountId, ready: false, account: null as Stripe.Account | null }
  }
}
