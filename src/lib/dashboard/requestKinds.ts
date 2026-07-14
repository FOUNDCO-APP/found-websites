import { defaultFormIntentFor, formIntentLabelFor, type FormIntentLabel } from "@/lib/dashboard/typography"

export type RequestKind = "lead" | "inquiry" | "estimate_request" | "booking" | "reservation" | "appointment" | "order" | "manual"

export type RequestLike = {
  type?: string | null
  source?: string | null
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().trim()
}

export function hasOrderWorkflow(activeAddons: string[] = []): boolean {
  return activeAddons.includes("online_ordering") || activeAddons.includes("shopping_cart")
}

export function isOrderRequest(request: RequestLike): boolean {
  const type = normalize(request.type)
  const source = normalize(request.source)
  return type === "online_order" ||
    type === "shopping_order" ||
    source === "online_ordering" ||
    source === "shopping_cart"
}

export function isReservationRequest(request: RequestLike): boolean {
  const type = normalize(request.type)
  const source = normalize(request.source)
  return type === "reservation_request" ||
    type === "reservation" ||
    source === "reservation" ||
    source === "reservations" ||
    source === "booking_calendar"
}

export function isEstimateRequest(request: RequestLike): boolean {
  const type = normalize(request.type)
  const source = normalize(request.source)
  return type === "estimate" ||
    type === "estimate_request" ||
    source === "estimate" ||
    source === "estimate_form"
}

export function classifyRequest(request: RequestLike): RequestKind {
  if (isOrderRequest(request)) return "order"
  if (isReservationRequest(request)) return "reservation"
  if (isEstimateRequest(request)) return "estimate_request"
  if (normalize(request.type) === "manual" || normalize(request.source) === "manual") return "manual"
  if (normalize(request.type) === "booking") return "booking"
  if (normalize(request.type) === "appointment") return "appointment"
  if (normalize(request.type) === "inquiry") return "inquiry"
  return "lead"
}

export function normalizeInboxIntent(intent: string | null | undefined): string {
  const normalized = normalize(intent)
  return normalized === "order" ? "inquiry" : (normalized || "lead")
}

export function dashboardInboxIntentFor(
  industry: string | null | undefined,
  subIndustry?: string | null,
  formIntent?: string | null,
): string {
  return normalizeInboxIntent(formIntent ?? defaultFormIntentFor(industry, subIndustry))
}

export function dashboardInboxLabelFor(
  industry: string | null | undefined,
  subIndustry?: string | null,
  formIntent?: string | null,
): FormIntentLabel {
  return formIntentLabelFor(dashboardInboxIntentFor(industry, subIndustry, formIntent))
}

const SUBMIT_REQUEST_TYPES = new Set(["inquiry", "estimate_request", "booking", "appointment", "lead"])

export function normalizeSubmittedRequestType(value: FormDataEntryValue | null): string {
  const normalized = normalize(typeof value === "string" ? value : null)
  return SUBMIT_REQUEST_TYPES.has(normalized) ? normalized : "inquiry"
}

export function normalizeSubmittedRequestSource(value: FormDataEntryValue | null): string {
  const normalized = normalize(typeof value === "string" ? value : null)
  if (["website", "website_form", "estimate_form", "contact_form"].includes(normalized)) return normalized
  return "website"
}
