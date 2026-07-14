export type LocationSectionInput = {
  businessName: string
  industry: string | null | undefined
  subIndustry: string | null | undefined
  primaryIntent: string | null | undefined
  city: string | null | undefined
  state: string | null | undefined
  serviceAreas: string[] | null | undefined
}

export type LocationSection = {
  overline: string
  heading: string
  body: string
  areas: string[]
  display: "story" | "chips"
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalize(value: unknown) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function titleArea(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.length <= 3 && /^[a-z]+$/i.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

function uniqueAreas(areas: string[] | null | undefined) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const area of areas ?? []) {
    const cleaned = clean(area)
    if (!cleaned) continue
    const key = normalize(cleaned)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(titleArea(cleaned))
  }
  return result
}

function locationLabel(city: string | null | undefined, state: string | null | undefined) {
  return [clean(city), clean(state)].filter(Boolean).join(", ")
}

function isSameAsPrimaryArea(area: string, city: string | null | undefined, state: string | null | undefined) {
  const cityOnly = normalize(city)
  const full = normalize(locationLabel(city, state))
  const areaKey = normalize(area)
  return Boolean(areaKey && (areaKey === cityOnly || areaKey === full))
}

function includesAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word))
}

function businessKind(input: LocationSectionInput) {
  const industry = normalize(input.industry)
  const sub = normalize(input.subIndustry)
  const intent = normalize(input.primaryIntent)
  const combined = `${industry} ${sub} ${intent}`

  if (includesAny(combined, ["food truck", "mobile food", "pop up", "popup"])) return "food_truck"
  if (includesAny(combined, ["online", "ecommerce", "e commerce", "virtual", "shipping"]) || (intent === "shop" && !clean(input.city))) return "online"
  if (includesAny(industry, ["home services", "cleaning", "landscaping", "home property"])) return "service_area"
  if (includesAny(industry, ["events", "music performance"])) return "event"
  if (includesAny(industry, ["retail", "makers crafts"])) return "retail"
  if (includesAny(industry, ["food", "home based food"])) return "food"
  if (includesAny(industry, ["beauty", "wellness", "fitness", "healthcare", "childcare"])) return "appointment"
  if (includesAny(industry, ["nonprofit"]) || includesAny(sub, ["church", "ministry", "mosque", "temple", "faith"])) return "community"
  if (includesAny(industry, ["professional services", "real estate", "education", "creative services", "photography"])) return "relationship"
  return "local"
}

