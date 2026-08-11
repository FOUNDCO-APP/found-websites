import fs from "node:fs"
import path from "node:path"

const files = [
  "src/components/layouts/ImpactLayout.tsx",
  "src/components/layouts/CinematicLayout.tsx",
  "src/components/layouts/PortraitLayout.tsx",
  "src/components/layouts/EditorialLayout.tsx",
  "src/components/layouts/WellnessLuxeLayout.tsx",
  "src/components/layouts/WellnessCinematicLayout.tsx",
  "src/components/layouts/CatalogShowcase.tsx",
  "src/app/[slug]/about/page.tsx",
  "src/app/[slug]/services/page.tsx",
  "src/app/[slug]/menu/page.tsx",
  "src/app/[slug]/order/OnlineOrderClient.tsx",
  "src/app/[slug]/shop/ShopClient.tsx",
]

const issues = []

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length
}

for (const file of files) {
  const absolute = path.resolve(file)
  if (!fs.existsSync(absolute)) {
    issues.push(`${file}: file missing from typography check`)
    continue
  }

  const source = fs.readFileSync(absolute, "utf8")
  const tagPattern = /<h[12]\b[\s\S]*?>/g
  let match
  while ((match = tagPattern.exec(source))) {
    const tag = match[0]
    const isLargePublicHeading = /text-(?:4xl|5xl|6xl|7xl|8xl|9xl|3xl)/.test(tag)
    if (!isLargePublicHeading) continue

    const hasUnsafeLeading = /leading-none|leading-\[0\.\d+\]/.test(tag)
    const hasSafetyClass = /public-(?:hero|display)-title/.test(tag)
    if (hasUnsafeLeading && !hasSafetyClass) {
      issues.push(`${file}:${lineNumber(source, match.index)} large public heading uses unsafe line-height without public hero/display safety class`)
    }
  }
}

if (issues.length) {
  console.error("public hero typography check failed:")
  for (const issue of issues) console.error(`- ${issue}`)
  process.exit(1)
}

console.log(`public hero typography ok: ${files.length} files checked`)
