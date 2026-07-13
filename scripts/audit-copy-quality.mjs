import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const ts = require("typescript")
const { createClient } = require("@supabase/supabase-js")
const reportPath = path.resolve("quality/copy-audit-report.md")

function loadEnv(file) {
  const envPath = path.resolve(file)
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, "utf8")
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const index = trimmed.indexOf("=")
    if (index === -1) continue
    const key = trimmed.slice(0, index)
    const value = trimmed.slice(index + 1)
    if (!process.env[key]) process.env[key] = value
  }
}

function loadTsModule(modulePath, cache = new Map()) {
  let sourcePath = path.resolve(modulePath)
  if (!fs.existsSync(sourcePath) && fs.existsSync(`${sourcePath}.ts`)) sourcePath = `${sourcePath}.ts`
  if (!fs.existsSync(sourcePath) && fs.existsSync(path.join(sourcePath, "index.ts"))) sourcePath = path.join(sourcePath, "index.ts")
  if (cache.has(sourcePath)) return cache.get(sourcePath).exports

  const source = fs.readFileSync(sourcePath, "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText

  const module = { exports: {} }
  cache.set(sourcePath, module)
  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) return loadTsModule(path.resolve("src", specifier.slice(2)), cache)
    if (specifier.startsWith(".")) return loadTsModule(path.resolve(path.dirname(sourcePath), specifier), cache)
    return require(specifier)
  }
  const context = { exports: module.exports, module, require: localRequire, console, process, URL }
  vm.runInNewContext(output, context, { filename: sourcePath })
  return module.exports
}

const { getAboutHeroSubtitle, polishBusinessName, polishWebsiteUpdates } = loadTsModule("src/lib/copyPolish.ts")
const { buildFallbackWebsiteContent } = loadTsModule("src/lib/contentGeneration.ts")

const rawLabelPatterns = [
  /\bhome_services\b/i,
  /\bprofessional_services\b/i,
  /\bpet_services\b/i,
  /\breal_estate\b/i,
  /\bcreative_services\b/i,
  /\bfood_beverage\b/i,
  /\b[a-z]+_[a-z_]+\b/i,
]

const fillerPhrases = [
  "the work speaks for itself",
  "shows, bookings",
  "everything in between",
  "come see what we're all about",
  "clear options, thoughtful guidance",
  "easy next step",
  "real results",
  "handled with clear communication",
  "from first question to finished result",
]

const industryMismatchRules = [
  {
    id: "faith-business-language",
    match: (company) => hasAny(company, ["church", "faith", "ministry", "congregation", "mosque", "temple"]),
    forbidden: ["shows", "bookings", "work speaks for itself", "locally owned and operated", "customers"],
    direction: "Use faith/community language: worship, service, neighbors, connection, welcome.",
  },
  {
    id: "restaurant-service-language",
    match: (company) => hasAny(company, ["restaurant", "food", "catering", "bar", "cafe", "coffee", "taco"]),
    forbidden: ["free estimate", "quote", "job right", "stand behind it", "services & programs"],
    direction: "Use menu/order/reservation/visit language, not contractor or nonprofit language.",
  },
  {
    id: "contractor-retail-language",
    match: (company) => hasAny(company, ["contractor", "construction", "home_services", "cleaning", "landscaping", "plumbing", "roofing"]),
    forbidden: ["shop now", "reserve a table", "menu", "treatments & pricing"],
    direction: "Use estimate, project, service area, and work-quality language.",
  },
  {
    id: "retail-contractor-language",
    match: (company) => hasAny(company, ["retail", "apparel", "clothing", "shirts", "shop"]),
    forbidden: ["free estimate", "quote", "book online", "job right"],
    direction: "Use shop, collection, product, visit, and local retail language.",
  },
]

function hasAny(company, terms) {
  const label = normalize([company.industry_category, company.sub_industry, company.name, company.slug].filter(Boolean).join(" "))
  return terms.some(term => {
    const normalizedTerm = normalize(term)
    return new RegExp(`(^|\\s)${normalizedTerm.replace(/\\s+/g, "\\\\s+")}(\\s|$)`).test(label)
  })
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function escapeMarkdown(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ")
}

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}

function sentenceList(value) {
  return compact(value).split(/(?<=[.!?])\s+/).filter(Boolean)
}