export function getLocationSection(input: LocationSectionInput): LocationSection {
  const name = clean(input.businessName) || "This business"
  const city = clean(input.city)
  const place = locationLabel(input.city, input.state) || city
  const areas = uniqueAreas(input.serviceAreas)
  const kind = businessKind(input)
  const meaningfulAreas = areas.filter((area) => !isSameAsPrimaryArea(area, input.city, input.state))
  const hasManyAreas = meaningfulAreas.length >= 2
  const areaList = hasManyAreas ? meaningfulAreas : areas

  if (hasManyAreas) {
    if (kind === "event") {
      return {
        overline: "Where We Go",
        heading: city ? `Events Across ${city}` : "Events Across the Area",
        body: `${name} supports events across the places customers gather, with planning shaped around the venue, timing, and guest experience.`,
        areas: areaList,
        display: "chips",
      }
    }
    if (kind === "food_truck") {
      return {
        overline: "Find Us Around Town",
        heading: city ? `Serving Around ${city}` : "Serving Around Town",
        body: `${name} moves with the crowd, showing up where people are ready for something worth stopping for.`,
        areas: areaList,
        display: "chips",
      }
    }
    if (kind === "service_area") {
      return {
        overline: "Where We Work",
        heading: "Service Areas",
        body: `${name} serves nearby homes and businesses with clear scheduling, steady communication, and work planned around the local area.`,
        areas: areaList,
        display: "chips",
      }
    }
    return {
      overline: "Where to Find Us",
      heading: city ? `Around ${city}` : "Around the Area",
      body: `${name} is built for customers across the local area, with a simple way to reach out and take the next step.`,
      areas: areaList,
      display: "chips",
    }
  }

  if (kind === "online") {
    return {
      overline: "Available Online",
      heading: city ? `Ships From ${city}` : "Built to Order Online",
      body: city
        ? `${name} is based in ${place} and built for customers who want a simple online path from browsing to ordering.`
        : `${name} is built for customers who want a simple online path from browsing to ordering, without needing a storefront visit.`,
      areas: [],
      display: "story",
    }
  }

  if (kind === "food_truck") {
    return {
      overline: "Find Us Around Town",
      heading: city ? `Serving Around ${city}` : "Serving Around Town",
      body: city
        ? `${name} is rooted in ${place}, with a flexible setup made for neighborhoods, events, and people finding us on the move.`
        : `${name} is built to meet customers where they are, with a flexible setup made for events, neighborhoods, and busy days.`,
      areas: [],
      display: "story",
    }
  }

  if (kind === "retail") {
    return {
      overline: "Visit the Shop",
      heading: city ? `Based in ${city}` : "A Shop with a Point of View",
      body: city
        ? `${name} is rooted in ${place}, with a shop experience built around useful choices, thoughtful selection, and a visit that feels worth making.`
        : `${name} is built around useful choices, thoughtful selection, and a shopping experience that feels worth coming back to.`,
      areas: [],
      display: "story",
    }
  }

  if (kind === "food") {
    return {
      overline: "Come See Us",
      heading: city ? `Serving ${city}` : "Made for the Neighborhood",
      body: city
        ? `${name} serves ${place} with food, timing, and hospitality shaped around the people who come through the door.`
        : `${name} is made for customers who care about food, timing, and a place that feels easy to come back to.`,
      areas: [],
      display: "story",
    }
  }

  if (kind === "appointment") {
    return {
      overline: "Visit the Studio",
      heading: city ? `Appointments in ${city}` : "A Calm Place to Book",
      body: city
        ? `${name} welcomes clients in ${place} with appointments shaped around comfort, timing, and personal care.`
        : `${name} is built around appointments that feel clear, personal, and easy to plan.`,
      areas: [],
      display: "story",
    }
  }

  if (kind === "community") {
    return {
      overline: "Rooted Here",
      heading: city ? `Rooted in ${city}` : "Built Around Community",
      body: city
        ? `${name} is part of ${place}, shaped by the people it serves and the mission that brings them together.`
        : `${name} is shaped by the people it serves and the mission that brings them together.`,
      areas: [],
      display: "story",
    }
  }

  if (kind === "service_area") {
    return {
      overline: "Where We Work",
      heading: city ? `Serving ${city}` : "Ready Where You Need Us",
      body: city
        ? `${name} serves ${place} with clear scheduling, steady communication, and work planned around the local area.`
        : `${name} keeps the process clear from first contact to finished work, even when the job starts away from a storefront.`,
      areas: [],
      display: "story",
    }
  }

  if (kind === "event") {
    return {
      overline: "Where We Go",
      heading: city ? `Events in ${city}` : "Built for the Room",
      body: city
        ? `${name} supports events in ${place} with planning shaped around the venue, the schedule, and the guest experience.`
        : `${name} supports events with planning shaped around the venue, the schedule, and the guest experience.`,
      areas: [],
      display: "story",
    }
  }

  if (kind === "relationship") {
    return {
      overline: "Local Guidance",
      heading: city ? `Focused on ${city}` : "Clear Next Steps",
      body: city
        ? `${name} works from ${place} with guidance that feels personal, practical, and easy to act on.`
        : `${name} is built around practical guidance, clear next steps, and a simple way to begin the conversation.`,
      areas: [],
      display: "story",
    }
  }

  return {
    overline: city ? "Based Here" : "How We Work",
    heading: city ? `Based in ${city}` : "Clear Next Steps",
    body: city
      ? `${name} is based in ${place}, with a customer experience shaped around clarity, care, and a simple way to get started.`
      : `${name} is built around clarity, care, and a simple way for customers to get started.`,
    areas: [],
    display: "story",
  }
}
