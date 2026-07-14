const orderTypes = new Set(["online_order", "shopping_order"])
const orderSources = new Set(["online_ordering", "shopping_cart"])
const reservationTypes = new Set(["reservation_request", "reservation"])
const reservationSources = new Set(["reservation", "reservations", "booking_calendar"])

function normalize(value) {
  return String(value || "").toLowerCase().trim()
}

function isOrderRequest(row) {
  return orderTypes.has(normalize(row.type)) || orderSources.has(normalize(row.source))
}

function isReservationRequest(row) {
  return reservationTypes.has(normalize(row.type)) || reservationSources.has(normalize(row.source))
}

function defaultIntentFor(industry) {
  const key = normalize(industry)
  if (["retail", "home_based_food", "makers_crafts"].includes(key)) return "order"
  if (["home_services", "cleaning", "landscaping", "automotive", "events"].includes(key)) return "estimate_request"
  if (["beauty", "wellness", "fitness", "pet_services"].includes(key)) return "booking"
  if (key === "food") return "reservation"
  if (key === "nonprofit") return "inquiry"
  return "lead"
}

function inboxIntentFor(industry, formIntent = null) {
  const intent = normalize(formIntent) || defaultIntentFor(industry)
  return intent === "order" ? "inquiry" : intent
}

function assert(name, condition) {
  if (!condition) throw new Error(name)
}

assert("retail inbox is inquiries without cart", inboxIntentFor("retail") === "inquiry")
assert("nonprofit inbox is inquiries", inboxIntentFor("nonprofit") === "inquiry")
assert("home services inbox is estimate requests", inboxIntentFor("home_services") === "estimate_request")
assert("explicit order form intent still normalizes out of default inbox", inboxIntentFor("retail", "order") === "inquiry")

assert("cart row routes to orders", isOrderRequest({ type: "shopping_order", source: "shopping_cart" }))
assert("online order row routes to orders", isOrderRequest({ type: "online_order", source: "online_ordering" }))
assert("website inquiry row does not route to orders", !isOrderRequest({ type: "inquiry", source: "contact_form" }))
assert("legacy retail website estimate row stays in general inbox", !isOrderRequest({ type: "estimate", source: "website" }))

assert("reservation row routes to reservations", isReservationRequest({ type: "reservation_request", source: "reservation" }))
assert("contact form row does not route to reservations", !isReservationRequest({ type: "inquiry", source: "contact_form" }))

console.log("Request routing checks passed")
