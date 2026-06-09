"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { detectIndustry, industryLabels } from "@/lib/industryDetection"
import { getIndustryManifest, industryManifests } from "@/lib/industryManifests"
import { palettes } from "@/lib/palettes"
import { createOnboardingSite } from "./actions"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

type Step =
  | "welcome" | "name" | "description" | "subIndustry" | "location"
  | "contact" | "different" | "services" | "photos" | "logo"
  | "color" | "vibe" | "testimonials"

type Answers = {
  name: string
  description: string
  industry: string | null
  subIndustry: string
  location: string
  serviceAreas: string[]
  phone: string
  email: string
  different: string
  services: string[]
  photoChoice: string
  logoChoice: string
  primaryColor: string
  vibe: string
  testimonials: string
}

const STEPS: Step[] = [
  "welcome", "name", "description", "subIndustry", "location",
  "contact", "different", "services", "photos", "logo",
  "color", "vibe", "testimonials",
]

const INITIAL: Answers = {
  name: "", description: "", industry: null, subIndustry: "",
  location: "", serviceAreas: [], phone: "", email: "",
  different: "", services: [], photoChoice: "", logoChoice: "",
  primaryColor: "#2E7D32", vibe: "", testimonials: "",
}

const DIFFERENTIATOR_CHIPS: Record<string, string[]> = {
  home_services:  ["Family owned", "Licensed & insured", "Free estimates", "Same-day service", "20+ years experience"],
  wellness:       ["Private sessions", "Board certified", "First session free", "In-home visits", "Bilingual"],
  food:           ["Made from scratch", "Locally sourced", "Family recipe", "Daily specials", "Gluten-free options"],
  events:         ["Full-service setup", "Custom designs", "Large events welcome", "Same-day delivery", "Bilingual team"],
  beauty:         ["Walk-ins welcome", "Master stylist", "Color specialist", "Award winning", "10+ years experience"],
  fitness:        ["Free trial class", "All levels welcome", "Certified trainers", "Online classes", "Monthly memberships"],
  retail:         ["Locally made", "Same-day shipping", "Wholesale available", "Custom orders", "Eco-friendly"],
  automotive:     ["Free diagnostics", "ASE certified", "Loaner vehicles", "Bilingual", "Family owned"],
  pet_services:   ["Fear-free certified", "First groom free", "Vet recommended", "Mobile service", "All breeds welcome"],
  cleaning:       ["Eco-friendly products", "Background checked", "Satisfaction guaranteed", "Same-week booking"],
  landscaping:    ["Free estimates", "Licensed & insured", "Bilingual crew", "Seasonal plans", "Water-smart designs"],
  real_estate:    ["Local market expert", "First-time buyer specialist", "Military relocation", "Investment properties"],
}

const GENERATING_LINES = ["Building your site.", "Writing your story.", "Almost ready."]

function canAdvance(step: Step, a: Answers): boolean {
  switch (step) {
    case "welcome":      return true
    case "name":         return a.name.trim().length > 1
    case "description":  return a.description.trim().length > 8
    case "subIndustry":  return !!a.subIndustry
    case "location":     return a.location.trim().length > 2
    case "contact":      return a.phone.trim().length > 6 && a.email.includes("@")
    case "different":    return a.different.trim().length > 8
    case "services":     return a.services.length > 0
    case "photos":       return !!a.photoChoice
    case "logo":         return !!a.logoChoice
    case "color":        return /^#[0-9a-f]{6}$/i.test(a.primaryColor)
    case "vibe":         return ["bold","calm","modern","warm"].includes(a.vibe)
    case "testimonials": return true
  }
}

function questionTitle(step: Step, a: Answers): string {
  switch (step) {
    case "welcome":      return "Let's build your website."
    case "name":         return "What's the name of your business?"
    case "description":  return "What do you do? Tell me in your own words."
    case "subIndustry":  return "What kind of business is it?"
    case "location":     return "Where are you based?"
    case "contact":      return "How do customers reach you?"
    case "different":    return "What makes you different?"
    case "services":     return "What services do you offer?"
    case "photos":       return "Got photos of your work?"
    case "logo":         return "Do you have a logo?"
    case "color":        return "Pick your brand color."
    case "vibe":         return "What's the feeling of your brand?"
    case "testimonials": return "Any happy customers to shout out?"
  }
}

