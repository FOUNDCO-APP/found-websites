import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const ts = require("typescript")
const { createClient } = require("@supabase/supabase-js")
const reportPath = path.resolve("quality/copy-repair-plan.md")
const copyFields = ["hero_title", "hero_subtitle", "about_text", "tagline", "cta_headline", "services", "faq_items"]

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

const { polishWebsiteUpdates } = loadTsModule("src/lib/copyPolish.ts")

function stable(value) {
  return JSON.stringify(value ?? null)
}

function summarize(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null)
  return text.replace(/\s+/g, " ").slice(0, 220)
}

function escapeMarkdown(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ")
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

function pickCopyFields(config) {
  const picked = {}
  for (const field of copyFields) {
    if (field in config) picked[field] = config[field]
  }
  return picked
}

function isBlankString(value) {
  return typeof value === "string" && value.trim() === ""
}

function isEmptyArray(value) {
  return Array.isArray(value) && value.length === 0
}

function isEmptyEquivalent(before, after) {
  if (before == null && (after == null || isBlankString(after) || isEmptyArray(after))) return true
  if (isBlankString(before) && (after == null || isBlankString(after))) return true
  return false
}

function changedFields(rawConfig, polishedConfig) {
  const changes = []
  for (const field of copyFields) {
    if (!(field in rawConfig)) continue
    if (isEmptyEquivalent(rawConfig[field], polishedConfig[field])) continue
    if (stable(rawConfig[field]) !== stable(polishedConfig[field])) {
      changes.push({ field, before: rawConfig[field], after: polishedConfig[field] })
    }
  }
  return changes
}

function renderReport({ generatedAt, apply, companies, repairs, applied, skipped }) {
  const lines = [
    "# Copy Repair Plan",
    "",
    `Generated: ${generatedAt}`,
    `Mode: ${apply ? "APPLY" : "DRY RUN"}`,
    `Businesses scanned: ${companies.length}`,
    `Businesses with copy changes: ${repairs.length}`,
    `Fields that would change: ${repairs.reduce((sum, repair) => sum + repair.changes.length, 0)}`,
    "",
    "This plan only includes copy fields that the shared production copy polish layer changes. It does not invent new copy, fill empty taglines, touch menu data, or touch non-copy fields.",
    "",
  ]

  if (apply) {
    lines.push(`Applied updates: ${applied}`)
    lines.push(`Skipped updates: ${skipped}`)
    lines.push("")
  } else {
    lines.push("No Supabase writes were performed.")
    lines.push("To apply later, rerun with: npm.cmd run repair:copy-quality -- --apply --confirm=APPLY_COPY_REPAIRS")
    lines.push("")
  }

  lines.push("## Businesses")
  lines.push("")
  lines.push("| Business | Industry | Fields |")
  lines.push("| --- | --- | --- |")
  for (const repair of repairs) {
    lines.push(`| ${escapeMarkdown(repair.slug)} | ${escapeMarkdown(repair.industry)} | ${escapeMarkdown(repair.changes.map(change => change.field).join(", "))} |`)
  }

  lines.push("")
  lines.push("## Field Changes")
  lines.push("")
  lines.push("| Business | Field | Before | After |")
  lines.push("| --- | --- | --- | --- |")
  for (const repair of repairs) {
    for (const change of repair.changes) {
      lines.push(`| ${escapeMarkdown(repair.slug)} | ${escapeMarkdown(change.field)} | ${escapeMarkdown(summarize(change.before))} | ${escapeMarkdown(summarize(change.after))} |`)
    }
  }

  return `${lines.join("\n")}\n`
}

async function main() {
  loadEnv(".env.local")
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

  const apply = process.argv.includes("--apply")
  const confirmed = process.argv.includes("--confirm=APPLY_COPY_REPAIRS")
  if (apply && !confirmed) {
    throw new Error("Refusing to apply without --confirm=APPLY_COPY_REPAIRS")
  }

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, slug, industry_category, sub_industry, city, state, active, website_config(*)")
    .eq("active", true)
    .order("created_at", { ascending: false })

  if (error) throw error

  const companies = data ?? []
  const repairs = []

  for (const company of companies) {
    const rawConfig = Array.isArray(company.website_config) ? company.website_config[0] : company.website_config
    if (!rawConfig?.id) continue

    const rawCopy = pickCopyFields(rawConfig)
    const polishedCopy = polishWebsiteUpdates({ ...rawCopy }, copyContext(company))
    const changes = changedFields(rawCopy, polishedCopy)
    if (!changes.length) continue

    repairs.push({
      companyId: company.id,
      configId: rawConfig.id,
      slug: company.slug,
      industry: [company.industry_category, company.sub_industry].filter(Boolean).join(" / ") || "unknown",
      updates: Object.fromEntries(changes.map(change => [change.field, change.after])),
      changes,
    })
  }

  let applied = 0
  let skipped = 0
  if (apply) {
    for (const repair of repairs) {
      const { error: updateError } = await supabase
        .from("website_config")
        .update({ ...repair.updates, updated_at: new Date().toISOString() })
        .eq("id", repair.configId)
        .eq("company_id", repair.companyId)

      if (updateError) {
        skipped++
        console.error(`[repair-copy-quality] skipped ${repair.slug}: ${updateError.message}`)
      } else {
        applied++
      }
    }
  }

  fs.writeFileSync(reportPath, renderReport({ generatedAt: new Date().toISOString(), apply, companies, repairs, applied, skipped }), "utf8")
  console.log(`copy repair ${apply ? "apply" : "dry-run"}: ${companies.length} businesses scanned, ${repairs.length} businesses with changes, ${repairs.reduce((sum, repair) => sum + repair.changes.length, 0)} fields ${apply ? "changed" : "planned"}`)
  console.log(`report: ${path.relative(process.cwd(), reportPath)}`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})