function repeatedWord(value) {
  return /\b([a-z]{3,})\b(?:\s+\1\b){1,}/i.exec(value)?.[0] ?? null
}

function repeatedNgram(value) {
  const words = normalize(value).split(" ").filter(word => word.length > 2)
  for (let size = 5; size >= 3; size--) {
    const seen = new Map()
    for (let index = 0; index <= words.length - size; index++) {
      const phrase = words.slice(index, index + size).join(" ")
      const previous = seen.get(phrase)
      if (previous !== undefined && index - previous >= size) return phrase
      seen.set(phrase, index)
    }
  }
  return null
}

function repeatedIntro(value, company) {
  const sentences = sentenceList(value).map(normalize)
  const city = normalize(company.city)
  const intros = sentences.filter(sentence => city && sentence.includes(city) && /\bis\s+(?:a|an)\s+/.test(sentence))
  return intros.length > 1 ? intros.slice(0, 2).join(" / ") : null
}

function isTooCommaHeavy(value) {
  return (String(value).match(/,/g) || []).length > 4
}

function maybeWeak(value) {
  const text = compact(value)
  return text.length > 0 && text.length < 18
}

function addIssue(issues, issue) {
  issues.push({
    level: issue.level,
    slug: issue.slug,
    industry: issue.industry,
    field: issue.field,
    issue: issue.issue,
    sample: compact(issue.sample).slice(0, 220),
    direction: issue.direction,
  })
}

function auditTextField(issues, company, field, value, scope) {
  const text = compact(value)
  if (!text) {
    addIssue(issues, {
      level: field.includes("hero_title") || field.includes("about_text") ? "high" : "medium",
      slug: company.slug,
      industry: industryLabel(company),
      field: `${scope}.${field}`,
      issue: "Missing public copy",
      sample: "",
      direction: "Generate concise, business-specific copy before launch.",
    })
    return
  }

  const repeat = repeatedWord(text)
  if (repeat) {
    addIssue(issues, {
      level: "high",
      slug: company.slug,
      industry: industryLabel(company),
      field: `${scope}.${field}`,
      issue: `Repeated word sequence: "${repeat}"`,
      sample: text,
      direction: "Remove accidental repeated words before the owner sees the site.",
    })
  }

  const ngram = repeatedNgram(text)
  if (ngram) {
    addIssue(issues, {
      level: "high",
      slug: company.slug,
      industry: industryLabel(company),
      field: `${scope}.${field}`,
      issue: `Repeated phrase in same field: "${ngram}"`,
      sample: text,
      direction: "Collapse repeated thoughts into one clean sentence.",
    })
  }

  const intro = repeatedIntro(text, company)
  if (intro) {
    addIssue(issues, {
      level: "high",
      slug: company.slug,
      industry: industryLabel(company),
      field: `${scope}.${field}`,
      issue: "Repeated business/location intro",
      sample: text,
      direction: "Keep the stronger, more specific intro sentence and remove the duplicate.",
    })
  }

  for (const phrase of fillerPhrases) {
    if (text.toLowerCase().includes(phrase)) {
      addIssue(issues, {
        level: scope === "rendered" ? "medium" : "low",
        slug: company.slug,
        industry: industryLabel(company),
        field: `${scope}.${field}`,
        issue: `Generic filler phrase: "${phrase}"`,
        sample: text,
        direction: "Replace with specific language for this business type.",
      })
    }
  }

  for (const pattern of rawLabelPatterns) {
    if (pattern.test(text)) {
      addIssue(issues, {
        level: scope === "rendered" ? "high" : "medium",
        slug: company.slug,
        industry: industryLabel(company),
        field: `${scope}.${field}`,
        issue: "Raw database industry label leaked into copy",
        sample: text,
        direction: "Convert internal labels into human language before rendering.",
      })
    }
  }

  if (isTooCommaHeavy(text)) {
    addIssue(issues, {
      level: "medium",
      slug: company.slug,
      industry: industryLabel(company),
      field: `${scope}.${field}`,
      issue: "Comma-heavy copy will feel dense on mobile",
      sample: text,
      direction: "Split into shorter sentences with one idea each.",
    })
  }

  if (maybeWeak(text) && !field.includes("tagline")) {
    addIssue(issues, {
      level: "low",
      slug: company.slug,
      industry: industryLabel(company),
      field: `${scope}.${field}`,
      issue: "Copy is probably too thin",
      sample: text,
      direction: "Add one specific customer-facing detail.",
    })
  }

  for (const rule of industryMismatchRules) {
    if (!rule.match(company)) continue
    for (const phrase of rule.forbidden) {
      if (text.toLowerCase().includes(phrase)) {
        addIssue(issues, {
          level: scope === "rendered" ? "high" : "medium",
          slug: company.slug,
          industry: industryLabel(company),
          field: `${scope}.${field}`,
          issue: `Industry mismatch (${rule.id}): "${phrase}"`,
          sample: text,
          direction: rule.direction,
        })
      }
    }
  }
}

