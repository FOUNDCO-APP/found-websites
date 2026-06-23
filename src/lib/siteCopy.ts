import { getVocab } from "@/lib/subIndustryVocabulary"

export type SiteCopy = {
  nudgeText: string | null
  nudgeLabel: string | null
  nudgeHref: string | null
  galleryCta: string
  galleryCtaHeading: string
  faqQ: string
  faqA: (name: string, city?: string | null) => string
  faqContactA: string
  leadTypeLabel: string
}

export function getSiteCopy(
  intent: string,
  opts: {
    name?: string
    city?: string
    subIndustry?: string | null
    industryCategory?: string
    services?: { name: string }[]
  } = {}
): SiteCopy {
  const { name, city, subIndustry, industryCategory } = opts

  // Use vocab ctaBodyText for galleryCta when sub-industry is available
  const vocab = getVocab(subIndustry ?? null, industryCategory ?? "")
  const vocabCta = vocab.ctaBodyText.charAt(0).toUpperCase() + vocab.ctaBodyText.slice(1)

  // Map websiteJob to galleryCtaHeading
  function galleryCtaHeadingFromJob(job: string): string {
    switch (job) {
      case "quote_me":      return "Ready for a free estimate?"
      case "book_me":       return "Ready to book?"
      case "hire_me":       return "Ready to work together?"
      case "order_from_me": return "Ready to order?"
      case "visit_me":      return "Come see us."
      case "trust_me":      return "Ready to get started?"
      case "find_me":       return "Get in touch."
      default:              return "Ready to get started?"
    }
  }

  const galleryCtaHeading = galleryCtaHeadingFromJob(vocab.websiteJob)

  switch (intent) {
    case "quote":
      return {
        nudgeText: "Need a price?",
        nudgeLabel: "Get a Free Estimate",
        nudgeHref: "/estimate",
        galleryCta: subIndustry ? vocabCta : "Let's talk about your project.",
        galleryCtaHeading,
        faqQ: "Do you offer free estimates?",
        faqA: (n, c) =>
          `Yes, ${n || "we"} offer${n ? "s" : ""} free, no-obligation estimates${c ? ` to homeowners and businesses in ${c} and the surrounding area` : ""}. Contact us to get started.`,
        faqContactA: city
          ? `filling out our online estimate form — we serve ${city} and the surrounding area`
          : "filling out our online estimate form",
        leadTypeLabel: "Estimate request",
      }
    case "reserve":
      return {
        nudgeText: "Ready to dine with us?",
        nudgeLabel: "Reserve a Table",
        nudgeHref: "/reserve",
        galleryCta: subIndustry ? vocabCta : "Reserve your table today.",
        galleryCtaHeading,
        faqQ: "How do I make a reservation?",
        faqA: (n, c) =>
          `You can reserve a table online through ${n || "our website"}${c ? ` — we're located in ${c}` : ""}. You can also call us directly.`,
        faqContactA: "making a reservation online",
        leadTypeLabel: "Reservation request",
      }
    case "book":
      return {
        nudgeText: "Ready to schedule?",
        nudgeLabel: "Book an Appointment",
        nudgeHref: "/reserve",
        galleryCta: subIndustry ? vocabCta : "Book your appointment today.",
        galleryCtaHeading,
        faqQ: "How do I book an appointment?",
        faqA: (n, c) =>
          `You can book an appointment online with ${n || "us"}${c ? ` in ${c}` : ""}. We also take walk-ins when available.`,
        faqContactA: city
          ? `booking an appointment online — we're based in ${city}`
          : "booking an appointment online",
        leadTypeLabel: "Booking request",
      }
    case "shop":
      return {
        nudgeText: "Looking for something?",
        nudgeLabel: "Shop Now",
        nudgeHref: "/shop",
        galleryCta: subIndustry ? vocabCta : "Browse our collection.",
        galleryCtaHeading,
        faqQ: "How do I place an order?",
        faqA: (n, c) =>
          `You can order online through ${n || "our website"}${c ? ` — we're based in ${c}` : ""} or visit us in person.`,
        faqContactA: "ordering online",
        leadTypeLabel: "Product inquiry",
      }
    case "menu":
      return {
        nudgeText: "Hungry? See what we're serving.",
        nudgeLabel: "View Our Menu",
        nudgeHref: "/menu",
        galleryCta: subIndustry ? vocabCta : "Check out our full menu.",
        galleryCtaHeading,
        faqQ: "Where can I see your menu?",
        faqA: (n, c) =>
          `You can view ${n ? `${n}'s` : "our"} full menu right on our website${c ? ` — we're located in ${c}` : ""}.`,
        faqContactA: "viewing our menu online",
        leadTypeLabel: "General inquiry",
      }
    case "visit":
      return {
        nudgeText: "Want to stop by?",
        nudgeLabel: "Find Our Location",
        nudgeHref: "/about",
        galleryCta: subIndustry ? vocabCta : "Come see us in person.",
        galleryCtaHeading,
        faqQ: "Where are you located?",
        faqA: (n, c) =>
          `Visit ${n || "us"} in person${c ? ` in ${c}` : ""} — our address and hours are listed on our website.`,
        faqContactA: city
          ? `visiting us in person in ${city}`
          : "visiting us in person",
        leadTypeLabel: "General inquiry",
      }
    case "call":
      return {
        nudgeText: null,
        nudgeLabel: null,
        nudgeHref: null,
        galleryCta: subIndustry ? vocabCta : "Give us a call anytime.",
        galleryCtaHeading,
        faqQ: "What's the best way to reach you?",
        faqA: (n, c) =>
          `The best way to reach ${n || "us"} is by phone${c ? ` — we serve ${c} and the surrounding area` : ""}. You can also send a message through our website.`,
        faqContactA: "calling us directly",
        leadTypeLabel: "General inquiry",
      }
    default: // contact
      return {
        nudgeText: null,
        nudgeLabel: null,
        nudgeHref: null,
        galleryCta: subIndustry ? vocabCta : "We'd love to hear from you.",
        galleryCtaHeading,
        faqQ: "How do I get in touch?",
        faqA: (n, c) =>
          `You can reach ${n || "us"} by phone${c ? ` in ${c}` : ""} or by filling out the contact form on our website.`,
        faqContactA: city
          ? `filling out the contact form on our website — we're based in ${city}`
          : "filling out the contact form on our website",
        leadTypeLabel: "General inquiry",
      }
  }
}
