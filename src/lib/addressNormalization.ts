const DIRECTION_ABBREVIATIONS = new Map([
  ["n", "N"],
  ["s", "S"],
  ["e", "E"],
  ["w", "W"],
  ["ne", "NE"],
  ["nw", "NW"],
  ["se", "SE"],
  ["sw", "SW"],
])

const UPPERCASE_TOKENS = new Set(["az", "us", "usa", "llc", "llp", "pllc", "hoa"])

const STREET_WORDS = new Map([
  ["north", "North"],
  ["south", "South"],
  ["east", "East"],
  ["west", "West"],
  ["northeast", "Northeast"],
  ["northwest", "Northwest"],
  ["southeast", "Southeast"],
  ["southwest", "Southwest"],
  ["st", "St"],
  ["st.", "St"],
  ["street", "Street"],
  ["ave", "Ave"],
  ["ave.", "Ave"],
  ["avenue", "Avenue"],
  ["rd", "Rd"],
  ["rd.", "Rd"],
  ["road", "Road"],
  ["blvd", "Blvd"],
  ["blvd.", "Blvd"],
  ["boulevard", "Boulevard"],
  ["drive", "Drive"],
  ["dr", "Dr"],
  ["dr.", "Dr"],
  ["lane", "Lane"],
  ["ln", "Ln"],
  ["ln.", "Ln"],
  ["court", "Court"],
  ["ct", "Ct"],
  ["ct.", "Ct"],
  ["circle", "Circle"],
  ["cir", "Cir"],
  ["cir.", "Cir"],
  ["place", "Place"],
  ["pl", "Pl"],
  ["pl.", "Pl"],
  ["terrace", "Terrace"],
  ["ter", "Ter"],
  ["ter.", "Ter"],
  ["way", "Way"],
  ["parkway", "Parkway"],
  ["pkwy", "Pkwy"],
  ["pkwy.", "Pkwy"],
  ["highway", "Highway"],
  ["hwy", "Hwy"],
  ["hwy.", "Hwy"],
  ["suite", "Suite"],
  ["ste", "Ste"],
  ["ste.", "Ste"],
  ["unit", "Unit"],
  ["apt", "Apt"],
  ["apt.", "Apt"],
])

export function normalizeAddressText(value?: string | null): string {
  if (!value) return ""

  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map(normalizeAddressToken)
    .join(" ")
}

function normalizeAddressToken(token: string): string {
  if (!token) return token

  const match = token.match(/^([^A-Za-z0-9#]*)([#A-Za-z0-9][A-Za-z0-9.'#-]*)([^A-Za-z0-9]*)$/)
  if (!match) return token

  const [, prefix, core, suffix] = match
  if (core.startsWith("#")) return `${prefix}${core.toUpperCase()}${suffix}`

  const lower = core.toLowerCase()
  const noPeriod = lower.replace(/\.$/, "")

  if (DIRECTION_ABBREVIATIONS.has(noPeriod)) return `${prefix}${DIRECTION_ABBREVIATIONS.get(noPeriod)}${suffix}`
  if (UPPERCASE_TOKENS.has(lower) || UPPERCASE_TOKENS.has(noPeriod)) return `${prefix}${noPeriod.toUpperCase()}${suffix}`
  if (STREET_WORDS.has(lower)) return `${prefix}${STREET_WORDS.get(lower)}${suffix}`
  if (STREET_WORDS.has(noPeriod)) return `${prefix}${STREET_WORDS.get(noPeriod)}${suffix}`
  if (core.includes("-")) return `${prefix}${core.split("-").map(titleCaseIfNeeded).join("-")}${suffix}`

  return `${prefix}${titleCaseIfNeeded(core)}${suffix}`
}

function titleCaseIfNeeded(value: string): string {
  if (!value) return value
  if (/[A-Z]/.test(value.slice(1)) && /[a-z]/.test(value)) return value
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}
