type ValueItem = { label: string; body: (city: string) => string }
type ProcessItem = { step: string; title: string; body: string }

type IndustryDefaults = {
  footerTagline: string
  servicesIntro: string
  ctaHeadline: string
  galleryLabel: string
  gallerySubtitle: string
  values: ValueItem[]
  process: ProcessItem[]
}

const defaults: Record<string, IndustryDefaults> = {
  home_services: {
    footerTagline: "Locally owned. Built to last.",
    servicesIntro: "Every job handled by our own team — no subcontractors, no surprises.",
    ctaHeadline: "Ready to Get Started?",
    galleryLabel: "Our Work",
    gallerySubtitle: "Real work. Real results.",
    values: [
      { label: "Locally Owned", body: (city) => `Based right here in ${city || "your community"} — not a franchise, not a call center.` },
      { label: "Quality First",  body: () => "We stand behind every job. If something isn't right, we make it right." },
      { label: "Free Estimates", body: () => "No pressure. No surprises. Get a clear quote before any work begins." },
    ],
    process: [
      { step: "01", title: "Free Estimate",      body: "Tell us what you need. We come out, take a look, and give you a clear, honest quote — no pressure." },
      { step: "02", title: "We Get to Work",      body: "Our own crew shows up on time, keeps the job site clean, and communicates with you every step of the way." },
      { step: "03", title: "You Love the Result", body: "We don't consider the job done until you're satisfied. Quality you can see, craftsmanship that lasts." },
    ],
  },
  food: {
    footerTagline: "Fresh ingredients. Real food. Made for you.",
    servicesIntro: "Everything made fresh — real ingredients, no shortcuts, served fast.",
    ctaHeadline: "Come Fuel Up.",
    galleryLabel: "Our Menu",
    gallerySubtitle: "Fresh food, real ingredients.",
    values: [
      { label: "Fresh Daily",       body: () => "Everything is made fresh — we never use frozen or pre-packaged shortcuts." },
      { label: "Real Ingredients",  body: () => "No artificial flavors, no fillers. Just real food that tastes as good as it is for you." },
      { label: "Fast & Friendly",   body: (city) => `Serving ${city || "our community"} with a smile — fast food done the right way.` },
    ],
    process: [
      { step: "01", title: "Browse the Menu",  body: "Check out everything we offer — smoothies, bowls, meals, and more. Something for every goal and every craving." },
      { step: "02", title: "Place Your Order", body: "Walk in, order fresh, and watch it get made right in front of you. No mystery ingredients." },
      { step: "03", title: "Enjoy Every Bite", body: "Fuel your body with food that actually tastes great. Feel good knowing exactly what's in it." },
    ],
  },
  wellness: {
    footerTagline: "Your wellbeing, our priority.",
    servicesIntro: "Every service designed around your comfort, your goals, and your pace.",
    ctaHeadline: "Ready to Feel Your Best?",
    galleryLabel: "Our Space",
    gallerySubtitle: "Your sanctuary awaits.",
    values: [
      { label: "Expert Care",        body: () => "Our practitioners bring years of training and a genuine passion for your wellbeing." },
      { label: "Holistic Approach",  body: () => "We treat the whole person — body, mind, and spirit. Not just symptoms." },
      { label: "Your Comfort First", body: () => "Every visit is tailored to you. Your pace, your preferences, your experience." },
    ],
    process: [
      { step: "01", title: "Book Your Session",  body: "Choose a service and a time that works for you. Booking takes less than a minute." },
      { step: "02", title: "Arrive & Relax",     body: "Walk in, leave the outside world behind. We take care of everything from here." },
      { step: "03", title: "Leave Refreshed",    body: "Walk out feeling lighter, calmer, and more yourself. That's the promise." },
    ],
  },
  events: {
    footerTagline: "Making every moment unforgettable.",
    servicesIntro: "Full-service event production — from the first call to the final detail.",
    ctaHeadline: "Let's Make Something Unforgettable.",
    galleryLabel: "Our Portfolio",
    gallerySubtitle: "Every event, a memory.",
    values: [
      { label: "Creative Vision",       body: () => "We bring ideas you didn't know were possible. Every event is a blank canvas." },
      { label: "Full Service",          body: () => "One call, one team. We handle every detail so you can enjoy the moment." },
      { label: "Stress-Free Planning",  body: () => "You dream it. We plan it, build it, and run it. You just show up." },
    ],
    process: [
      { step: "01", title: "Tell Us Your Vision",  body: "Share your ideas, your date, your vibe. We listen first and bring the expertise." },
      { step: "02", title: "We Plan Everything",   body: "From vendors to timelines to setup, we coordinate every moving part." },
      { step: "03", title: "You Enjoy the Day",    body: "Show up to an event that exceeds your expectations. We handle the rest." },
    ],
  },
  retail: {
    footerTagline: "Locally owned. Carefully curated.",
    servicesIntro: "Every product selected with care — because you deserve better than what the big box stores carry.",
    ctaHeadline: "Come See Us.",
    galleryLabel: "Our Collection",
    gallerySubtitle: "Our collection, your style.",
    values: [
      { label: "Locally Owned",      body: (city) => `Based in ${city || "your community"} — your purchase supports a real local business.` },
      { label: "Curated Selection",  body: () => "We hand-pick everything in our store. No filler, no fast fashion, no compromise." },
      { label: "Expert Advice",      body: () => "Our team knows the products inside and out. Ask us anything." },
    ],
    process: [
      { step: "01", title: "Browse Our Collection", body: "Explore what we carry — in store or online. Every item is here for a reason." },
      { step: "02", title: "Get Expert Help",        body: "Our team is here to answer questions and help you find exactly what you need." },
      { step: "03", title: "Take It Home",           body: "Walk out with confidence knowing you chose something worth it." },
    ],
  },
  fitness: {
    footerTagline: "Built for results. Designed for you.",
    servicesIntro: "Every class, every session, every program designed to push you further.",
    ctaHeadline: "Start Your Journey.",
    galleryLabel: "Our Studio",
    gallerySubtitle: "Results you can see.",
    values: [
      { label: "Expert Coaches",     body: () => "Certified trainers who care as much about your results as you do." },
      { label: "Proven Results",     body: () => "Our programs are built on what actually works — not trends, not gimmicks." },
      { label: "Community First",    body: () => "You're not just a member. You're part of something that pushes you every day." },
    ],
    process: [
      { step: "01", title: "Book Your Class",   body: "Find a time that fits your schedule. First class is always the hardest — we'll be there." },
      { step: "02", title: "Show Up Ready",     body: "Come in, meet the team, and let's get to work. No experience necessary." },
      { step: "03", title: "See the Results",   body: "Consistency builds everything. Stick with it and you'll surprise yourself." },
    ],
  },
  beauty: {
    footerTagline: "Look good. Feel great. Be you.",
    servicesIntro: "Every service designed to bring out the best version of you.",
    ctaHeadline: "Book Your Appointment.",
    galleryLabel: "Our Work",
    gallerySubtitle: "Every look, a transformation.",
    values: [
      { label: "Expert Stylists",     body: () => "Years of training, a passion for craft, and an eye for what works for you specifically." },
      { label: "Premium Products",    body: () => "We only use professional-grade products that protect and enhance your look." },
      { label: "Your Look, Your Way", body: () => "We listen first. Every service is tailored to your style, your lifestyle, your goals." },
    ],
    process: [
      { step: "01", title: "Book Your Appointment", body: "Choose your service and a time that works for you. Online or by phone." },
      { step: "02", title: "Arrive & Relax",         body: "Come in and let us take it from here. Coffee? Water? You're in good hands." },
      { step: "03", title: "Love Your Look",         body: "Walk out feeling like a completely fresh version of yourself." },
    ],
  },
  automotive: {
    footerTagline: "Honest work. Fair prices. Every time.",
    servicesIntro: "Certified mechanics who treat your vehicle like their own.",
    ctaHeadline: "Schedule Your Service.",
    galleryLabel: "Our Work",
    gallerySubtitle: "Quality work you can trust.",
    values: [
      { label: "Certified Mechanics", body: () => "ASE-certified technicians with the training to do the job right the first time." },
      { label: "Honest Pricing",      body: () => "We explain everything before we start. No surprises, no unnecessary upsells." },
      { label: "Fast Turnaround",     body: () => "We respect your time. Most services completed same-day." },
    ],
    process: [
      { step: "01", title: "Schedule Service",         body: "Drop us a call or book online. We'll get you in fast." },
      { step: "02", title: "Drop Off Your Vehicle",    body: "We inspect, diagnose, and explain everything before any work begins." },
      { step: "03", title: "Drive Away Confident",     body: "Your vehicle, fixed right. Backed by our satisfaction guarantee." },
    ],
  },
  pet_services: {
    footerTagline: "Your pet deserves the best.",
    servicesIntro: "Gentle, professional care for pets who deserve nothing but the best.",
    ctaHeadline: "Book for Your Pet.",
    galleryLabel: "Our Work",
    gallerySubtitle: "Happy pets. Happy owners.",
    values: [
      { label: "Animal Lovers",             body: () => "We got into this because we love animals. That shows in every interaction." },
      { label: "Gentle Care",               body: () => "Patient, calm, and attentive. We treat every pet like it's our own." },
      { label: "Your Pet's Comfort First",  body: () => "Low-stress environment, experienced hands, and a lot of love." },
    ],
    process: [
      { step: "01", title: "Book an Appointment", body: "Schedule online or give us a call. We'll find a time that works for you and your pet." },
      { step: "02", title: "Drop Off Your Pet",   body: "We take it from here. Your pet is in gentle, experienced hands." },
      { step: "03", title: "Pick Up a Happy Pet", body: "They'll be clean, calm, and ready to show off." },
    ],
  },
  cleaning: {
    footerTagline: "Cleaner home. Clearer mind.",
    servicesIntro: "Professional cleaning services that leave your space spotless — every single time.",
    ctaHeadline: "Get a Free Quote.",
    galleryLabel: "Our Work",
    gallerySubtitle: "Clean spaces. Happy spaces.",
    values: [
      { label: "Thorough & Reliable",         body: () => "We don't cut corners. Every surface, every room, done right." },
      { label: "Eco-Friendly Products",        body: () => "Safe for your family, your pets, and the environment." },
      { label: "Satisfaction Guaranteed",      body: () => "Not happy with something? We come back and fix it. No questions asked." },
    ],
    process: [
      { step: "01", title: "Get a Quote",           body: "Tell us your space and your needs. We'll give you a clear, honest price." },
      { step: "02", title: "We Clean",              body: "Our team shows up on time and gets to work. You don't have to do a thing." },
      { step: "03", title: "Come Home to Clean",    body: "Walk into a spotless space and breathe easy. That's the feeling." },
    ],
  },
  landscaping: {
    footerTagline: "Beautiful outdoors start here.",
    servicesIntro: "Expert landscaping that transforms your outdoor space into something you're proud of.",
    ctaHeadline: "Get a Free Estimate.",
    galleryLabel: "Our Projects",
    gallerySubtitle: "Outdoor spaces transformed.",
    values: [
      { label: "Local Experts",          body: (city) => `We know the ${city || "local"} climate, soil, and plants better than anyone.` },
      { label: "Quality Materials",      body: () => "We only use materials and plants that thrive long-term. No shortcuts." },
      { label: "Satisfaction Guaranteed", body: () => "We don't consider the job done until you love what you see." },
    ],
    process: [
      { step: "01", title: "Free Estimate",       body: "We come out, walk your property, and give you a clear plan and price." },
      { step: "02", title: "We Design & Install", body: "Our crew handles everything — from design to planting to final cleanup." },
      { step: "03", title: "Enjoy Your Space",    body: "Step outside to a yard you're genuinely proud of. That's the goal." },
    ],
  },
  real_estate: {
    footerTagline: "Local guidance. Real relationships.",
    servicesIntro: "Whether you're buying, selling, investing, or exploring your next move, the right relationship matters.",
    ctaHeadline: "Let's Talk About Your Next Move.",
    galleryLabel: "Featured Properties",
    gallerySubtitle: "Homes, opportunities, and neighborhoods worth knowing.",
    values: [
      { label: "Local Market Knowledge", body: (city) => `Focused on ${city || "the local market"} with guidance that feels personal, not generic.` },
      { label: "Relationship First",     body: () => "Real estate is built on trust, follow-up, and staying connected long before the transaction." },
      { label: "Backed by Experience",   body: () => "Clear advice, steady communication, and a simple path from first conversation to next step." },
    ],
    process: [
      { step: "01", title: "Start the Conversation", body: "Tell us what you're thinking about: buying, selling, investing, or just watching the market." },
      { step: "02", title: "Get Clear Guidance",     body: "We'll help you understand your options, your timing, and the opportunities that fit your goals." },
      { step: "03", title: "Stay Connected",         body: "Good real estate relationships are built over time. We keep the conversation useful and simple." },
    ],
  },
}

const fallback: IndustryDefaults = {
  footerTagline: "Locally owned. Community focused.",
  servicesIntro: "Professional services tailored to your needs.",
  ctaHeadline: "Ready to Get Started?",
  galleryLabel: "Gallery",
  gallerySubtitle: "Our work speaks for itself.",
  values: [
    { label: "Locally Owned",  body: (city) => `Based right here in ${city || "your community"} — people you can trust.` },
    { label: "Quality First",  body: () => "We stand behind everything we do. Your satisfaction is our standard." },
    { label: "Here to Help",   body: () => "Questions, concerns, or feedback — we're always just a call away." },
  ],
  process: [
    { step: "01", title: "Get in Touch",       body: "Reach out and tell us what you need. We respond fast." },
    { step: "02", title: "We Get to Work",     body: "Our team handles everything with care, skill, and clear communication." },
    { step: "03", title: "You're Satisfied",   body: "We don't close the door until you're happy with the result." },
  ],
}

export function getIndustryDefaults(industryCategory: string): IndustryDefaults {
  return defaults[industryCategory] ?? fallback
}
