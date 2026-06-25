// Sub-industry vocabulary table
// Every template, button, label, nav link, and Claude prompt reads from this.
// Never hardcode "Our Services", "Who We Are", "What Clients Say" anywhere in a layout again.
// Lookup: getVocab(sub_industry, industry_category) — exact → partial → industry default → global default

export type WebsiteJob =
  | "book_me"
  | "hire_me"
  | "quote_me"
  | "visit_me"
  | "order_from_me"
  | "trust_me"
  | "find_me"

export type SubIndustryVocab = {
  servicesLabel: string     // Main section headline: "Our Services" → "The Menu" / "Services & Pricing"
  servicesOverline: string  // Section eyebrow (small caps): "What We Do" → "The Chair" / "What's Good"
  aboutLabel: string        // About section headline: "Who We Are" → "Our Story" / "About Me"
  reviewsLabel: string      // Reviews headline: "What Clients Say" → "Parent Reviews"
  reviewsOverline: string   // Reviews eyebrow: "Client Stories" → "Happy Customers"
  galleryLabel: string      // Gallery page + section label: "Our Work" → "Fresh Cuts" / "The Food"
  ctaBodyText: string       // CTA section supporting text (shown after phone number or alone)
  customerWord: string      // Singular: "client" / "patient" / "student" / "customer" / "guest"
  appointmentWord: string   // "appointment" / "session" / "cut" / "order" / "booking"
  websiteJob: WebsiteJob
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME SERVICES
// ─────────────────────────────────────────────────────────────────────────────

const homeServiceDefaults: SubIndustryVocab = {
  servicesLabel: "What We Do",
  servicesOverline: "Our Services",
  aboutLabel: "Who We Are",
  reviewsLabel: "What Clients Say",
  reviewsOverline: "Client Stories",
  galleryLabel: "Our Work",
  ctaBodyText: "send us a message and we'll get back to you fast",
  customerWord: "client",
  appointmentWord: "estimate",
  websiteJob: "quote_me",
}

const homeServiceVocab: Record<string, SubIndustryVocab> = {
  roofing: {
    ...homeServiceDefaults,
    servicesLabel: "Roofing Services",
    servicesOverline: "What We Do",
    galleryLabel: "Recent Work",
    ctaBodyText: "send us a message for a free estimate",
  },
  remodeling: {
    ...homeServiceDefaults,
    servicesLabel: "What We Build",
    servicesOverline: "Our Services",
    galleryLabel: "Recent Work",
    ctaBodyText: "send us a message for a free estimate",
  },
  painting: {
    ...homeServiceDefaults,
    servicesLabel: "Painting Services",
    servicesOverline: "What We Do",
    galleryLabel: "Before & After",
    ctaBodyText: "send us a message for a free estimate",
  },
  drywall: {
    ...homeServiceDefaults,
    servicesLabel: "Drywall Services",
    galleryLabel: "Our Work",
    ctaBodyText: "get in touch for a free estimate",
  },
  flooring: {
    ...homeServiceDefaults,
    servicesLabel: "Flooring Services",
    galleryLabel: "Recent Installs",
    ctaBodyText: "get in touch for a free estimate",
  },
  hvac: {
    ...homeServiceDefaults,
    servicesLabel: "HVAC Services",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Stories",
    galleryLabel: "Our Work",
    ctaBodyText: "call or send a message — we get to you fast",
    customerWord: "customer",
    appointmentWord: "service call",
  },
  plumbing: {
    ...homeServiceDefaults,
    servicesLabel: "Plumbing Services",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Stories",
    galleryLabel: "Our Work",
    ctaBodyText: "call or message us — we respond fast",
    customerWord: "customer",
    appointmentWord: "service call",
  },
  electrical: {
    ...homeServiceDefaults,
    servicesLabel: "Electrical Services",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Stories",
    galleryLabel: "Our Work",
    ctaBodyText: "send us a message for a free estimate",
    customerWord: "customer",
  },
  "tv install": {
    ...homeServiceDefaults,
    servicesLabel: "Installation Services",
    servicesOverline: "What We Install",
    galleryLabel: "Recent Installs",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Stories",
    ctaBodyText: "message us to book your install",
    customerWord: "customer",
    appointmentWord: "appointment",
    websiteJob: "book_me",
  },
  "camera install": {
    ...homeServiceDefaults,
    servicesLabel: "Security Services",
    servicesOverline: "What We Install",
    galleryLabel: "Recent Installs",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Stories",
    ctaBodyText: "message us for a free security assessment",
    customerWord: "customer",
    appointmentWord: "appointment",
  },
  "general handyman": {
    ...homeServiceDefaults,
    servicesLabel: "What We Fix",
    servicesOverline: "Our Services",
    galleryLabel: "Our Work",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Stories",
    ctaBodyText: "send us a message — no job is too small",
    customerWord: "customer",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOD
// ─────────────────────────────────────────────────────────────────────────────

const foodDefaults: SubIndustryVocab = {
  servicesLabel: "The Menu",
  servicesOverline: "What We Serve",
  aboutLabel: "Our Story",
  reviewsLabel: "What People Say",
  reviewsOverline: "Happy Customers",
  galleryLabel: "The Food",
  ctaBodyText: "come find us — we're ready for you",
  customerWord: "customer",
  appointmentWord: "order",
  websiteJob: "visit_me",
}

const foodVocab: Record<string, SubIndustryVocab> = {
  "smoothie shop": {
    ...foodDefaults,
    servicesLabel: "Our Menu",
    servicesOverline: "What's Fresh",
    galleryLabel: "The Blends",
    ctaBodyText: "come in — made fresh to order",
  },
  restaurant: {
    ...foodDefaults,
    servicesLabel: "The Menu",
    servicesOverline: "What's Good",
    galleryLabel: "The Food",
    reviewsLabel: "What Diners Say",
    reviewsOverline: "Guest Reviews",
    ctaBodyText: "come in and see us",
    customerWord: "guest",
    appointmentWord: "visit",
  },
  bakery: {
    ...foodDefaults,
    servicesLabel: "What We Bake",
    servicesOverline: "Fresh Daily",
    galleryLabel: "The Goods",
    ctaBodyText: "come in — everything is made fresh every morning",
  },
  "food truck": {
    ...foodDefaults,
    servicesLabel: "The Menu",
    servicesOverline: "What's Good",
    aboutLabel: "The Truck",
    galleryLabel: "The Food",
    ctaBodyText: "find us on the road or book us for your next event",
  },
  "coffee shop": {
    ...foodDefaults,
    servicesLabel: "The Menu",
    servicesOverline: "What We Pour",
    galleryLabel: "The Space",
    reviewsLabel: "What Regulars Say",
    ctaBodyText: "come in and stay a while",
    customerWord: "guest",
    appointmentWord: "visit",
  },
  "meal prep": {
    ...foodDefaults,
    servicesLabel: "Meal Plans",
    servicesOverline: "What We Make",
    galleryLabel: "This Week's Menu",
    reviewsLabel: "What Clients Say",
    reviewsOverline: "Client Stories",
    ctaBodyText: "message us to get started with your meal plan",
    customerWord: "client",
    websiteJob: "order_from_me",
  },
  catering: {
    ...foodDefaults,
    servicesLabel: "Catering Services",
    servicesOverline: "What We Do",
    galleryLabel: "Past Events",
    reviewsLabel: "What Clients Say",
    reviewsOverline: "Client Stories",
    ctaBodyText: "tell us about your event and we'll take it from there",
    customerWord: "client",
    appointmentWord: "event",
    websiteJob: "quote_me",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// WELLNESS
// ─────────────────────────────────────────────────────────────────────────────

const wellnessDefaults: SubIndustryVocab = {
  servicesLabel: "How We Help",
  servicesOverline: "Our Services",
  aboutLabel: "Our Approach",
  reviewsLabel: "Client Stories",
  reviewsOverline: "What Clients Say",
  galleryLabel: "The Space",
  ctaBodyText: "send a message to book your first session",
  customerWord: "client",
  appointmentWord: "session",
  websiteJob: "book_me",
}

const wellnessVocab: Record<string, SubIndustryVocab> = {
  "solo provider": { ...wellnessDefaults, aboutLabel: "About Me" },
  "multi-provider spa": {
    ...wellnessDefaults,
    servicesLabel: "Our Treatments",
    servicesOverline: "Services",
    aboutLabel: "Our Philosophy",
    reviewsLabel: "Guest Stories",
    reviewsOverline: "What Guests Say",
    galleryLabel: "The Spa",
    ctaBodyText: "book your visit — we'd love to welcome you",
    customerWord: "guest",
    appointmentWord: "appointment",
  },
  spa: {
    ...wellnessDefaults,
    servicesLabel: "Our Treatments",
    servicesOverline: "Services",
    aboutLabel: "Our Philosophy",
    reviewsLabel: "Guest Stories",
    reviewsOverline: "What Guests Say",
    galleryLabel: "The Spa",
    ctaBodyText: "book your visit — we'd love to welcome you",
    customerWord: "guest",
    appointmentWord: "appointment",
  },
  massage: {
    ...wellnessDefaults,
    servicesLabel: "Services & Rates",
    servicesOverline: "What We Offer",
    aboutLabel: "About the Practice",
    ctaBodyText: "book your next session",
  },
  "yoga studio": {
    ...wellnessDefaults,
    servicesLabel: "Classes & Schedule",
    servicesOverline: "What We Offer",
    aboutLabel: "Our Philosophy",
    reviewsLabel: "Student Stories",
    reviewsOverline: "What Students Say",
    galleryLabel: "The Studio",
    ctaBodyText: "come to your first class — you belong here",
    customerWord: "student",
    appointmentWord: "class",
  },
  meditation: {
    ...wellnessDefaults,
    servicesLabel: "Sessions & Programs",
    servicesOverline: "What We Offer",
    ctaBodyText: "book your first session",
  },
  therapy: {
    ...wellnessDefaults,
    servicesLabel: "How I Help",
    servicesOverline: "Areas of Focus",
    aboutLabel: "About Me",
    galleryLabel: "The Practice",
    ctaBodyText: "reach out — all conversations are confidential",
  },
  acupuncture: {
    ...wellnessDefaults,
    servicesLabel: "Treatments & Rates",
    servicesOverline: "What We Offer",
    aboutLabel: "My Approach",
    reviewsLabel: "Patient Stories",
    reviewsOverline: "What Patients Say",
    galleryLabel: "The Practice",
    ctaBodyText: "book your first treatment",
    customerWord: "patient",
    appointmentWord: "treatment",
  },
  "wellness coaching": {
    ...wellnessDefaults,
    servicesLabel: "Coaching Programs",
    servicesOverline: "How I Help",
    aboutLabel: "My Approach",
    reviewsLabel: "Client Stories",
    galleryLabel: "Client Wins",
    ctaBodyText: "book a free discovery call",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────────────────────────

const eventsDefaults: SubIndustryVocab = {
  servicesLabel: "What We Do",
  servicesOverline: "Our Services",
  aboutLabel: "Our Story",
  reviewsLabel: "What Clients Say",
  reviewsOverline: "Client Stories",
  galleryLabel: "Recent Work",
  ctaBodyText: "tell us about your event",
  customerWord: "client",
  appointmentWord: "consultation",
  websiteJob: "quote_me",
}

const eventsVocab: Record<string, SubIndustryVocab> = {
  weddings: {
    ...eventsDefaults,
    servicesLabel: "Wedding Services",
    galleryLabel: "Recent Weddings",
    reviewsLabel: "Couple Stories",
    reviewsOverline: "Happy Couples",
    ctaBodyText: "tell us about your wedding and we'll reach out within 24 hours",
    customerWord: "couple",
  },
  "balloon decor": {
    ...eventsDefaults,
    servicesLabel: "What We Create",
    servicesOverline: "Our Services",
    galleryLabel: "Recent Installs",
  },
  "balloon garland": {
    ...eventsDefaults,
    servicesLabel: "What We Create",
    servicesOverline: "Our Services",
    galleryLabel: "Recent Installs",
  },
  "party rentals": {
    ...eventsDefaults,
    servicesLabel: "What We Rent",
    servicesOverline: "Our Inventory",
    galleryLabel: "Our Equipment",
    ctaBodyText: "message us to check availability",
    appointmentWord: "booking",
  },
  "event planning": {
    ...eventsDefaults,
    servicesLabel: "Services",
    galleryLabel: "Events We've Created",
    ctaBodyText: "tell us about your vision",
    websiteJob: "hire_me",
  },
  venue: {
    ...eventsDefaults,
    servicesLabel: "The Space",
    servicesOverline: "Our Venue",
    galleryLabel: "The Venue",
    reviewsLabel: "What Hosts Say",
    reviewsOverline: "Host Reviews",
    ctaBodyText: "check availability for your event",
    customerWord: "host",
    appointmentWord: "booking",
    websiteJob: "book_me",
  },
  dj: {
    ...eventsDefaults,
    servicesLabel: "Packages",
    servicesOverline: "What I Offer",
    galleryLabel: "Recent Events",
    aboutLabel: "About Me",
    ctaBodyText: "message me to check availability for your event",
    appointmentWord: "booking",
    websiteJob: "hire_me",
  },
  photography: {
    ...eventsDefaults,
    servicesLabel: "Sessions & Packages",
    servicesOverline: "What I Offer",
    galleryLabel: "The Portfolio",
    aboutLabel: "About Me",
    ctaBodyText: "book your session",
    appointmentWord: "session",
    websiteJob: "hire_me",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// RETAIL
// ─────────────────────────────────────────────────────────────────────────────

const retailDefaults: SubIndustryVocab = {
  servicesLabel: "What We Carry",
  servicesOverline: "Our Collection",
  aboutLabel: "About the Shop",
  reviewsLabel: "What Customers Say",
  reviewsOverline: "Shopper Reviews",
  galleryLabel: "The Shop",
  ctaBodyText: "come in — we'd love to help you find the right fit",
  customerWord: "customer",
  appointmentWord: "visit",
  websiteJob: "visit_me",
}

const retailVocab: Record<string, SubIndustryVocab> = {
  "bike shop": {
    ...retailDefaults,
    servicesLabel: "Shop & Service",
    servicesOverline: "What We Do",
    galleryLabel: "The Shop",
    reviewsLabel: "What Riders Say",
    reviewsOverline: "Rider Reviews",
    ctaBodyText: "come in — we're open and ready to help",
    customerWord: "rider",
  },
  boutique: {
    ...retailDefaults,
    servicesLabel: "The Collection",
    servicesOverline: "What We Carry",
    galleryLabel: "New Arrivals",
    reviewsLabel: "What Shoppers Say",
    reviewsOverline: "Shopper Loves",
    ctaBodyText: "come see what's new — something special is waiting",
    customerWord: "shopper",
  },
  "beauty store": {
    ...retailDefaults,
    servicesLabel: "What We Carry",
    servicesOverline: "Our Products",
    ctaBodyText: "come in — we'll help you find exactly what you need",
  },
  "gift shop": {
    ...retailDefaults,
    servicesLabel: "What We Carry",
    servicesOverline: "In the Shop",
    ctaBodyText: "come find the perfect gift",
  },
  "home goods": {
    ...retailDefaults,
    servicesLabel: "The Collection",
    servicesOverline: "What We Carry",
    ctaBodyText: "come see what's in store",
  },
  apparel: {
    ...retailDefaults,
    servicesLabel: "The Collection",
    servicesOverline: "What We Carry",
    galleryLabel: "New Arrivals",
    ctaBodyText: "come see what's new",
  },
  "specialty retail": { ...retailDefaults },
  florist: {
    ...retailDefaults,
    servicesLabel: "What We Offer",
    servicesOverline: "Fresh Flowers & More",
    galleryLabel: "Recent Arrangements",
    ctaBodyText: "come in or call — we'd love to create something beautiful for you",
  },
  "dry cleaner": {
    ...retailDefaults,
    servicesLabel: "Our Services",
    servicesOverline: "What We Clean",
    galleryLabel: "Ready for Pickup",
    ctaBodyText: "stop by — we'll take great care of your clothes",
    appointmentWord: "drop-off",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// FITNESS
// ─────────────────────────────────────────────────────────────────────────────

const fitnessDefaults: SubIndustryVocab = {
  servicesLabel: "Classes & Programs",
  servicesOverline: "What We Offer",
  aboutLabel: "Our Philosophy",
  reviewsLabel: "Member Stories",
  reviewsOverline: "What Members Say",
  galleryLabel: "The Studio",
  ctaBodyText: "come in for your first class — you'll feel the difference",
  customerWord: "member",
  appointmentWord: "class",
  websiteJob: "book_me",
}

const fitnessVocab: Record<string, SubIndustryVocab> = {
  gym: {
    ...fitnessDefaults,
    servicesLabel: "Memberships & Classes",
    galleryLabel: "The Gym",
    ctaBodyText: "come in for your first class — it's on us",
  },
  "personal training": {
    ...fitnessDefaults,
    servicesLabel: "Training Programs",
    servicesOverline: "How I Help",
    aboutLabel: "My Approach",
    reviewsLabel: "Client Stories",
    reviewsOverline: "What Clients Say",
    galleryLabel: "Client Results",
    ctaBodyText: "book your first session",
    customerWord: "client",
    appointmentWord: "session",
  },
  "yoga studio": {
    ...fitnessDefaults,
    servicesLabel: "Classes & Schedule",
    servicesOverline: "What We Offer",
    reviewsLabel: "Student Stories",
    reviewsOverline: "What Students Say",
    ctaBodyText: "come to your first class — you belong here",
    customerWord: "student",
  },
  pilates: {
    ...fitnessDefaults,
    servicesLabel: "Classes & Programs",
    reviewsLabel: "Student Stories",
    reviewsOverline: "What Students Say",
    ctaBodyText: "book your first class",
    customerWord: "student",
  },
  boxing: {
    ...fitnessDefaults,
    servicesLabel: "Programs & Training",
    servicesOverline: "What We Do",
    galleryLabel: "The Gym",
    aboutLabel: "Our Coaches",
    ctaBodyText: "come in for your first session",
    appointmentWord: "session",
  },
  "martial arts": {
    ...fitnessDefaults,
    servicesLabel: "Programs & Classes",
    servicesOverline: "What We Teach",
    galleryLabel: "The Dojo",
    aboutLabel: "Our Instructors",
    reviewsLabel: "Student Stories",
    reviewsOverline: "What Students Say",
    ctaBodyText: "book your first class",
    customerWord: "student",
  },
  "group fitness": {
    ...fitnessDefaults,
    servicesLabel: "Classes & Schedule",
    servicesOverline: "What We Offer",
    aboutLabel: "Our Coaches",
    ctaBodyText: "book your first class",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// BEAUTY
// ─────────────────────────────────────────────────────────────────────────────

const beautyDefaults: SubIndustryVocab = {
  servicesLabel: "Services & Pricing",
  servicesOverline: "What We Do",
  aboutLabel: "About the Studio",
  reviewsLabel: "What Clients Say",
  reviewsOverline: "Client Reviews",
  galleryLabel: "The Work",
  ctaBodyText: "book your appointment",
  customerWord: "client",
  appointmentWord: "appointment",
  websiteJob: "book_me",
}

const beautyVocab: Record<string, SubIndustryVocab> = {
  barber: {
    ...beautyDefaults,
    servicesLabel: "Services & Pricing",
    servicesOverline: "The Chair",
    aboutLabel: "About the Shop",
    galleryLabel: "Fresh Cuts",
    ctaBodyText: "book your cut or walk in — we're ready for you",
    appointmentWord: "cut",
  },
  "hair salon": {
    ...beautyDefaults,
    servicesLabel: "Services & Pricing",
    servicesOverline: "What We Do",
    aboutLabel: "About the Salon",
  },
  "nail salon": {
    ...beautyDefaults,
    aboutLabel: "About the Studio",
  },
  manicure: {
    ...beautyDefaults,
    servicesLabel: "Services & Pricing",
    aboutLabel: "About Me",
    ctaBodyText: "book your manicure",
  },
  pedicure: {
    ...beautyDefaults,
    servicesLabel: "Services & Pricing",
    aboutLabel: "About Me",
    ctaBodyText: "book your pedicure",
  },
  esthetician: {
    ...beautyDefaults,
    servicesLabel: "Treatments & Pricing",
    servicesOverline: "What I Offer",
    aboutLabel: "About Me",
    reviewsLabel: "Client Stories",
    reviewsOverline: "Client Reviews",
    galleryLabel: "Client Results",
    ctaBodyText: "book your first treatment",
    appointmentWord: "treatment",
  },
  lashes: {
    ...beautyDefaults,
    servicesLabel: "Lash Services",
    servicesOverline: "What I Do",
    aboutLabel: "About Me",
    ctaBodyText: "book your lash appointment",
  },
  makeup: {
    ...beautyDefaults,
    servicesLabel: "Services & Packages",
    aboutLabel: "About Me",
    ctaBodyText: "book your appointment",
  },
  "beauty store": {
    ...beautyDefaults,
    servicesLabel: "What We Carry",
    servicesOverline: "Our Products",
    galleryLabel: "The Store",
    ctaBodyText: "come in — we'll help you find what you need",
    websiteJob: "visit_me",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMOTIVE
// ─────────────────────────────────────────────────────────────────────────────

const automotiveDefaults: SubIndustryVocab = {
  servicesLabel: "Services",
  servicesOverline: "What We Do",
  aboutLabel: "About the Shop",
  reviewsLabel: "What Customers Say",
  reviewsOverline: "Customer Reviews",
  galleryLabel: "Our Work",
  ctaBodyText: "call or send a message — we'll get you in",
  customerWord: "customer",
  appointmentWord: "appointment",
  websiteJob: "book_me",
}

const automotiveVocab: Record<string, SubIndustryVocab> = {
  "auto repair": { ...automotiveDefaults, servicesLabel: "Repair Services", servicesOverline: "What We Fix" },
  detailing: {
    ...automotiveDefaults,
    servicesLabel: "Detailing Packages",
    servicesOverline: "Our Services",
    galleryLabel: "Before & After",
    ctaBodyText: "book your detail",
  },
  tires: {
    ...automotiveDefaults,
    servicesLabel: "Tires & Services",
    ctaBodyText: "call or message us for pricing",
  },
  "oil change": {
    ...automotiveDefaults,
    servicesLabel: "Services & Pricing",
    ctaBodyText: "come in — no appointment needed",
    appointmentWord: "service",
    websiteJob: "visit_me",
  },
  "body shop": {
    ...automotiveDefaults,
    servicesLabel: "Body & Paint Services",
    galleryLabel: "Before & After",
    ctaBodyText: "send us a message for a free estimate",
    appointmentWord: "estimate",
    websiteJob: "quote_me",
  },
  "mobile mechanic": {
    ...automotiveDefaults,
    servicesLabel: "Services",
    aboutLabel: "About Me",
    ctaBodyText: "call or message — I come to you",
    appointmentWord: "service call",
  },
  "car audio": {
    ...automotiveDefaults,
    servicesLabel: "Installation Services",
    servicesOverline: "What We Install",
    galleryLabel: "Recent Installs",
    ctaBodyText: "message us to book your install",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PET SERVICES
// ─────────────────────────────────────────────────────────────────────────────

const petDefaults: SubIndustryVocab = {
  servicesLabel: "Services",
  servicesOverline: "How We Care",
  aboutLabel: "About Us",
  reviewsLabel: "What Pet Parents Say",
  reviewsOverline: "Pet Parent Reviews",
  galleryLabel: "Happy Clients",
  ctaBodyText: "message us to book your pet's visit",
  customerWord: "pet parent",
  appointmentWord: "appointment",
  websiteJob: "book_me",
}

const petVocab: Record<string, SubIndustryVocab> = {
  "pet groomer": {
    ...petDefaults,
    servicesLabel: "Grooming Services",
    servicesOverline: "What We Do",
    aboutLabel: "About the Shop",
    ctaBodyText: "book your pet's next grooming appointment",
  },
  "dog walker": {
    ...petDefaults,
    servicesLabel: "Walking Services",
    servicesOverline: "What I Do",
    aboutLabel: "About Me",
    galleryLabel: "Happy Dogs",
    ctaBodyText: "message me to check availability",
    appointmentWord: "walk",
  },
  "pet sitter": {
    ...petDefaults,
    servicesLabel: "Sitting Services",
    servicesOverline: "What I Do",
    aboutLabel: "About Me",
    galleryLabel: "Happy Pets",
    ctaBodyText: "message me to check availability",
    appointmentWord: "booking",
  },
  boarding: {
    ...petDefaults,
    servicesLabel: "Boarding & Services",
    servicesOverline: "What We Offer",
    galleryLabel: "Our Space",
    ctaBodyText: "book your pet's stay",
    appointmentWord: "stay",
  },
  trainer: {
    ...petDefaults,
    servicesLabel: "Training Programs",
    servicesOverline: "How I Help",
    aboutLabel: "My Approach",
    galleryLabel: "Training Results",
    ctaBodyText: "book a free consultation",
    appointmentWord: "session",
  },
  "mobile grooming": {
    ...petDefaults,
    servicesLabel: "Mobile Grooming Services",
    servicesOverline: "What I Do",
    aboutLabel: "About Me",
    ctaBodyText: "book — I come to you",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEANING
// ─────────────────────────────────────────────────────────────────────────────

const cleaningDefaults: SubIndustryVocab = {
  servicesLabel: "Cleaning Services",
  servicesOverline: "What We Clean",
  aboutLabel: "How We Work",
  reviewsLabel: "What Clients Say",
  reviewsOverline: "Client Stories",
  galleryLabel: "Before & After",
  ctaBodyText: "get a free quote — we'll take it from there",
  customerWord: "client",
  appointmentWord: "cleaning",
  websiteJob: "quote_me",
}

const cleaningVocab: Record<string, SubIndustryVocab> = {
  "home cleaner": { ...cleaningDefaults },
  "commercial cleaner": {
    ...cleaningDefaults,
    servicesLabel: "Commercial Services",
    servicesOverline: "What We Do",
    galleryLabel: "Our Work",
    ctaBodyText: "contact us for a commercial cleaning quote",
    appointmentWord: "service",
  },
  "move-out cleaning": {
    ...cleaningDefaults,
    servicesLabel: "Move-Out Services",
    ctaBodyText: "get a free quote — we'll handle the rest",
  },
  "deep cleaning": { ...cleaningDefaults, servicesLabel: "Deep Cleaning Services" },
  "window cleaning": {
    ...cleaningDefaults,
    servicesLabel: "Window Cleaning",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Stories",
    customerWord: "customer",
  },
  "carpet cleaning": {
    ...cleaningDefaults,
    servicesLabel: "Carpet & Floor Services",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Stories",
    customerWord: "customer",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDSCAPING
// ─────────────────────────────────────────────────────────────────────────────

const landscapingDefaults: SubIndustryVocab = {
  servicesLabel: "What We Do",
  servicesOverline: "Our Services",
  aboutLabel: "About Us",
  reviewsLabel: "What Clients Say",
  reviewsOverline: "Client Stories",
  galleryLabel: "Recent Projects",
  ctaBodyText: "get a free estimate on your project",
  customerWord: "client",
  appointmentWord: "estimate",
  websiteJob: "quote_me",
}

const landscapingVocab: Record<string, SubIndustryVocab> = {
  landscaping: { ...landscapingDefaults },
  "lawn care": { ...landscapingDefaults, servicesLabel: "Lawn Services", galleryLabel: "Recent Work" },
  hardscaping: { ...landscapingDefaults, servicesLabel: "Hardscape Services" },
  pavers: { ...landscapingDefaults, servicesLabel: "Paver Services", galleryLabel: "Recent Installs" },
  "tree trimming": { ...landscapingDefaults, servicesLabel: "Tree Services", galleryLabel: "Recent Work" },
  irrigation: { ...landscapingDefaults, servicesLabel: "Irrigation Services", galleryLabel: "Our Work" },
  "outdoor lighting": {
    ...landscapingDefaults,
    servicesLabel: "Lighting Services",
    servicesOverline: "What We Install",
    galleryLabel: "Recent Installs",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL ESTATE
// ─────────────────────────────────────────────────────────────────────────────

const realEstateDefaults: SubIndustryVocab = {
  servicesLabel: "How I Help",
  servicesOverline: "What I Do",
  aboutLabel: "About Me",
  reviewsLabel: "Client Stories",
  reviewsOverline: "What Clients Say",
  galleryLabel: "Current Listings",
  ctaBodyText: "send me a message — I respond quickly",
  customerWord: "client",
  appointmentWord: "consultation",
  websiteJob: "find_me",
}

const realEstateVocab: Record<string, SubIndustryVocab> = {
  "residential agent": { ...realEstateDefaults },
  "real estate investor": {
    ...realEstateDefaults,
    servicesLabel: "What I Do",
    galleryLabel: "Recent Deals",
    reviewsLabel: "Partner Stories",
    reviewsOverline: "What Partners Say",
    ctaBodyText: "let's connect",
    customerWord: "partner",
    appointmentWord: "conversation",
  },
  "property manager": {
    ...realEstateDefaults,
    servicesLabel: "Management Services",
    servicesOverline: "What We Do",
    aboutLabel: "About Us",
    galleryLabel: "Our Properties",
    reviewsLabel: "What Owners Say",
    reviewsOverline: "Owner Reviews",
    ctaBodyText: "send us a message about your property",
    customerWord: "owner",
    websiteJob: "trust_me",
  },
  "commercial agent": {
    ...realEstateDefaults,
    servicesLabel: "Services",
    galleryLabel: "Recent Transactions",
    ctaBodyText: "let's talk about your commercial needs",
  },
  "land/lots agent": {
    ...realEstateDefaults,
    servicesLabel: "Available Properties",
    servicesOverline: "What I List",
    ctaBodyText: "send me a message — let's talk land",
  },
  "new agent/personal brand": {
    ...realEstateDefaults,
    galleryLabel: "My Market",
    ctaBodyText: "reach out — I'd love to help you find your next home",
    appointmentWord: "conversation",
  },
  "team/brokerage office": {
    ...realEstateDefaults,
    servicesLabel: "Our Services",
    servicesOverline: "How We Help",
    aboutLabel: "Our Team",
    galleryLabel: "Recent Sales",
    ctaBodyText: "reach out and one of our agents will connect with you",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATIVE SERVICES (new industry)
// ─────────────────────────────────────────────────────────────────────────────

const creativeDefaults: SubIndustryVocab = {
  servicesLabel: "Services",
  servicesOverline: "What I Do",
  aboutLabel: "About Me",
  reviewsLabel: "Client Stories",
  reviewsOverline: "What Clients Say",
  galleryLabel: "The Work",
  ctaBodyText: "let's talk about your project",
  customerWord: "client",
  appointmentWord: "project",
  websiteJob: "hire_me",
}

const creativeVocab: Record<string, SubIndustryVocab> = {
  "graphic designer": { ...creativeDefaults },
  photographer: {
    ...creativeDefaults,
    servicesLabel: "Sessions & Packages",
    servicesOverline: "What I Offer",
    galleryLabel: "The Portfolio",
    ctaBodyText: "book your session",
    appointmentWord: "session",
  },
  videographer: {
    ...creativeDefaults,
    servicesLabel: "Services & Packages",
    galleryLabel: "Recent Work",
    appointmentWord: "project",
  },
  "social media manager": {
    ...creativeDefaults,
    servicesLabel: "Services & Packages",
    servicesOverline: "What I Do",
    galleryLabel: "Client Work",
    ctaBodyText: "let's talk about growing your brand",
    appointmentWord: "consultation",
  },
  "branding designer": {
    ...creativeDefaults,
    servicesLabel: "Services",
    galleryLabel: "Brand Work",
    ctaBodyText: "let's build something great together",
  },
  "web designer": {
    ...creativeDefaults,
    servicesLabel: "Services",
    galleryLabel: "Recent Sites",
  },
  illustrator: {
    ...creativeDefaults,
    servicesLabel: "What I Create",
    servicesOverline: "My Work",
    galleryLabel: "The Portfolio",
    ctaBodyText: "let's work together",
    appointmentWord: "commission",
  },
  copywriter: {
    ...creativeDefaults,
    servicesLabel: "Services",
    galleryLabel: "Selected Work",
  },
  "tattoo artist": {
    ...creativeDefaults,
    servicesLabel: "Services & Rates",
    servicesOverline: "The Work",
    galleryLabel: "Recent Tattoos",
    ctaBodyText: "book your consultation",
    appointmentWord: "consultation",
    websiteJob: "book_me",
  },
  muralist: {
    ...creativeDefaults,
    servicesLabel: "Services",
    galleryLabel: "Recent Murals",
    ctaBodyText: "let's talk about your space",
    appointmentWord: "consultation",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME-BASED FOOD (new industry)
// ─────────────────────────────────────────────────────────────────────────────

const homeBasedFoodDefaults: SubIndustryVocab = {
  servicesLabel: "What We Make",
  servicesOverline: "Our Menu",
  aboutLabel: "Our Story",
  reviewsLabel: "What Customers Say",
  reviewsOverline: "Happy Customers",
  galleryLabel: "The Goods",
  ctaBodyText: "message us to place your order",
  customerWord: "customer",
  appointmentWord: "order",
  websiteJob: "order_from_me",
}

const homeBasedFoodVocab: Record<string, SubIndustryVocab> = {
  "cottage baker": {
    ...homeBasedFoodDefaults,
    servicesLabel: "What We Bake",
    servicesOverline: "Our Menu",
    ctaBodyText: "message us to place an order",
  },
  "tortilla maker": {
    ...homeBasedFoodDefaults,
    servicesLabel: "What We Make",
    ctaBodyText: "message us to place your order",
  },
  "tamale maker": {
    ...homeBasedFoodDefaults,
    servicesLabel: "Our Menu",
    galleryLabel: "The Food",
    ctaBodyText: "message us to order",
  },
  "custom cakes": {
    ...homeBasedFoodDefaults,
    servicesLabel: "Cake Services",
    servicesOverline: "What I Create",
    galleryLabel: "Recent Cakes",
    aboutLabel: "About Me",
    ctaBodyText: "message me to discuss your custom cake",
  },
  "meal prep at home": {
    ...homeBasedFoodDefaults,
    servicesLabel: "Meal Plans",
    servicesOverline: "What I Prep",
    galleryLabel: "This Week's Menu",
    reviewsLabel: "What Clients Say",
    reviewsOverline: "Client Stories",
    aboutLabel: "About Me",
    ctaBodyText: "message me to get started",
    customerWord: "client",
  },
  "personal chef": {
    ...homeBasedFoodDefaults,
    servicesLabel: "Services",
    servicesOverline: "What I Do",
    galleryLabel: "What I Cook",
    reviewsLabel: "What Clients Say",
    reviewsOverline: "Client Stories",
    aboutLabel: "About Me",
    ctaBodyText: "let's talk about your next dinner",
    customerWord: "client",
    appointmentWord: "booking",
    websiteJob: "hire_me",
  },
  "salsa/hot sauce": {
    ...homeBasedFoodDefaults,
    servicesLabel: "Our Products",
    servicesOverline: "What We Make",
    ctaBodyText: "order now — made in small batches",
  },
  "jam/preserves": {
    ...homeBasedFoodDefaults,
    servicesLabel: "Our Products",
    servicesOverline: "What We Make",
    galleryLabel: "The Jars",
    ctaBodyText: "order now",
  },
  "food subscription": {
    ...homeBasedFoodDefaults,
    servicesLabel: "Subscription Plans",
    servicesOverline: "How It Works",
    ctaBodyText: "sign up for your first box",
    appointmentWord: "subscription",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// EDUCATION & INSTRUCTION (new industry)
// ─────────────────────────────────────────────────────────────────────────────

const educationDefaults: SubIndustryVocab = {
  servicesLabel: "Programs & Rates",
  servicesOverline: "What I Teach",
  aboutLabel: "About Me",
  reviewsLabel: "Student & Parent Reviews",
  reviewsOverline: "What Students Say",
  galleryLabel: "Student Results",
  ctaBodyText: "reach out to book a session or ask a question",
  customerWord: "student",
  appointmentWord: "session",
  websiteJob: "book_me",
}

const educationVocab: Record<string, SubIndustryVocab> = {
  "private tutor": {
    ...educationDefaults,
    servicesLabel: "Subjects & Rates",
    reviewsLabel: "Parent Reviews",
    reviewsOverline: "What Parents Say",
  },
  "music lessons": {
    ...educationDefaults,
    servicesLabel: "Lessons & Rates",
    servicesOverline: "What I Teach",
    galleryLabel: "Student Performances",
    reviewsLabel: "Student & Parent Reviews",
    ctaBodyText: "book your first lesson",
    appointmentWord: "lesson",
  },
  "art lessons": {
    ...educationDefaults,
    servicesLabel: "Classes & Rates",
    servicesOverline: "What I Teach",
    galleryLabel: "Student Work",
    ctaBodyText: "book your first class",
    appointmentWord: "class",
  },
  "dance instructor": {
    ...educationDefaults,
    servicesLabel: "Classes & Programs",
    galleryLabel: "The Studio",
    ctaBodyText: "book your first class",
    appointmentWord: "class",
  },
  "driving school": {
    ...educationDefaults,
    servicesLabel: "Lessons & Packages",
    galleryLabel: "Our Vehicles",
    aboutLabel: "About Us",
    ctaBodyText: "book your first lesson",
    appointmentWord: "lesson",
  },
  "swim lessons": {
    ...educationDefaults,
    servicesLabel: "Lessons & Programs",
    galleryLabel: "In the Pool",
    reviewsLabel: "Parent Reviews",
    reviewsOverline: "What Parents Say",
    ctaBodyText: "book your first lesson",
    appointmentWord: "lesson",
  },
  "language tutor": {
    ...educationDefaults,
    servicesLabel: "Languages & Rates",
    galleryLabel: "Student Progress",
    reviewsLabel: "Student Reviews",
    reviewsOverline: "What Students Say",
    ctaBodyText: "book your first session",
  },
  "test prep": {
    ...educationDefaults,
    servicesLabel: "Programs & Rates",
    reviewsLabel: "Student & Parent Reviews",
    ctaBodyText: "book your first session",
  },
  "coding for kids": {
    ...educationDefaults,
    servicesLabel: "Classes & Programs",
    galleryLabel: "Student Projects",
    reviewsLabel: "Parent Reviews",
    reviewsOverline: "What Parents Say",
    ctaBodyText: "book your first class",
    appointmentWord: "class",
  },
  "reading specialist": {
    ...educationDefaults,
    servicesLabel: "Programs & Rates",
    reviewsLabel: "Parent Reviews",
    reviewsOverline: "What Parents Say",
    ctaBodyText: "book a free consultation",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// MUSIC & PERFORMANCE (new industry)
// ─────────────────────────────────────────────────────────────────────────────

const musicDefaults: SubIndustryVocab = {
  servicesLabel: "Sets & Packages",
  servicesOverline: "What I Offer",
  aboutLabel: "About Me",
  reviewsLabel: "What People Say",
  reviewsOverline: "Reviews",
  galleryLabel: "Live Performances",
  ctaBodyText: "reach out to book me for your event",
  customerWord: "client",
  appointmentWord: "booking",
  websiteJob: "hire_me",
}

const musicVocab: Record<string, SubIndustryVocab> = {
  "solo musician": { ...musicDefaults },
  band: {
    ...musicDefaults,
    servicesLabel: "Sets & Packages",
    aboutLabel: "About the Band",
    galleryLabel: "Live Shows",
    ctaBodyText: "book us for your next event",
  },
  "singer-songwriter": {
    ...musicDefaults,
    servicesLabel: "Performances & Services",
    galleryLabel: "Live Performances",
    ctaBodyText: "reach out to book or collaborate",
  },
  "cover band": {
    ...musicDefaults,
    servicesLabel: "Sets & Packages",
    aboutLabel: "About the Band",
    reviewsLabel: "What Clients Say",
    reviewsOverline: "Client Reviews",
    galleryLabel: "Live Shows",
    ctaBodyText: "book us for your next event",
  },
  "string quartet": {
    ...musicDefaults,
    servicesLabel: "Packages & Repertoire",
    servicesOverline: "What We Offer",
    aboutLabel: "About the Quartet",
    reviewsLabel: "What Clients Say",
    reviewsOverline: "Client Reviews",
    galleryLabel: "Recent Performances",
    ctaBodyText: "inquire about your event",
  },
  comedian: {
    ...musicDefaults,
    servicesLabel: "Shows & Bookings",
    servicesOverline: "What I Do",
    galleryLabel: "Performances",
    ctaBodyText: "book me for your next event",
  },
  magician: {
    ...musicDefaults,
    servicesLabel: "Shows & Packages",
    servicesOverline: "What I Do",
    reviewsLabel: "What Clients Say",
    reviewsOverline: "Client Reviews",
    galleryLabel: "Recent Shows",
    ctaBodyText: "book your show",
  },
  "children's entertainer": {
    ...musicDefaults,
    servicesLabel: "Party Packages",
    servicesOverline: "What I Do",
    reviewsLabel: "What Parents Say",
    reviewsOverline: "Parent Reviews",
    galleryLabel: "Recent Parties",
    ctaBodyText: "book your party",
    customerWord: "parent",
  },
  "face painter": {
    ...musicDefaults,
    servicesLabel: "Services & Packages",
    servicesOverline: "What I Do",
    reviewsLabel: "What Parents Say",
    reviewsOverline: "Parent Reviews",
    galleryLabel: "Recent Work",
    ctaBodyText: "book for your next event",
    customerWord: "parent",
  },
  "spoken word": {
    ...musicDefaults,
    servicesLabel: "Performances & Services",
    galleryLabel: "Performances",
    ctaBodyText: "book me for your event",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSIONAL SERVICES
// ─────────────────────────────────────────────────────────────────────────────

const professionalServicesDefaults: SubIndustryVocab = {
  servicesLabel: "How I Help",
  servicesOverline: "Services",
  aboutLabel: "About Me",
  reviewsLabel: "Client Stories",
  reviewsOverline: "What Clients Say",
  galleryLabel: "Our Work",
  ctaBodyText: "schedule a free consultation — no obligation",
  customerWord: "client",
  appointmentWord: "consultation",
  websiteJob: "trust_me",
}

const professionalServicesVocab: Record<string, SubIndustryVocab> = {
  accountant: {
    ...professionalServicesDefaults,
    servicesLabel: "Services",
    servicesOverline: "What I Do",
    ctaBodyText: "schedule a free consultation",
  },
  bookkeeper: {
    ...professionalServicesDefaults,
    servicesLabel: "Bookkeeping Services",
    servicesOverline: "What I Do",
    ctaBodyText: "let's get your books in order",
  },
  "tax preparer": {
    ...professionalServicesDefaults,
    servicesLabel: "Tax Services",
    servicesOverline: "What I Do",
    ctaBodyText: "schedule your tax appointment",
    appointmentWord: "appointment",
    websiteJob: "book_me",
  },
  attorney: {
    ...professionalServicesDefaults,
    servicesLabel: "Practice Areas",
    servicesOverline: "How I Help",
    reviewsLabel: "Client Testimonials",
    reviewsOverline: "What Clients Say",
    ctaBodyText: "schedule a free case review",
    appointmentWord: "case review",
  },
  notary: {
    ...professionalServicesDefaults,
    servicesLabel: "Notary Services",
    servicesOverline: "What I Do",
    ctaBodyText: "schedule your notary appointment",
    appointmentWord: "appointment",
    websiteJob: "book_me",
  },
  "insurance agent": {
    ...professionalServicesDefaults,
    servicesLabel: "Coverage Options",
    servicesOverline: "What I Offer",
    ctaBodyText: "get a free quote — no pressure",
    appointmentWord: "quote",
    websiteJob: "quote_me",
  },
  "financial advisor": {
    ...professionalServicesDefaults,
    servicesLabel: "Services",
    servicesOverline: "How I Help",
    ctaBodyText: "schedule a complimentary consultation",
  },
  "mortgage broker": {
    ...professionalServicesDefaults,
    servicesLabel: "Loan Options",
    servicesOverline: "What I Offer",
    ctaBodyText: "get pre-qualified today — takes minutes",
    appointmentWord: "call",
    websiteJob: "quote_me",
  },
  "HR consultant": {
    ...professionalServicesDefaults,
    servicesLabel: "Services",
    aboutLabel: "About Us",
    ctaBodyText: "let's talk about your team",
  },
  "business coach": {
    ...professionalServicesDefaults,
    servicesLabel: "Programs & Services",
    servicesOverline: "How I Help",
    reviewsLabel: "Client Wins",
    reviewsOverline: "What Clients Say",
    galleryLabel: "Client Results",
    ctaBodyText: "book a free strategy call",
    appointmentWord: "call",
    websiteJob: "hire_me",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTHCARE
// ─────────────────────────────────────────────────────────────────────────────

const healthcareDefaults: SubIndustryVocab = {
  servicesLabel: "Services",
  servicesOverline: "How We Help",
  aboutLabel: "Our Practice",
  reviewsLabel: "Patient Reviews",
  reviewsOverline: "What Patients Say",
  galleryLabel: "Our Office",
  ctaBodyText: "call or message us to schedule your first visit",
  customerWord: "patient",
  appointmentWord: "appointment",
  websiteJob: "book_me",
}

const healthcareVocab: Record<string, SubIndustryVocab> = {
  dentist: {
    ...healthcareDefaults,
    servicesLabel: "Dental Services",
    servicesOverline: "What We Offer",
    galleryLabel: "Our Office",
    ctaBodyText: "schedule your appointment — new patients welcome",
  },
  chiropractor: {
    ...healthcareDefaults,
    servicesLabel: "Treatments",
    servicesOverline: "How I Help",
    aboutLabel: "About Me",
    ctaBodyText: "schedule your first adjustment",
    appointmentWord: "adjustment",
  },
  "physical therapist": {
    ...healthcareDefaults,
    servicesLabel: "Therapy Services",
    servicesOverline: "How I Help",
    aboutLabel: "About Me",
    galleryLabel: "The Clinic",
    ctaBodyText: "schedule your evaluation",
    appointmentWord: "evaluation",
  },
  "speech therapist": {
    ...healthcareDefaults,
    servicesLabel: "Therapy Services",
    servicesOverline: "How I Help",
    aboutLabel: "About Me",
    reviewsLabel: "Family Reviews",
    reviewsOverline: "What Families Say",
    ctaBodyText: "schedule your first session",
    customerWord: "family",
    appointmentWord: "session",
  },
  optometrist: {
    ...healthcareDefaults,
    servicesLabel: "Eye Care Services",
    servicesOverline: "What We Offer",
    ctaBodyText: "schedule your eye exam — new patients welcome",
    appointmentWord: "exam",
  },
  acupuncturist: {
    ...healthcareDefaults,
    servicesLabel: "Treatments & Packages",
    servicesOverline: "What I Offer",
    aboutLabel: "About Me",
    ctaBodyText: "schedule your first treatment",
    appointmentWord: "treatment",
  },
  naturopath: {
    ...healthcareDefaults,
    servicesLabel: "Services",
    servicesOverline: "How I Help",
    aboutLabel: "About Me",
    ctaBodyText: "schedule your first consultation",
    appointmentWord: "consultation",
  },
  "therapist/counselor": {
    ...healthcareDefaults,
    servicesLabel: "Services",
    servicesOverline: "How I Help",
    aboutLabel: "About Me",
    reviewsLabel: "Client Stories",
    reviewsOverline: "What Clients Say",
    galleryLabel: "The Office",
    ctaBodyText: "reach out — taking new clients now",
    customerWord: "client",
    appointmentWord: "session",
  },
  dermatologist: {
    ...healthcareDefaults,
    servicesLabel: "Treatments & Services",
    servicesOverline: "What We Offer",
    ctaBodyText: "schedule your consultation",
    appointmentWord: "consultation",
  },
  audiologist: {
    ...healthcareDefaults,
    servicesLabel: "Hearing Services",
    servicesOverline: "What We Offer",
    ctaBodyText: "schedule your hearing evaluation",
    appointmentWord: "evaluation",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CHILDCARE & FAMILY
// ─────────────────────────────────────────────────────────────────────────────

const childcareDefaults: SubIndustryVocab = {
  servicesLabel: "Programs & Rates",
  servicesOverline: "What We Offer",
  aboutLabel: "About Us",
  reviewsLabel: "What Families Say",
  reviewsOverline: "Family Reviews",
  galleryLabel: "Our Space",
  ctaBodyText: "schedule a tour — we love meeting new families",
  customerWord: "family",
  appointmentWord: "tour",
  websiteJob: "trust_me",
}

const childcareVocab: Record<string, SubIndustryVocab> = {
  "licensed daycare": {
    ...childcareDefaults,
    servicesLabel: "Programs & Availability",
    ctaBodyText: "schedule a tour — currently enrolling",
    appointmentWord: "tour",
  },
  "in-home daycare": {
    ...childcareDefaults,
    servicesLabel: "Programs & Rates",
    aboutLabel: "About Me",
    ctaBodyText: "reach out — small group, big care",
  },
  "after-school care": {
    ...childcareDefaults,
    servicesLabel: "Programs",
    servicesOverline: "What We Offer",
    ctaBodyText: "ask about availability for your child",
  },
  "nanny/babysitter": {
    ...childcareDefaults,
    servicesLabel: "Services & Availability",
    servicesOverline: "What I Offer",
    aboutLabel: "About Me",
    reviewsLabel: "Parent Reviews",
    reviewsOverline: "What Parents Say",
    ctaBodyText: "reach out to check my availability",
    customerWord: "parent",
    appointmentWord: "meeting",
  },
  preschool: {
    ...childcareDefaults,
    servicesLabel: "Programs & Curriculum",
    servicesOverline: "What We Teach",
    ctaBodyText: "schedule a tour — now enrolling",
  },
  doula: {
    ...childcareDefaults,
    servicesLabel: "Services & Packages",
    servicesOverline: "How I Help",
    aboutLabel: "About Me",
    reviewsLabel: "Birth Stories",
    reviewsOverline: "What Families Say",
    galleryLabel: "My Work",
    ctaBodyText: "reach out — let's connect before your due date",
    customerWord: "family",
    appointmentWord: "consultation",
    websiteJob: "hire_me",
  },
  "postpartum doula": {
    ...childcareDefaults,
    servicesLabel: "Services & Packages",
    servicesOverline: "How I Help",
    aboutLabel: "About Me",
    reviewsLabel: "Family Stories",
    reviewsOverline: "What Families Say",
    ctaBodyText: "reach out — you deserve support right now",
    appointmentWord: "consultation",
    websiteJob: "hire_me",
  },
  "newborn care specialist": {
    ...childcareDefaults,
    servicesLabel: "Services",
    servicesOverline: "How I Help",
    aboutLabel: "About Me",
    ctaBodyText: "reach out to discuss your needs",
    appointmentWord: "consultation",
    websiteJob: "hire_me",
  },
  "parenting coach": {
    ...childcareDefaults,
    servicesLabel: "Programs & Sessions",
    servicesOverline: "How I Help",
    aboutLabel: "About Me",
    reviewsLabel: "Parent Stories",
    reviewsOverline: "What Parents Say",
    ctaBodyText: "book a free intro call",
    customerWord: "parent",
    appointmentWord: "session",
    websiteJob: "hire_me",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// MAKERS & CRAFTS
// ─────────────────────────────────────────────────────────────────────────────

const makersCraftsDefaults: SubIndustryVocab = {
  servicesLabel: "What I Make",
  servicesOverline: "The Work",
  aboutLabel: "About Me",
  reviewsLabel: "What Customers Say",
  reviewsOverline: "Customer Reviews",
  galleryLabel: "The Work",
  ctaBodyText: "reach out to commission a piece or ask about availability",
  customerWord: "customer",
  appointmentWord: "order",
  websiteJob: "hire_me",
}

const makersCraftsVocab: Record<string, SubIndustryVocab> = {
  "jewelry maker": {
    ...makersCraftsDefaults,
    servicesLabel: "Collections & Custom",
    servicesOverline: "What I Create",
    galleryLabel: "The Collection",
    ctaBodyText: "commission a piece or shop what's available",
    appointmentWord: "commission",
  },
  ceramicist: {
    ...makersCraftsDefaults,
    servicesLabel: "Pieces & Custom Orders",
    servicesOverline: "What I Make",
    galleryLabel: "The Studio",
    ctaBodyText: "reach out about custom pieces or upcoming sales",
    appointmentWord: "commission",
  },
  woodworker: {
    ...makersCraftsDefaults,
    servicesLabel: "Services & Custom Work",
    servicesOverline: "What I Build",
    galleryLabel: "Recent Builds",
    ctaBodyText: "reach out about your project",
    appointmentWord: "project",
  },
  "candle maker": {
    ...makersCraftsDefaults,
    servicesLabel: "Products & Collections",
    servicesOverline: "What We Make",
    galleryLabel: "The Products",
    ctaBodyText: "order now or reach out about custom orders",
    websiteJob: "order_from_me",
  },
  "soap maker": {
    ...makersCraftsDefaults,
    servicesLabel: "Products & Collections",
    servicesOverline: "What We Make",
    galleryLabel: "The Products",
    ctaBodyText: "order now or ask about wholesale",
    websiteJob: "order_from_me",
  },
  "tailor/seamstress": {
    ...makersCraftsDefaults,
    servicesLabel: "Services & Pricing",
    servicesOverline: "What I Do",
    galleryLabel: "Recent Work",
    ctaBodyText: "book your fitting or alteration",
    appointmentWord: "fitting",
    websiteJob: "book_me",
  },
  "screen printer": {
    ...makersCraftsDefaults,
    servicesLabel: "Services & Pricing",
    servicesOverline: "What We Print",
    aboutLabel: "About Us",
    galleryLabel: "Recent Orders",
    ctaBodyText: "get a quote on your order",
    appointmentWord: "quote",
    websiteJob: "quote_me",
  },
  leatherworker: {
    ...makersCraftsDefaults,
    servicesLabel: "Products & Custom Orders",
    servicesOverline: "What I Make",
    galleryLabel: "The Work",
    ctaBodyText: "reach out about custom pieces",
    appointmentWord: "commission",
  },
  "weaver/textile artist": {
    ...makersCraftsDefaults,
    servicesLabel: "Pieces & Commissions",
    servicesOverline: "What I Create",
    galleryLabel: "The Work",
    ctaBodyText: "reach out about commissions",
    appointmentWord: "commission",
  },
  "glass artist": {
    ...makersCraftsDefaults,
    servicesLabel: "Pieces & Custom Work",
    servicesOverline: "What I Create",
    galleryLabel: "The Portfolio",
    ctaBodyText: "reach out about custom work",
    appointmentWord: "commission",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME & PROPERTY
// ─────────────────────────────────────────────────────────────────────────────

const homePropertyDefaults: SubIndustryVocab = {
  servicesLabel: "Services",
  servicesOverline: "What We Do",
  aboutLabel: "About Us",
  reviewsLabel: "What Clients Say",
  reviewsOverline: "Client Stories",
  galleryLabel: "Our Work",
  ctaBodyText: "get in touch for a free estimate",
  customerWord: "client",
  appointmentWord: "estimate",
  websiteJob: "quote_me",
}

const homePropertyVocab: Record<string, SubIndustryVocab> = {
  "interior designer": {
    ...homePropertyDefaults,
    servicesLabel: "Design Services",
    servicesOverline: "How I Help",
    aboutLabel: "About Me",
    galleryLabel: "Recent Projects",
    ctaBodyText: "schedule a free consultation",
    appointmentWord: "consultation",
    websiteJob: "hire_me",
  },
  "home organizer": {
    ...homePropertyDefaults,
    servicesLabel: "Services & Packages",
    servicesOverline: "How I Help",
    aboutLabel: "About Me",
    galleryLabel: "Before & After",
    ctaBodyText: "book your free consultation",
    appointmentWord: "consultation",
    websiteJob: "hire_me",
  },
  "junk removal": {
    ...homePropertyDefaults,
    servicesLabel: "Services & Pricing",
    servicesOverline: "What We Haul",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Reviews",
    ctaBodyText: "get a free quote — same-day service available",
    customerWord: "customer",
  },
  "moving company": {
    ...homePropertyDefaults,
    servicesLabel: "Moving Services",
    servicesOverline: "What We Do",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Reviews",
    ctaBodyText: "get a free moving quote",
    customerWord: "customer",
    appointmentWord: "move",
  },
  "home inspector": {
    ...homePropertyDefaults,
    servicesLabel: "Inspection Services",
    servicesOverline: "What We Inspect",
    reviewsLabel: "What Clients Say",
    reviewsOverline: "Client Reviews",
    ctaBodyText: "schedule your home inspection",
    appointmentWord: "inspection",
    websiteJob: "book_me",
  },
  "pest control": {
    ...homePropertyDefaults,
    servicesLabel: "Services & Treatments",
    servicesOverline: "What We Treat",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Reviews",
    ctaBodyText: "call or message for a free estimate",
    customerWord: "customer",
  },
  locksmith: {
    ...homePropertyDefaults,
    servicesLabel: "Services",
    servicesOverline: "What We Do",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Reviews",
    ctaBodyText: "call now — available 24/7",
    customerWord: "customer",
    appointmentWord: "service call",
    websiteJob: "hire_me",
  },
  "pool service": {
    ...homePropertyDefaults,
    servicesLabel: "Pool Services",
    servicesOverline: "What We Do",
    galleryLabel: "Pool Work",
    ctaBodyText: "get a free service quote",
    customerWord: "customer",
  },
  "window cleaner": {
    ...homePropertyDefaults,
    servicesLabel: "Services & Pricing",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Reviews",
    ctaBodyText: "get a free estimate",
    customerWord: "customer",
  },
  "pressure washing": {
    ...homePropertyDefaults,
    servicesLabel: "Services & Pricing",
    servicesOverline: "What We Clean",
    galleryLabel: "Before & After",
    reviewsLabel: "What Customers Say",
    reviewsOverline: "Customer Reviews",
    ctaBodyText: "get a free estimate",
    customerWord: "customer",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// NONPROFIT & COMMUNITY
// ─────────────────────────────────────────────────────────────────────────────

const nonprofitDefaults: SubIndustryVocab = {
  servicesLabel: "Programs & Services",
  servicesOverline: "What We Do",
  aboutLabel: "Our Mission",
  reviewsLabel: "Community Stories",
  reviewsOverline: "What Our Community Says",
  galleryLabel: "Our Community",
  ctaBodyText: "get involved — every hand makes a difference",
  customerWord: "community member",
  appointmentWord: "visit",
  websiteJob: "find_me",
}

const nonprofitVocab: Record<string, SubIndustryVocab> = {
  church: {
    ...nonprofitDefaults,
    servicesLabel: "Services & Programs",
    servicesOverline: "Join Us",
    aboutLabel: "About Our Church",
    reviewsLabel: "From Our Congregation",
    reviewsOverline: "Community Voices",
    galleryLabel: "Our Community",
    ctaBodyText: "all are welcome — come as you are",
    customerWord: "member",
    appointmentWord: "service",
  },
  "mosque/temple": {
    ...nonprofitDefaults,
    servicesLabel: "Services & Programs",
    servicesOverline: "Join Us",
    aboutLabel: "About Us",
    reviewsLabel: "From Our Community",
    reviewsOverline: "Community Voices",
    ctaBodyText: "all are welcome — come as you are",
    customerWord: "member",
  },
  "nonprofit org": {
    ...nonprofitDefaults,
    servicesLabel: "Programs & Impact",
    ctaBodyText: "donate, volunteer, or get in touch",
    appointmentWord: "conversation",
    websiteJob: "trust_me",
  },
  "community center": {
    ...nonprofitDefaults,
    servicesLabel: "Programs & Classes",
    servicesOverline: "What We Offer",
    aboutLabel: "About Us",
    ctaBodyText: "come in — open to everyone",
    customerWord: "neighbor",
  },
  "mutual aid group": {
    ...nonprofitDefaults,
    servicesLabel: "How We Help",
    servicesOverline: "What We Do",
    aboutLabel: "About Us",
    ctaBodyText: "reach out — we help and we need help",
    customerWord: "neighbor",
    websiteJob: "find_me",
  },
  "animal rescue": {
    ...nonprofitDefaults,
    servicesLabel: "Adopt & Support",
    servicesOverline: "How You Can Help",
    aboutLabel: "Our Mission",
    reviewsLabel: "Adopter Stories",
    reviewsOverline: "Happy Tails",
    galleryLabel: "Meet Our Animals",
    ctaBodyText: "adopt, foster, or donate — every action saves a life",
    customerWord: "adopter",
    appointmentWord: "meet and greet",
  },
  "food bank": {
    ...nonprofitDefaults,
    servicesLabel: "Services & Distribution",
    aboutLabel: "Our Mission",
    reviewsLabel: "Community Stories",
    ctaBodyText: "donate food, money, or time",
    customerWord: "neighbor",
    websiteJob: "find_me",
  },
  "youth program": {
    ...nonprofitDefaults,
    servicesLabel: "Programs & Activities",
    servicesOverline: "What We Offer",
    reviewsLabel: "Family Stories",
    reviewsOverline: "What Families Say",
    ctaBodyText: "enroll your child or volunteer with us",
    customerWord: "youth",
  },
  "environmental org": {
    ...nonprofitDefaults,
    servicesLabel: "Programs & Initiatives",
    servicesOverline: "What We Do",
    aboutLabel: "Our Mission",
    ctaBodyText: "get involved — the work starts here",
    customerWord: "volunteer",
    appointmentWord: "event",
  },
  "neighborhood association": {
    ...nonprofitDefaults,
    servicesLabel: "Programs & Meetings",
    aboutLabel: "About Us",
    ctaBodyText: "join your neighbors — membership is free",
    customerWord: "neighbor",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY-LEVEL DEFAULTS (fallback when sub-industry has no match)
// ─────────────────────────────────────────────────────────────────────────────

const industryDefaults: Record<string, SubIndustryVocab> = {
  home_services: homeServiceDefaults,
  food: foodDefaults,
  wellness: wellnessDefaults,
  events: eventsDefaults,
  retail: retailDefaults,
  fitness: fitnessDefaults,
  beauty: beautyDefaults,
  automotive: automotiveDefaults,
  pet_services: petDefaults,
  cleaning: cleaningDefaults,
  landscaping: landscapingDefaults,
  real_estate: realEstateDefaults,
  creative_services: creativeDefaults,
  home_based_food: homeBasedFoodDefaults,
  education: educationDefaults,
  music_performance: musicDefaults,
  professional_services: professionalServicesDefaults,
  healthcare: healthcareDefaults,
  childcare: childcareDefaults,
  makers_crafts: makersCraftsDefaults,
  home_property: homePropertyDefaults,
  nonprofit: nonprofitDefaults,
}

// All sub-industry maps combined
const allVocab: Record<string, SubIndustryVocab> = {
  ...homeServiceVocab,
  ...foodVocab,
  ...wellnessVocab,
  ...eventsVocab,
  ...retailVocab,
  ...fitnessVocab,
  ...beautyVocab,
  ...automotiveVocab,
  ...petVocab,
  ...cleaningVocab,
  ...landscapingVocab,
  ...realEstateVocab,
  ...creativeVocab,
  ...homeBasedFoodVocab,
  ...educationVocab,
  ...musicVocab,
  ...professionalServicesVocab,
  ...healthcareVocab,
  ...childcareVocab,
  ...makersCraftsVocab,
  ...homePropertyVocab,
  ...nonprofitVocab,
}

// Global fallback — used when nothing else matches
const globalDefault: SubIndustryVocab = {
  servicesLabel: "Our Services",
  servicesOverline: "What We Do",
  aboutLabel: "About Us",
  reviewsLabel: "What Clients Say",
  reviewsOverline: "Client Stories",
  galleryLabel: "Our Work",
  ctaBodyText: "send us a message and we'll be in touch",
  customerWord: "client",
  appointmentWord: "appointment",
  websiteJob: "book_me",
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP FUNCTION
// Priority: exact sub-industry match → partial match → industry default → global default
// ─────────────────────────────────────────────────────────────────────────────

export function getVocab(subIndustry: string | null | undefined, industryCategory: string): SubIndustryVocab {
  if (subIndustry) {
    const normalized = subIndustry.toLowerCase().trim()

    // 1. Exact match
    if (allVocab[normalized]) return allVocab[normalized]

    // 2. Partial match — stored value contains a known key or vice versa
    const partialMatch = Object.keys(allVocab).find(
      (key) => normalized.includes(key) || key.includes(normalized)
    )
    if (partialMatch) return allVocab[partialMatch]
  }

  // 3. Industry-level default
  const industryKey = industryCategory.toLowerCase().replace(/[\s-]/g, "_")
  if (industryDefaults[industryKey]) return industryDefaults[industryKey]

  // 4. Global fallback
  return globalDefault
}

// Convenience — get just the website job for an industry/sub-industry pair
export function getWebsiteJob(subIndustry: string | null | undefined, industryCategory: string): WebsiteJob {
  return getVocab(subIndustry, industryCategory).websiteJob
}