function getAffirmation(step: Step, a: Answers): string {
  switch (step) {
    case "name":        return a.name.trim() ? `${a.name.trim()}. Perfect.` : ""
    case "description": return a.industry ? `${industryLabels[a.industry]} — makes sense.` : "Got it."
    case "location":    return a.location.trim() ? `${a.location.trim()}.` : ""
    case "contact":     return a.phone && a.email.includes("@") ? "That's your primary CTA on the whole site." : ""
    case "different":   return a.different.trim().length > 8 ? "That's your story. It'll be front and center." : ""
    case "services":    return a.services.length > 0 ? `${a.services.length} service${a.services.length > 1 ? "s" : ""} — solid.` : ""
    default:            return ""
  }
}

// ── Live Preview ──────────────────────────────────────────────────────────────
function LivePreview({ answers: a }: { answers: Answers }) {
  const color = a.primaryColor || SIGNAL_GREEN
  const name  = a.name || "Your Business"

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-10">
      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-white/20">Preview</p>

      <div
        className="relative w-[260px] rounded-[42px] border border-white/10 bg-[#141715] p-[9px]"
        style={{ height: 530, boxShadow: "0 40px 100px rgba(0,0,0,0.7)" }}
      >
        {/* Notch */}
        <div className="absolute left-1/2 top-[17px] h-5 w-[72px] -translate-x-1/2 rounded-full bg-[#0a0c0b]" />
        {/* Screen */}
        <div className="h-full overflow-hidden rounded-[35px] bg-white">
          {/* Hero */}
          <div className="relative flex h-44 flex-col justify-end p-4" style={{ backgroundColor: color }}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/60" />
            <div className="relative">
              {a.industry && (
                <p className="mb-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/60">
                  {industryLabels[a.industry]}
                </p>
              )}
              <p className="text-[13px] font-black leading-tight text-white">{name}</p>
            </div>
          </div>
          {/* Body */}
          <div className="p-4 space-y-2">
            {a.services.length > 0 ? (
              a.services.slice(0, 3).map((svc, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-black/[0.04] px-3 py-2">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate text-[10px] font-black text-[#111]">{svc}</span>
                </div>
              ))
            ) : (
              <>
                <div className="h-9 rounded-lg bg-black/[0.04]" />
                <div className="h-9 rounded-lg bg-black/[0.04]" />
                <div className="h-9 rounded-lg bg-black/[0.04]" />
              </>
            )}
            <div className="mt-3 flex h-9 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
              <span className="text-[8px] font-black uppercase tracking-[0.14em] text-white">
                {a.industry === "wellness" ? "Book Now" : a.industry === "food" ? "See Menu" : "Get a Quote"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {a.name && (
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: SIGNAL_GREEN, boxShadow: `0 0 8px ${SIGNAL_GREEN}80` }}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">Building</span>
        </div>
      )}
    </div>
  )
}

// ── Generating screen ─────────────────────────────────────────────────────────
function GeneratingScreen() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (idx >= GENERATING_LINES.length - 1) return
    const t = setTimeout(() => setIdx((i) => i + 1), 1600)
    return () => clearTimeout(t)
  }, [idx])

  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8" style={{ backgroundColor: FOUND_BLACK }}>
      <div
        style={{
          width: 52, height: 52, borderRadius: "50%",
          border: "1.5px solid rgba(255,255,255,0.07)",
          borderTop: `1.5px solid ${SIGNAL_GREEN}`,
          animation: "spin 1s linear infinite",
        }}
      />
      <p
        key={idx}
        className="text-xl font-light tracking-wide text-white/75"
        style={{ animation: "fade-up 0.5s ease-out both" }}
      >
        {GENERATING_LINES[idx]}
      </p>
    </main>
  )
}

