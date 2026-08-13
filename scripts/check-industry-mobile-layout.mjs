import { readFileSync } from "node:fs"

const source = readFileSync("src/components/IndustryPage.tsx", "utf8")
const planCarouselMatch = source.match(/function PlanCarousel[\s\S]*?\n}\n\nfunction IndustryOutcomeProof/)

if (!planCarouselMatch) {
  console.error("Could not find PlanCarousel in src/components/IndustryPage.tsx")
  process.exit(1)
}

const planCarouselSource = planCarouselMatch[0]
const bannedTokens = [
  "overflow-x-auto",
  "snap-x",
  "snap-mandatory",
  "w-max",
  "100vw",
]

const found = bannedTokens.filter((token) => planCarouselSource.includes(token))

if (found.length > 0) {
  console.error(`Industry mobile layout guard failed. Banned carousel tokens found: ${found.join(", ")}`)
  console.error("Use a controlled one-card selector instead of a native horizontal scroll row on industry pages.")
  process.exit(1)
}

console.log("Industry mobile layout guard passed.")