function auditServices(issues, company, services, scope) {
  if (!Array.isArray(services) || services.length === 0) {
    addIssue(issues, {
      level: "medium",
      slug: company.slug,
      industry: industryLabel(company),
      field: `${scope}.services`,
      issue: "No service/menu/program items",
      sample: "",
      direction: "Add at least one clear offering so the site explains what customers can do next.",
    })
    return
  }

  const signatures = new Map()
  for (const [index, service] of services.entries()) {
    const name = service?.name ?? ""
    const description = service?.description ?? ""
    auditTextField(issues, company, `services[${index}].name`, name, scope)
    auditTextField(issues, company, `services[${index}].description`, description, scope)
    const normalizedName = normalize(name)
    const signature = normalize(description).replace(new RegExp(`\\b${normalizedName.replace(/\s+/g, "\\s+")}\\b`, "g"), "{service}")
    if (signature) signatures.set(signature, (signatures.get(signature) ?? 0) + 1)
  }

  for (const [signature, count] of signatures.entries()) {
    if (count > 1) {
      addIssue(issues, {
        level: scope === "rendered" ? "high" : "medium",
        slug: company.slug,
        industry: industryLabel(company),
        field: `${scope}.services`,
        issue: "Multiple services use the same description structure",
        sample: signature,
        direction: "Give each offering a distinct customer-facing reason to choose it.",
      })
    }
  }
}

function auditFaq(issues, company, items, scope) {
  if (!Array.isArray(items)) return
  for (const [index, item] of items.entries()) {
    auditTextField(issues, company, `faq_items[${index}].q`, item?.q ?? "", scope)
    auditTextField(issues, company, `faq_items[${index}].a`, item?.a ?? "", scope)
  }
}

function auditMenu(issues, company, categories, scope) {
  if (!Array.isArray(categories)) return
  for (const [categoryIndex, category] of categories.entries()) {
    auditTextField(issues, company, `menu_items[${categoryIndex}].category`, category?.category ?? "", scope)
    for (const [itemIndex, item] of (category?.items ?? []).entries()) {
      auditTextField(issues, company, `menu_items[${categoryIndex}].items[${itemIndex}].name`, item?.name ?? "", scope)
      auditTextField(issues, company, `menu_items[${categoryIndex}].items[${itemIndex}].description`, item?.description ?? "", scope)
    }
  }
}

function auditConfig(issues, company, config, scope) {
  for (const field of ["hero_title", "hero_subtitle", "about_text", "tagline", "cta_headline"]) {
    auditTextField(issues, company, field, config?.[field] ?? "", scope)
  }
  auditServices(issues, company, config?.services, scope)
  auditFaq(issues, company, config?.faq_items, scope)
  auditMenu(issues, company, config?.menu_items, scope)
}

function auditAboutPageVirtualFields(issues, company) {
  const displayName = polishBusinessName(company.name)
  const subtitle = getAboutHeroSubtitle(copyContext(company))
  auditTextField(issues, company, "about_page.hero_title", `About ${displayName}`, "rendered")
  auditTextField(issues, company, "about_page.hero_subtitle", subtitle, "rendered")
}

function industryLabel(company) {
  return [company.industry_category, company.sub_industry].filter(Boolean).join(" / ") || "unknown"
}

function copyContext(company) {
  return {
    businessName: company.name,
    industry: company.industry_category,
    subIndustry: company.sub_industry,
    city: company.city,
    state: company.state,
  }
}

