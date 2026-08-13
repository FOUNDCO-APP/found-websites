import { readFileSync } from "node:fs"

// The swipe carousel used to live only in IndustryPage.tsx's PlanCarousel.
// It's now the shared PlanPicker component (Home + Industry both use it),
// so this guard checks the shared component instead of one page.
const source = readFileSync("src/components/PlanPicker.tsx", "utf8")

const bannedTokens = [
  "overflow-x-auto",
  "snap-x",
  "snap-mandatory",
  "w-max",
  "100vw",
]

const found = bannedTokens.filter((token) => source.includes(token))

if (found.length > 0) {
  console.error(`Plan picker mobile layout guard failed. Banned carousel tokens found: ${found.join(", ")}`)
  console.error("Use a controlled one-card selector instead of a native horizontal scroll row in PlanPicker.")
  process.exit(1)
}

console.log("Plan picker mobile layout guard passed.")
