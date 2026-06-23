export type SiteCopy = {
  nudgeText: string | null
  nudgeLabel: string | null
  nudgeHref: string | null
  galleryCta: string
  faqQ: string
  faqA: (name: string) => string
  faqContactA: string
  leadTypeLabel: string
}

export function getSiteCopy(intent: string): SiteCopy {
  switch (intent) {
    case "quote":
      return {
        nudgeText: "Need a price?",
        nudgeLabel: "Get a Free Estimate",
        nudgeHref: "/estimate",
        galleryCta: "Let’s talk about your project.",
        faqQ: "Do you offer free estimates?",
        faqA: (name) => `Yes, ${name} offers free, no-obligation estimates. Contact us today to get started.`,
        faqContactA: "filling out our online estimate form",
        leadTypeLabel: "Estimate request",
      }
    case "reserve":
      return {
        nudgeText: "Ready to dine with us?",
        nudgeLabel: "Reserve a Table",
        nudgeHref: "/reserve",
        galleryCta: "Reserve your table today.",
        faqQ: "How do I make a reservation?",
        faqA: (name) => `You can reserve a table online through ${name}’s website, or call us directly.`,
        faqContactA: "making a reservation online",
        leadTypeLabel: "Reservation request",
      }
    case "book":
      return {
        nudgeText: "Ready to schedule?",
        nudgeLabel: "Book an Appointment",
        nudgeHref: "/reserve",
        galleryCta: "Book your appointment today.",
        faqQ: "How do I book an appointment?",
        faqA: (name) => `You can book an appointment online through ${name}’s website, or call us directly.`,
        faqContactA: "booking an appointment online",
        leadTypeLabel: "Booking request",
      }
    case "shop":
      return {
        nudgeText: "Looking for something?",
        nudgeLabel: "Shop Now",
        nudgeHref: "/shop",
        galleryCta: "Browse our collection.",
        faqQ: "How do I place an order?",
        faqA: (name) => `You can order online through ${name}’s website or visit us in person.`,
        faqContactA: "ordering online",
        leadTypeLabel: "Product inquiry",
      }
    case "menu":
      return {
        nudgeText: "Hungry? See what we’re serving.",
        nudgeLabel: "View Our Menu",
        nudgeHref: "/menu",
        galleryCta: "Check out our full menu.",
        faqQ: "Where can I see your menu?",
        faqA: (name) => `You can view ${name}’s full menu right on our website.`,
        faqContactA: "viewing our menu online",
        leadTypeLabel: "General inquiry",
      }
    case "visit":
      return {
        nudgeText: "Want to stop by?",
        nudgeLabel: "Find Our Location",
        nudgeHref: "/about",
        galleryCta: "Come see us in person.",
        faqQ: "Where are you located?",
        faqA: (name) => `Visit ${name} in person — our address and hours are listed on our website.`,
        faqContactA: "visiting us in person",
        leadTypeLabel: "General inquiry",
      }
    case "call":
      return {
        nudgeText: null,
        nudgeLabel: null,
        nudgeHref: null,
        galleryCta: "Give us a call anytime.",
        faqQ: "What’s the best way to reach you?",
        faqA: (name) => `The best way to reach ${name} is by phone. You can also send a message through our website.`,
        faqContactA: "calling us directly",
        leadTypeLabel: "General inquiry",
      }
    default: // contact
      return {
        nudgeText: null,
        nudgeLabel: null,
        nudgeHref: null,
        galleryCta: "We’d love to hear from you.",
        faqQ: "How do I get in touch?",
        faqA: (name) => `You can reach ${name} by phone or by filling out the contact form on our website.`,
        faqContactA: "filling out the contact form on our website",
        leadTypeLabel: "General inquiry",
      }
  }
}