function buildFallbackInput(company) {
  const config = Array.isArray(company.website_config) ? company.website_config[0] : company.website_config
  return {
    name: company.name,
    description: config?.tagline ?? "",
    industry: company.industry_category ?? "business",
    subIndustry: company.sub_industry ?? "",
    city: company.city,
    state: company.state,
    different: "",
    services: Array.isArray(config?.services) ? config.services : [],
    vibe: company.vibe ?? "bold",
    manifest: {
      primaryJob: "",
      jonyNote: "",
      primaryIntent: company.primary_intent ?? "contact",
      secondaryIntent: company.secondary_intent ?? null,
    },
  }
}

function countByLevel(issues) {
  return {
    high: issues.filter(issue => issue.level === "high").length,
    medium: issues.filter(issue => issue.level === "medium").length,
    low: issues.filter(issue => issue.level === "low").length,
  }
}

function issueSortValue(issue) {
  const level = { high: 0, medium: 1, low: 2 }[issue.level] ?? 3
  return `${level}:${issue.slug}:${issue.field}:${issue.issue}`
}

function renderReport(companies, issues) {
  const counts = countByLevel(issues)
  const sorted = [...issues].sort((a, b) => issueSortValue(a).localeCompare(issueSortValue(b)))
  const generatedAt = new Date().toISOString()
  const lines = [
    "# Copy Quality Audit",
    "",
    `Generated: ${generatedAt}`,
    `Businesses scanned: ${companies.length}`,
    `Issues: ${issues.length} total, ${counts.high} high, ${counts.medium} medium, ${counts.low} low`,
    "",
    "This is a read-only audit. It does not update Supabase or repair saved copy.",
    "",
    "## Steve / Jony / Craig Readout",
    "",
    "- Steve: High-risk issues are launch blockers because they make Found look untrustworthy.",
    "- Jony: Medium-risk issues make templates feel cheap, generic, or visually weaker than the design.",
    "- Craig: Any rendered issue means the shared polish/generation path still needs a system fix.",
    "",
    "## Issues",
    "",
    "| Risk | Business | Industry | Field | Issue | Sample | Direction |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ]

  if (sorted.length === 0) {
    lines.push("| none | all | all | all | No copy issues found |  |  |")
  } else {
    for (const issue of sorted) {
      lines.push(`| ${issue.level} | ${escapeMarkdown(issue.slug)} | ${escapeMarkdown(issue.industry)} | ${escapeMarkdown(issue.field)} | ${escapeMarkdown(issue.issue)} | ${escapeMarkdown(issue.sample)} | ${escapeMarkdown(issue.direction)} |`)
    }
  }

  return `${lines.join("\n")}\n`
}

async function main() {
  loadEnv(".env.local")
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, slug, industry_category, sub_industry, primary_intent, secondary_intent, vibe, city, state, active, website_config(*)")
    .eq("active", true)
    .order("created_at", { ascending: false })

  if (error) throw error

  const companies = data ?? []
  const issues = []

  for (const company of companies) {
    const rawConfig = Array.isArray(company.website_config) ? company.website_config[0] : company.website_config
    const renderedConfig = rawConfig ? polishWebsiteUpdates({ ...rawConfig }, copyContext(company)) : null

    auditConfig(issues, company, rawConfig ?? {}, "saved")
    auditConfig(issues, company, renderedConfig ?? {}, "rendered")
    auditAboutPageVirtualFields(issues, company)

    const fallback = buildFallbackWebsiteContent(buildFallbackInput(company))
    auditTextField(issues, company, "fallback.heroTitle", fallback.heroTitle, "generated")
    auditTextField(issues, company, "fallback.heroSubtitle", fallback.heroSubtitle, "generated")
    auditTextField(issues, company, "fallback.aboutText", fallback.aboutText, "generated")
    auditTextField(issues, company, "fallback.ctaHeadline", fallback.ctaHeadline, "generated")
    auditServices(issues, company, fallback.services, "generated")
  }

  fs.writeFileSync(reportPath, renderReport(companies, issues), "utf8")
  const counts = countByLevel(issues)
  console.log(`copy audit complete: ${companies.length} businesses, ${issues.length} issues (${counts.high} high, ${counts.medium} medium, ${counts.low} low)`)
  console.log(`report: ${path.relative(process.cwd(), reportPath)}`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})