// ── Reveal screen ─────────────────────────────────────────────────────────────
function RevealScreen({ name, url, primaryColor, onEdit }: { name: string; url: string; primaryColor: string; onEdit: () => void }) {
  return (
    <main className="relative min-h-screen overflow-hidden" style={{ backgroundColor: FOUND_BLACK, animation: "fade-in 0.7s ease-out both" }}>
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full blur-[120px]"
        style={{ backgroundColor: `${primaryColor}1a` }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-7 py-8">
        <header className="flex items-center justify-between">
          <svg viewBox="0 0 420 72" className="h-7 w-36 text-white" aria-label="Found">
            <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
          </svg>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SIGNAL_GREEN, boxShadow: `0 0 10px ${SIGNAL_GREEN}` }} />
            <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: SIGNAL_GREEN }}>Live</span>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1fr_0.88fr]">
          <div style={{ animation: "fade-up 0.6s ease-out both" }}>
            <p className="mb-6 text-xs font-black uppercase tracking-[0.24em]" style={{ color: SIGNAL_GREEN }}>Found it.</p>
            <h1 className="text-5xl font-light leading-[1.05] text-white md:text-7xl">
              {name}<br />is live.
            </h1>
            <p className="mt-6 max-w-sm text-base leading-8 text-white/45">
              Your business now has a place online. Open it, look around, and make it yours.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href={url} target="_blank" rel="noreferrer"
                className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90"
                style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
              >
                See your site
              </a>
              <button
                type="button" onClick={onEdit}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/18 px-8 text-sm font-black uppercase tracking-widest text-white transition hover:border-white/35"
              >
                Make changes
              </button>
            </div>
            <p className="mt-5 break-all text-xs font-bold text-white/22">{url}</p>
          </div>

          <div className="flex items-center justify-center" style={{ animation: "fade-up 0.85s ease-out both" }}>
            <div
              className="relative w-[272px] rounded-[44px] border border-white/10 bg-[#141715] p-[10px]"
              style={{ height: 560, boxShadow: "0 40px 100px rgba(0,0,0,0.7)" }}
            >
              <div className="absolute left-1/2 top-[18px] h-[22px] w-[80px] -translate-x-1/2 rounded-full bg-[#0a0c0b]" />
              <div className="h-full overflow-hidden rounded-[36px] bg-[#F5F7F4]">
                <div className="relative h-52 flex flex-col justify-end p-5" style={{ backgroundColor: primaryColor }}>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/60" />
                  <div className="relative">
                    <div className="h-3 w-28 rounded-full bg-white" />
                    <div className="mt-2 h-2 w-20 rounded-full bg-white/35" />
                  </div>
                </div>
                <div className="space-y-2.5 p-5">
                  <div className="h-2 w-16 rounded-full" style={{ backgroundColor: primaryColor, opacity: 0.7 }} />
                  <div className="h-12 rounded-xl bg-black/[0.05]" />
                  <div className="h-12 rounded-xl bg-black/[0.05]" />
                  <div className="h-10 rounded-full" style={{ backgroundColor: primaryColor }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// ── Service chip input ────────────────────────────────────────────────────────
function ServiceChipInput({ value, onChange, primaryColor, industry }: {
  value: string[]; onChange: (v: string[]) => void; primaryColor: string; industry: string | null
}) {
  const [draft, setDraft] = useState("")
  const manifest = industry ? getIndustryManifest(industry) : null
  const suggestions = (manifest?.subIndustries ?? []).slice(0, 6)

  function add(text: string) {
    const t = text.trim()
    if (!t || value.includes(t)) { setDraft(""); return }
    onChange([...value, t]); setDraft("")
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft) }
    else if (e.key === "Backspace" && !draft && value.length > 0) onChange(value.slice(0, -1))
  }

  return (
    <div className="space-y-5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((chip) => (
            <span
              key={chip}
              className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.11em] text-white"
              style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}18` }}
            >
              {chip}
              <button type="button" onClick={() => onChange(value.filter((c) => c !== chip))} className="text-white/40 hover:text-white/80">×</button>
            </span>
          ))}
        </div>
      )}
      <input
        autoFocus={value.length === 0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => draft.trim() && add(draft)}
        placeholder="Type a service, press Enter"
        className="w-full border-0 border-b-2 bg-transparent px-0 py-3 text-2xl font-light text-white outline-none placeholder:text-white/20 transition-colors duration-200"
        style={{ borderBottomColor: draft ? SIGNAL_GREEN : "rgba(255,255,255,0.13)" }}
      />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.filter((s) => !value.includes(s)).map((s) => (
            <button
              key={s} type="button" onClick={() => add(s)}
              className="rounded-full border border-white/12 px-3 py-1 text-xs font-black uppercase tracking-[0.1em] text-white/38 transition hover:border-white/30 hover:text-white/70"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Location input ────────────────────────────────────────────────────────────
// TODO: Replace city <input> with Google Places Autocomplete (types: ['(cities)'])
// when NEXT_PUBLIC_GOOGLE_PLACES_KEY is available.
function LocationInput({ location, serviceAreas, onLocation, onAreas }: {
  location: string; serviceAreas: string[]
  onLocation: (v: string) => void; onAreas: (v: string[]) => void
}) {
  const [draft, setDraft] = useState("")

  function addArea(text: string) {
    const t = text.trim()
    if (!t || serviceAreas.includes(t)) { setDraft(""); return }
    onAreas([...serviceAreas, t]); setDraft("")
  }

  return (
    <div className="space-y-6">
      <input
        autoFocus
        value={location}
        onChange={(e) => onLocation(e.target.value)}
        placeholder="Tucson, AZ"
        className="w-full border-0 border-b-2 bg-transparent px-0 py-3 text-3xl font-light text-white outline-none placeholder:text-white/20 transition-colors duration-200"
        style={{ borderBottomColor: location.length > 2 ? SIGNAL_GREEN : "rgba(255,255,255,0.13)" }}
      />

      {location.length > 3 && (
        <div className="space-y-3" style={{ animation: "fade-up 0.35s ease-out both" }}>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/30">Also serve nearby?</p>
          <div className="flex flex-wrap items-center gap-2">
            {serviceAreas.map((area) => (
              <span
                key={area}
                className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-xs font-black uppercase tracking-[0.1em] text-white"
              >
                {area}
                <button type="button" onClick={() => onAreas(serviceAreas.filter((a) => a !== area))} className="text-white/40 hover:text-white">×</button>
              </span>
            ))}
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArea(draft) } }}
              onBlur={() => draft.trim() && addArea(draft)}
              placeholder="Add a city"
              className="border-0 border-b border-white/18 bg-transparent px-0 py-1 text-xs font-black uppercase tracking-[0.1em] text-white outline-none placeholder:text-white/22 focus:border-[#32D074] w-24"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Option card (for steps that auto-advance on tap) ──────────────────────────
function OptionCard({ active, primaryColor, onClick, title, body }: {
  active: boolean; primaryColor: string; onClick: () => void; title: string; body: string
}) {
  return (
    <button
      type="button" onClick={onClick}
      className="min-h-[7rem] rounded-2xl border p-5 text-left transition-all duration-150"
      style={{
        borderColor: active ? primaryColor : "rgba(255,255,255,0.09)",
        backgroundColor: active ? `${primaryColor}14` : "rgba(255,255,255,0.025)",
      }}
    >
      <span className="block text-base font-black text-white">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-white/42">{body}</span>
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OnboardingFlow() {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ url?: string; error?: string } | null>(null)

  const step    = STEPS[stepIndex]
  const ready   = canAdvance(step, answers)
  const affirm  = getAffirmation(step, answers)
  const manifest = answers.industry ? getIndustryManifest(answers.industry) : null

  const subOptions = useMemo(() => {
    if (manifest) return manifest.subIndustries
    return Object.keys(industryManifests).map((k) => industryLabels[k])
  }, [manifest])

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  function advance() {
    if (!canAdvance(step, answers)) return
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1)
    else void submit()
  }

  function autoAdvance(updater: () => void) {
    updater()
    setTimeout(() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1)), 320)
  }

  async function submit() {
    if (saving) return
    setSaving(true)
    const res = await createOnboardingSite({
      ...answers,
      services: answers.services.join(", "),
    })
    if (res.success && res.url) {
      setResult({ url: res.url })
    } else {
      setResult({ error: res.error ?? "Something went wrong." })
      setSaving(false)
    }
  }

  function handleDescription(value: string) {
    const detected = detectIndustry(value)
    setAnswers((prev) => ({
      ...prev,
      description: value,
      industry: detected ?? prev.industry,
      subIndustry: detected && detected !== prev.industry ? "" : prev.subIndustry,
    }))
  }

  // ── Screens ────────────────────────────────────────────────────────────────
  if (saving && !result) return <GeneratingScreen />
  if (result?.url) return (
    <RevealScreen
      name={answers.name.trim() || "Your business"}
      url={result.url}
      primaryColor={answers.primaryColor}
      onEdit={() => { setResult(null); setSaving(false) }}
    />
  )

  // ── Layout ─────────────────────────────────────────────────────────────────
  const isAutoStep = ["subIndustry", "vibe", "photos", "logo"].includes(step)

  return (
    <main className="min-h-screen overflow-hidden text-white" style={{ backgroundColor: FOUND_BLACK }}>
      <div className="grid min-h-screen md:grid-cols-2">

        {/* ── Left: conversation ── */}
        <div className="flex min-h-screen flex-col px-7 py-8 md:min-h-0 md:px-12 md:py-10">

          <header className="flex items-center justify-between">
            <Link href="/">
              <svg viewBox="0 0 420 72" className="h-7 w-36 text-white" aria-label="Found">
                <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
              </svg>
            </Link>
          </header>

          {/* Question */}
          <section
            key={step}
            className="flex flex-1 flex-col justify-center py-10"
            style={{ animation: "fade-up 0.38s ease-out both" }}
          >
            <div className="mb-8 max-w-lg">
              {answers.industry && !["welcome","description"].includes(step) && (
                <p className="mb-3 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
                  {industryLabels[answers.industry]}
                </p>
              )}
              <h1 className="text-3xl font-light leading-tight text-white md:text-[2.6rem]">
                {questionTitle(step, answers)}
              </h1>
              {step === "welcome" && (
                <p className="mt-4 text-base leading-8 text-white/45">
                  Answer however feels natural — like telling a friend about your business.
                </p>
              )}
              {step === "description" && (
                <p className="mt-3 text-sm text-white/35">In your own words. This is how Found understands your business.</p>
              )}
              {step === "location" && (
                <p className="mt-3 text-sm text-white/35">Your city anchors your headline, your CTA, and your SEO.</p>
              )}
              {ready && affirm && (
                <p
                  className="mt-4 text-xs font-black uppercase tracking-[0.18em]"
                  style={{ color: SIGNAL_GREEN, animation: "fade-in 0.3s ease-out both" }}
                >
                  {affirm}
                </p>
              )}
            </div>

            {/* ── Inputs ── */}

            {step === "name" && (
              <input
                autoFocus
                value={answers.name}
                onChange={(e) => set("name", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && advance()}
                placeholder="e.g. Barrio Builders"
                className="w-full border-0 border-b-2 bg-transparent px-0 py-3 text-4xl font-light text-white outline-none placeholder:text-white/18 transition-colors duration-200"
                style={{ borderBottomColor: answers.name ? SIGNAL_GREEN : "rgba(255,255,255,0.13)" }}
              />
            )}

            {step === "description" && (
              <textarea
                autoFocus
                value={answers.description}
                onChange={(e) => handleDescription(e.target.value)}
                placeholder="I do roofing and remodeling in Tucson... I'm a balloon artist for parties and events... I run a smoothie shop..."
                rows={4}
                className="w-full resize-none border-0 border-b-2 bg-transparent px-0 py-3 text-2xl font-light leading-relaxed text-white outline-none placeholder:text-white/18 transition-colors duration-200"
                style={{ borderBottomColor: answers.description.length > 8 ? SIGNAL_GREEN : "rgba(255,255,255,0.13)" }}
              />
            )}

            {step === "subIndustry" && (
              <div className="space-y-4">
                {manifest && (
                  <button
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, industry: null, subIndustry: "" }))}
                    className="text-xs font-black uppercase tracking-[0.14em] text-white/30 underline decoration-[#32D074] underline-offset-4 hover:text-white/55"
                  >
                    Not {manifest.label}? Change it
                  </button>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {subOptions.map((option) => {
                    const active = answers.subIndustry === option || (!manifest && industryLabels[answers.industry ?? ""] === option)
                    return (
                      <button
                        key={option} type="button"
                        onClick={() => autoAdvance(() => {
                          if (!manifest) {
                            const k = Object.entries(industryLabels).find(([, l]) => l === option)?.[0] ?? null
                            setAnswers((prev) => ({ ...prev, industry: k, subIndustry: "" }))
                          } else {
                            set("subIndustry", option)
                          }
                        })}
                        className="min-h-[3.25rem] rounded-xl border px-4 py-3 text-left text-sm font-black uppercase tracking-[0.1em] transition-all duration-150"
                        style={{
                          borderColor: active ? SIGNAL_GREEN : "rgba(255,255,255,0.09)",
                          backgroundColor: active ? `${SIGNAL_GREEN}14` : "rgba(255,255,255,0.025)",
                          color: active ? "#fff" : "rgba(255,255,255,0.55)",
                        }}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === "location" && (
              <LocationInput
                location={answers.location}
                serviceAreas={answers.serviceAreas}
                onLocation={(v) => set("location", v)}
                onAreas={(v) => set("serviceAreas", v)}
              />
            )}

            {step === "contact" && (
              <div className="space-y-6">
                <input
                  autoFocus type="tel"
                  value={answers.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="Phone number"
                  className="w-full border-0 border-b-2 bg-transparent px-0 py-3 text-3xl font-light text-white outline-none placeholder:text-white/18 transition-colors duration-200"
                  style={{ borderBottomColor: answers.phone.length > 6 ? SIGNAL_GREEN : "rgba(255,255,255,0.13)" }}
                />
                <input
                  type="email"
                  value={answers.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="Email address"
                  className="w-full border-0 border-b-2 bg-transparent px-0 py-3 text-2xl font-light text-white outline-none placeholder:text-white/18 transition-colors duration-200"
                  style={{ borderBottomColor: answers.email.includes("@") ? SIGNAL_GREEN : "rgba(255,255,255,0.13)" }}
                />
                <p className="text-xs text-white/25">Not shown publicly. Leads from your site go here.</p>
              </div>
            )}

            {step === "different" && (
              <div className="space-y-5">
                <textarea
                  autoFocus
                  value={answers.different}
                  onChange={(e) => set("different", e.target.value)}
                  placeholder="We've been in Tucson for 20 years and treat every home like our own..."
                  rows={4}
                  className="w-full resize-none border-0 border-b-2 bg-transparent px-0 py-3 text-2xl font-light leading-relaxed text-white outline-none placeholder:text-white/18 transition-colors duration-200"
                  style={{ borderBottomColor: answers.different.length > 8 ? SIGNAL_GREEN : "rgba(255,255,255,0.13)" }}
                />
                {answers.industry && DIFFERENTIATOR_CHIPS[answers.industry] && (
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/25">Quick adds</p>
                    <div className="flex flex-wrap gap-2">
                      {DIFFERENTIATOR_CHIPS[answers.industry].map((chip) => (
                        <button
                          key={chip} type="button"
                          onClick={() => set("different", answers.different ? `${answers.different}, ${chip}` : chip)}
                          className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-white/38 transition hover:border-white/28 hover:text-white/68"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === "services" && (
              <ServiceChipInput
                value={answers.services}
                onChange={(v) => set("services", v)}
                primaryColor={answers.primaryColor}
                industry={answers.industry}
              />
            )}

            {step === "photos" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <OptionCard active={answers.photoChoice === "stock"} primaryColor={answers.primaryColor}
                  onClick={() => autoAdvance(() => set("photoChoice", "stock"))}
                  title="Skip for now"
                  body="We'll pull great photos for your industry automatically."
                />
                <OptionCard active={answers.photoChoice === "upload_later"} primaryColor={answers.primaryColor}
                  onClick={() => autoAdvance(() => set("photoChoice", "upload_later"))}
                  title="Add photos later"
                  body="Launch now. Drop in real work photos when you're ready."
                />
              </div>
            )}

            {step === "logo" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <OptionCard active={answers.logoChoice === "brandmark"} primaryColor={answers.primaryColor}
                  onClick={() => autoAdvance(() => set("logoChoice", "brandmark"))}
                  title="Not yet — that's okay"
                  body="Found turns your business name into a clean professional wordmark."
                />
                <OptionCard active={answers.logoChoice === "upload_later"} primaryColor={answers.primaryColor}
                  onClick={() => autoAdvance(() => set("logoChoice", "upload_later"))}
                  title="I have a logo"
                  body="Upload coming soon. We'll launch with a wordmark and swap it in."
                />
              </div>
            )}

            {step === "color" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {palettes.map((p) => {
                  const active = answers.primaryColor.toLowerCase() === p.hex.toLowerCase()
                  return (
                    <button
                      key={p.hex} type="button"
                      onClick={() => set("primaryColor", p.hex)}
                      className="flex min-h-[4rem] items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all duration-150"
                      style={{
                        borderColor: active ? p.hex : "rgba(255,255,255,0.08)",
                        backgroundColor: active ? `${p.hex}18` : "rgba(255,255,255,0.025)",
                      }}
                    >
                      <span className="h-8 w-8 shrink-0 rounded-full" style={{ backgroundColor: p.hex }} />
                      <span>
                        <span className="block text-sm font-black text-white">{p.name}</span>
                        <span className="block text-xs text-white/38">{p.feel}</span>
                      </span>
                    </button>
                  )
                })}
                <label className="flex min-h-[4rem] cursor-pointer items-center gap-4 rounded-xl border border-white/08 bg-white/[0.025] px-4 py-3 transition hover:border-white/18">
                  <span className="h-8 w-8 shrink-0 rounded-full border border-white/18" style={{ backgroundColor: answers.primaryColor }} />
                  <span className="flex-1">
                    <span className="block text-sm font-black text-white">Custom</span>
                    <input
                      value={answers.primaryColor}
                      onChange={(e) => set("primaryColor", e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 w-full bg-transparent text-xs font-black uppercase text-white/38 outline-none"
                      placeholder="#2E7D32"
                    />
                  </span>
                </label>
              </div>
            )}

            {step === "vibe" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { key: "bold",   label: "Bold",   desc: "Strong and confident",    radius: "8px"  },
                  { key: "calm",   label: "Calm",   desc: "Soft and elevated",        radius: "22px" },
                  { key: "modern", label: "Modern", desc: "Clean and sharp",          radius: "4px"  },
                  { key: "warm",   label: "Warm",   desc: "Friendly and approachable",radius: "18px" },
                ].map((o) => {
                  const active = answers.vibe === o.key
                  return (
                    <button
                      key={o.key} type="button"
                      onClick={() => autoAdvance(() => set("vibe", o.key))}
                      className="min-h-[7rem] border p-5 text-left transition-all duration-150"
                      style={{
                        borderRadius: o.radius,
                        borderColor: active ? answers.primaryColor : "rgba(255,255,255,0.09)",
                        backgroundColor: active ? `${answers.primaryColor}14` : "rgba(255,255,255,0.025)",
                      }}
                    >
                      <div className="mb-3 h-0.5 w-10" style={{ backgroundColor: answers.primaryColor }} />
                      <span className="block text-base font-black text-white">{o.label}</span>
                      <span className="mt-1 block text-xs text-white/40">{o.desc}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {step === "testimonials" && (
              <div className="space-y-4">
                <textarea
                  autoFocus
                  value={answers.testimonials}
                  onChange={(e) => set("testimonials", e.target.value)}
                  placeholder={"Maria — She made everything simple and stress-free.\nDaniel — Best contractor I've ever hired."}
                  rows={5}
                  className="w-full resize-none border-0 border-b-2 bg-transparent px-0 py-3 text-xl font-light leading-relaxed text-white outline-none placeholder:text-white/18"
                  style={{ borderBottomColor: "rgba(255,255,255,0.13)" }}
                />
                <p className="text-xs text-white/25">Optional. Each line is one review. Your site looks great without these too.</p>
              </div>
            )}

            {result?.error && (
              <p className="mt-5 text-sm font-bold text-red-400">{result.error}</p>
            )}
          </section>

          {/* CTA — hidden on auto-advance steps */}
          {!isAutoStep && (
            <footer className="pb-2">
              <button
                type="button" onClick={advance}
                disabled={!ready}
                className="w-full rounded-full py-5 text-sm font-black uppercase tracking-widest transition disabled:cursor-not-allowed disabled:opacity-22 sm:w-auto sm:px-10"
                style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
              >
                {step === "welcome" ? "Let's go" : step === "testimonials" ? "Build my site" : "Continue"}
              </button>
            </footer>
          )}
        </div>

        {/* ── Right: live preview (desktop only) ── */}
        <div
          className="hidden md:flex flex-col"
          style={{ backgroundColor: "#050705", borderLeft: "1px solid rgba(255,255,255,0.045)" }}
        >
          <LivePreview answers={answers} />
        </div>

      </div>
    </main>
  )
}
