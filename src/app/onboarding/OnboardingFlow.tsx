"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import Link from "next/link"
import { detectIndustry, industryLabels } from "@/lib/industryDetection"
import { getIndustryManifest, industryManifests } from "@/lib/industryManifests"
import { palettes } from "@/lib/palettes"
import { createOnboardingSite, saveAbandonedLead } from "./actions"
import { uploadLogoFile, uploadHeroFile } from "./uploadActions"
import { US_CITIES } from "@/data/us-cities"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"
const LIGHT_BG = "#FAFAF9"

type Phase = "welcome" | "questions"

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
  phoneVisible: boolean
  emailVisible: boolean
  separateLeads: boolean
  leadPhone: string
  leadEmail: string
  different: string
  services: string[]
  photoChoice: string
  logoChoice: string
  logoUrl: string
  heroImageUrl: string
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
  phoneVisible: true, emailVisible: true, separateLeads: false, leadPhone: "", leadEmail: "",
  different: "", services: [], photoChoice: "", logoChoice: "",
  logoUrl: "", heroImageUrl: "",
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
  real_estate:        ["Local market expert", "First-time buyer specialist", "Military relocation", "Investment properties"],
  creative_services:     ["10+ years experience", "Bilingual", "Rush turnaround available", "Revisions included", "Award winning"],
  home_based_food:       ["Family recipe", "Made to order", "Gluten-free options", "Locally sourced", "Cottage licensed"],
  education:             ["Free first session", "Bilingual", "Online available", "All ages welcome", "Results guaranteed"],
  music_performance:     ["Available weekends", "All genres", "Sound system included", "Bilingual", "Family-friendly sets"],
  professional_services: ["Free consultation", "Bilingual", "Virtual meetings available", "20+ years experience", "Flat-fee options"],
  healthcare:            ["New patients welcome", "Bilingual", "Telehealth available", "Same-week appointments", "Most insurance accepted"],
  childcare:             ["Licensed & certified", "CPR certified", "Bilingual staff", "Small group sizes", "Open early & late"],
  makers_crafts:         ["Custom orders welcome", "Ships nationwide", "Bilingual", "Wholesale available", "Made to order"],
  home_property:         ["Licensed & insured", "Free estimates", "Same-week service", "Bilingual", "Satisfaction guaranteed"],
  nonprofit:             ["501(c)3 certified", "Volunteer-run", "Bilingual programs", "Free to community", "Accepting donations"],
}

const GENERATING_LINES = ["Building your site.", "Writing your story.", "Almost ready."]

// Resizes a photo client-side and returns a JPEG Blob.
// Handles HEIC on iOS (Safari can decode HEIC natively into a canvas).
// Reduces iPhone photos from 10+ MB to < 1 MB before the server action upload.
function resizeImageToJpeg(file: File, maxPx = 2400, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement("canvas")
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("Canvas unavailable")); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
        "image/jpeg", quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")) }
    img.src = url
  })
}

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
    case "contact":      return "What's your business phone and email?"
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
    case "name":
      return a.name.trim() ? `${a.name.trim()}. That's the one.` : ""
    case "description":
      return a.industry
        ? `${industryLabels[a.industry]}. We know how to build this.`
        : a.description.trim().length > 8 ? "Got it." : ""
    case "location":
      return a.location.trim() ? `${a.location.trim()} — that's your market. It goes everywhere.` : ""
    case "contact":
      return a.phone && a.email.includes("@") ? "Every button on your site goes here." : ""
    case "different":
      return a.different.trim().length > 8 ? "That's your edge. It'll be front and center." : ""
    case "services":
      return a.services.length > 0
        ? `${a.services.length} ${a.services.length === 1 ? "service" : "services"} — that's your homepage lineup.`
        : ""
    case "photos":
      return a.photoChoice === "uploaded" ? "That's your hero. First thing people see." : ""
    case "logo":
      return a.logoChoice === "uploaded" && a.logoUrl ? "Logo's in. It'll show at the top of every page." : ""
    case "color":
      return /^#[0-9a-f]{6}$/i.test(a.primaryColor) ? "That color goes on every button and accent across your site." : ""
    case "testimonials":
      return a.testimonials.trim().length > 8 ? "Those go straight on your homepage." : ""
    default:
      return ""
  }
}

// ── Color tokens ──────────────────────────────────────────────────────────────
function getTokens(isLight: boolean, primaryColor: string) {
  return {
    text:        isLight ? FOUND_BLACK          : "#ffffff",
    muted:       isLight ? "rgba(8,10,9,0.65)"  : "rgba(255,255,255,0.45)",
    hint:        isLight ? "rgba(8,10,9,0.65)"  : "rgba(255,255,255,0.35)",
    border:      (active: boolean) => active ? SIGNAL_GREEN : (isLight ? "rgba(8,10,9,0.15)" : "rgba(255,255,255,0.13)"),
    cardBg:      (active: boolean) => active ? `${primaryColor}14` : (isLight ? "rgba(8,10,9,0.03)" : "rgba(255,255,255,0.025)"),
    cardBorder:  (active: boolean, accent?: string) => active ? (accent ?? primaryColor) : (isLight ? "rgba(8,10,9,0.10)" : "rgba(255,255,255,0.09)"),
    chipBorder:  (active: boolean) => active ? primaryColor : (isLight ? "rgba(8,10,9,0.14)" : "rgba(255,255,255,0.12)"),
    placeholder: isLight ? "placeholder:text-[#757575]" : "placeholder:text-white/18",
    inputCls:    isLight
      ? "border-0 border-b-2 bg-transparent px-0 py-3 font-light outline-none transition-colors duration-200"
      : "border-0 border-b-2 bg-transparent px-0 py-3 font-light outline-none transition-colors duration-200",
  }
}

// ── Save Spot dialog ──────────────────────────────────────────────────────────
function SaveSpotDialog({
  businessName,
  form,
  onChange,
  onSave,
  onDismiss,
  saving,
}: {
  businessName: string
  form: { firstName: string; email: string }
  onChange: (v: { firstName: string; email: string }) => void
  onSave: () => void
  onDismiss: () => void
  saving: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(8,10,9,0.78)" }}
    >
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white px-8 pt-8 pb-10">
        <h2 className="text-2xl font-light" style={{ color: FOUND_BLACK }}>
          Want us to save your spot?
        </h2>
        <p className="mt-2 text-sm leading-6" style={{ color: "rgba(8,10,9,0.55)" }}>
          {businessName
            ? `${businessName} is waiting. Drop your email and we'll hold your place.`
            : "Drop your email and we'll hold your place."}
        </p>
        <div className="mt-6 space-y-5">
          <input
            autoFocus
            value={form.firstName}
            onChange={(e) => onChange({ ...form, firstName: e.target.value })}
            placeholder="Your first name"
            className="w-full border-b-2 bg-transparent pb-2 text-xl font-light outline-none placeholder:text-[#757575]"
            style={{ color: FOUND_BLACK, borderBottomColor: form.firstName ? SIGNAL_GREEN : "rgba(8,10,9,0.15)" }}
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && onSave()}
            placeholder="Your email"
            className="w-full border-b-2 bg-transparent pb-2 text-xl font-light outline-none placeholder:text-[#757575]"
            style={{ color: FOUND_BLACK, borderBottomColor: form.email.includes("@") ? SIGNAL_GREEN : "rgba(8,10,9,0.15)" }}
          />
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!form.email.includes("@") || saving}
          className="mt-7 w-full rounded-full py-4 text-sm font-black uppercase tracking-widest disabled:opacity-40"
          style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK, boxShadow: "0 0 24px rgba(50,208,116,0.28)" }}
        >
          {saving ? "Saving…" : "Save my spot →"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 w-full py-2 text-xs font-black uppercase tracking-[0.14em]"
          style={{ color: "rgba(8,10,9,0.38)" }}
        >
          No thanks
        </button>
      </div>
    </div>
  )
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
        <div className="absolute left-1/2 top-[17px] h-5 w-[72px] -translate-x-1/2 rounded-full bg-[#0a0c0b]" />
        <div className="h-full overflow-hidden rounded-[35px] bg-white">
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
          <div className="space-y-2 p-4">
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
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SIGNAL_GREEN, boxShadow: `0 0 8px ${SIGNAL_GREEN}80` }} />
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
      <p key={idx} className="text-xl font-light tracking-wide text-white/75" style={{ animation: "fade-up 0.5s ease-out both" }}>
        {GENERATING_LINES[idx]}
      </p>
    </main>
  )
}

// ── Reveal screen ─────────────────────────────────────────────────────────────
function RevealScreen({ name, url, primaryColor, onEdit }: { name: string; url: string; primaryColor: string; onEdit: () => void }) {
  const [iframeReady, setIframeReady] = useState(false)

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ backgroundColor: FOUND_BLACK, animation: "fade-in 0.7s ease-out both" }}>
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full blur-[120px]" style={{ backgroundColor: `${primaryColor}1a` }} />
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
            <h1 className="text-5xl font-light leading-[1.05] text-white md:text-7xl">{name}<br />is live.</h1>
            <p className="mt-6 max-w-sm text-base leading-8 text-white/45">Your business now has a place online. Open it, look around, and make it yours.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={url} target="_blank" rel="noreferrer"
                className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90"
                style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}>
                See your site
              </a>
              <button type="button" onClick={onEdit}
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/18 px-8 text-sm font-black uppercase tracking-widest text-white transition hover:border-white/35">
                Make changes
              </button>
            </div>
            <p className="mt-5 break-all text-xs font-bold text-white/22">{url}</p>
          </div>

          {/* Phone mockup with live site preview */}
          <div className="flex items-center justify-center" style={{ animation: "fade-up 0.85s ease-out both" }}>
            <div className="relative w-[272px] rounded-[44px] border border-white/10 bg-[#141715] p-[10px]" style={{ height: 560, boxShadow: "0 40px 100px rgba(0,0,0,0.7)" }}>
              <div className="absolute left-1/2 top-[18px] h-[22px] w-[80px] -translate-x-1/2 rounded-full bg-[#0a0c0b]" />

              {/* Screen area */}
              <div className="relative h-full overflow-hidden rounded-[36px] bg-[#F5F7F4]">

                {/* Placeholder skeleton — fades out when iframe loads */}
                <div
                  className="absolute inset-0 transition-opacity duration-700"
                  style={{ opacity: iframeReady ? 0 : 1, pointerEvents: "none" }}
                >
                  <div className="relative flex h-52 flex-col justify-end p-5" style={{ backgroundColor: primaryColor }}>
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

                {/* Live site iframe — fades in when loaded */}
                <iframe
                  src={url}
                  title={`${name} website preview`}
                  className="absolute inset-0 h-full w-full border-0 transition-opacity duration-700"
                  style={{ opacity: iframeReady ? 1 : 0, pointerEvents: "none" }}
                  onLoad={() => setIframeReady(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

// ── Service chip input ────────────────────────────────────────────────────────
function ServiceChipInput({ value, onChange, isLight, primaryColor, industry }: {
  value: string[]; onChange: (v: string[]) => void; isLight: boolean; primaryColor: string; industry: string | null
}) {
  const [draft, setDraft] = useState("")
  const tk = getTokens(isLight, primaryColor)
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
            <span key={chip} className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.11em]"
              style={{ borderColor: tk.chipBorder(true), backgroundColor: `${primaryColor}18`, color: tk.text }}>
              {chip}
              <button type="button" onClick={() => onChange(value.filter((c) => c !== chip))} style={{ color: tk.muted }}>×</button>
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
        className={`w-full text-[2rem] ${tk.inputCls} ${tk.placeholder}`}
        style={{ color: tk.text, borderBottomColor: draft ? SIGNAL_GREEN : tk.border(false) }}
      />
      {isLight && (
        <p className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: "rgba(8,10,9,0.5)" }}>
          Press Enter to add each service
        </p>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.filter((s) => !value.includes(s)).map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.1em] transition"
              style={{ borderColor: tk.chipBorder(false), color: tk.muted }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Location input ────────────────────────────────────────────────────────────
function LocationInput({ location, serviceAreas, onLocation, onAreas, isLight, primaryColor }: {
  location: string; serviceAreas: string[]
  onLocation: (v: string) => void; onAreas: (v: string[]) => void
  isLight: boolean; primaryColor: string
}) {
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [areaDraft, setAreaDraft] = useState("")
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false)
  const cityBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const areaBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tk = getTokens(isLight, primaryColor)

  const dropdownBg    = isLight ? "#ffffff" : "#1a1c1b"
  const dropdownBorder = isLight ? "rgba(8,10,9,0.1)" : "rgba(255,255,255,0.1)"

  const citySuggestions = useMemo(() => {
    if (location.length < 1) return []
    const q = location.toLowerCase()
    return US_CITIES.filter(([city, state]) => {
      const full = `${city}, ${state}`.toLowerCase()
      return city.toLowerCase().startsWith(q) || full.startsWith(q)
    }).slice(0, 6)
  }, [location])

  const areaSuggestions = useMemo(() => {
    if (areaDraft.length < 1) return []
    const q = areaDraft.toLowerCase()
    return US_CITIES.filter(([city, state]) => {
      const formatted = `${city}, ${state}`
      return (
        city.toLowerCase().startsWith(q) &&
        formatted !== location &&
        !serviceAreas.includes(formatted)
      )
    }).slice(0, 5)
  }, [areaDraft, location, serviceAreas])

  function selectCity(city: string, state: string) {
    onLocation(`${city}, ${state}`)
    setShowCitySuggestions(false)
  }

  function addArea(city: string, state: string) {
    const formatted = `${city}, ${state}`
    if (!serviceAreas.includes(formatted)) onAreas([...serviceAreas, formatted])
    setAreaDraft("")
    setShowAreaSuggestions(false)
  }

  function addAreaFromDraft() {
    const t = areaDraft.trim()
    if (t && !serviceAreas.includes(t)) onAreas([...serviceAreas, t])
    setAreaDraft("")
  }

  return (
    <div className="space-y-6">
      {/* City autocomplete */}
      <div className="relative">
        <input
          autoFocus
          value={location}
          onChange={(e) => { onLocation(e.target.value); setShowCitySuggestions(true) }}
          onFocus={() => setShowCitySuggestions(true)}
          onBlur={() => { cityBlurTimer.current = setTimeout(() => setShowCitySuggestions(false), 150) }}
          placeholder="Tucson, AZ"
          className={`w-full text-[2rem] ${tk.inputCls} ${tk.placeholder}`}
          style={{ color: tk.text, borderBottomColor: location.length > 2 ? SIGNAL_GREEN : tk.border(false) }}
        />
        {showCitySuggestions && citySuggestions.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl shadow-xl"
            style={{ backgroundColor: dropdownBg, border: `1px solid ${dropdownBorder}` }}
          >
            {citySuggestions.map(([city, state]) => (
              <button
                key={`${city}-${state}`}
                type="button"
                onMouseDown={() => {
                  if (cityBlurTimer.current) clearTimeout(cityBlurTimer.current)
                  selectCity(city, state)
                }}
                className="block w-full px-4 py-3 text-left text-sm font-black uppercase tracking-[0.08em] transition hover:opacity-60"
                style={{ color: tk.text }}
              >
                {city}, {state}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Service area chips */}
      {location.length > 3 && (
        <div className="space-y-3" style={{ animation: "fade-up 0.35s ease-out both" }}>
          <p className="text-sm font-black uppercase tracking-[0.14em]" style={{ color: tk.hint }}>Also serve nearby?</p>
          <div className="flex flex-wrap items-center gap-2">
            {serviceAreas.map((area) => (
              <span
                key={area}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.1em]"
                style={{ borderColor: tk.cardBorder(false), color: tk.text, backgroundColor: tk.cardBg(false) }}
              >
                {area}
                <button type="button" onClick={() => onAreas(serviceAreas.filter((a) => a !== area))} style={{ color: tk.hint }}>×</button>
              </span>
            ))}
            {/* Area city autocomplete */}
            <div className="relative">
              <input
                value={areaDraft}
                onChange={(e) => { setAreaDraft(e.target.value); setShowAreaSuggestions(true) }}
                onFocus={() => setShowAreaSuggestions(true)}
                onBlur={() => { areaBlurTimer.current = setTimeout(() => setShowAreaSuggestions(false), 150) }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addAreaFromDraft() }
                }}
                placeholder="Add a city"
                className={`w-28 border-0 border-b bg-transparent px-0 py-1 text-sm font-semibold outline-none focus:border-[#32D074] ${tk.placeholder}`}
                style={{ color: tk.text, borderBottomColor: tk.border(false) }}
              />
              {showAreaSuggestions && areaSuggestions.length > 0 && (
                <div
                  className="absolute left-0 top-full z-20 mt-1 overflow-hidden rounded-lg shadow-xl"
                  style={{ backgroundColor: dropdownBg, border: `1px solid ${dropdownBorder}`, minWidth: "180px" }}
                >
                  {areaSuggestions.map(([city, state]) => (
                    <button
                      key={`area-${city}-${state}`}
                      type="button"
                      onMouseDown={() => {
                        if (areaBlurTimer.current) clearTimeout(areaBlurTimer.current)
                        addArea(city, state)
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-black uppercase tracking-[0.08em] transition hover:opacity-60"
                      style={{ color: tk.text }}
                    >
                      {city}, {state}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Option card ───────────────────────────────────────────────────────────────
function OptionCard({ active, isLight, primaryColor, onClick, title, body }: {
  active: boolean; isLight: boolean; primaryColor: string; onClick: () => void; title: string; body: string
}) {
  const tk = getTokens(isLight, primaryColor)
  return (
    <button type="button" onClick={onClick}
      className="min-h-[7rem] rounded-2xl border p-5 text-left transition-all duration-150"
      style={{ borderColor: tk.cardBorder(active), backgroundColor: tk.cardBg(active) }}>
      <span className="block text-base font-black" style={{ color: tk.text }}>{title}</span>
      <span className="mt-2 block text-sm leading-6" style={{ color: tk.muted }}>{body}</span>
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OnboardingFlow({ onClose, drawerMode }: { onClose?: () => void; drawerMode?: boolean }) {
  const [phase, setPhase]           = useState<Phase>("welcome")
  const [stepIndex, setStepIndex]   = useState(0)
  const [answers, setAnswers]       = useState<Answers>(INITIAL)
  const [saving, setSaving]         = useState(false)
  const [result, setResult]         = useState<{ url?: string; error?: string } | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveLeadForm, setSaveLeadForm]     = useState({ firstName: "", email: "" })
  const [savingLead, setSavingLead]         = useState(false)

  // Pre-generate the company ID so logo/hero uploads go to the permanent path
  const sessionId = useMemo(() => crypto.randomUUID(), [])

  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError]         = useState<string | null>(null)
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroError, setHeroError]         = useState<string | null>(null)

  const step    = STEPS[stepIndex]
  const ready   = canAdvance(step, answers)
  const affirm  = getAffirmation(step, answers)
  const isLight = phase === "questions"
  const tk      = getTokens(isLight, answers.primaryColor)
  const manifest = answers.industry ? getIndustryManifest(answers.industry) : null

  const subOptions = useMemo(() => {
    if (manifest) return manifest.subIndustries
    return Object.keys(industryManifests).map((k) => industryLabels[k])
  }, [manifest])

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  function advance() {
    if (step === "welcome") {
      setPhase("questions")
      setStepIndex(1)
      return
    }
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
    const uiTimeout = new Promise<{ success: false; error: string }>((resolve) =>
      setTimeout(() => resolve({ success: false, error: "This is taking longer than expected. Please try again." }), 25000)
    )
    const res = await Promise.race([
      createOnboardingSite({
        ...answers,
        services: answers.services.join(", "),
        companyId: sessionId,
        logoUrl: answers.logoUrl || undefined,
        heroImageUrl: answers.heroImageUrl || undefined,
      }),
      uiTimeout,
    ])
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setLogoError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await uploadLogoFile(fd, sessionId)
      if (res.success && res.url) {
        set("logoUrl", res.url)
        set("logoChoice", "uploaded")
        if (res.dominantColor) set("primaryColor", res.dominantColor)
      } else {
        setLogoError(res.error ?? "Upload failed — please try again.")
      }
    } catch {
      setLogoError("Upload failed — please try again.")
    } finally {
      setLogoUploading(false)
      e.target.value = ""
    }
  }

  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setHeroUploading(true)
    setHeroError(null)
    try {
      // Resize client-side: converts HEIC/PNG/any format → JPEG, reduces large iPhone
      // photos (3–15 MB) to a manageable size before hitting the server action.
      const resized = await resizeImageToJpeg(file, 2400, 0.85)
      const fd = new FormData()
      fd.append("file", new File([resized], "hero.jpg", { type: "image/jpeg" }))
      const res = await uploadHeroFile(fd, sessionId)
      if (res.success && res.url) {
        set("heroImageUrl", res.url)
        set("photoChoice", "uploaded")
      } else {
        setHeroError(res.error ?? "Upload failed — please try again.")
      }
    } catch {
      setHeroError("Upload failed — please try again.")
    } finally {
      setHeroUploading(false)
      e.target.value = ""
    }
  }

  function requestClose() {
    if (stepIndex === 0) {
      onClose?.()
      return
    }
    if (answers.email.includes("@")) {
      // Already have email — auto-save and close silently
      void saveAbandonedLead({
        firstName: answers.name.split(" ")[0] ?? "",
        email: answers.email,
        businessName: answers.name || undefined,
        stepAbandoned: step,
        partialAnswers: { name: answers.name, description: answers.description, industry: answers.industry, location: answers.location, stepIndex },
      }).then(() => onClose?.())
      return
    }
    setShowSaveDialog(true)
  }

  async function handleSaveLead() {
    if (!saveLeadForm.email.includes("@")) return
    setSavingLead(true)
    await saveAbandonedLead({
      firstName: saveLeadForm.firstName,
      email: saveLeadForm.email,
      businessName: answers.name || undefined,
      stepAbandoned: step,
      partialAnswers: { name: answers.name, description: answers.description, industry: answers.industry, location: answers.location, phone: answers.phone, stepIndex },
    })
    setSavingLead(false)
    setShowSaveDialog(false)
    onClose?.()
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

  const isAutoStep =
    step === "subIndustry" ||
    step === "vibe" ||
    (step === "photos" && answers.photoChoice !== "uploaded") ||
    (step === "logo" && answers.logoChoice !== "uploaded")

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <>
      {showSaveDialog && (
        <SaveSpotDialog
          businessName={answers.name}
          form={saveLeadForm}
          onChange={setSaveLeadForm}
          onSave={handleSaveLead}
          onDismiss={() => { setShowSaveDialog(false); onClose?.() }}
          saving={savingLead}
        />
      )}

      <main className={`relative overflow-hidden ${drawerMode ? "h-full" : "min-h-screen"}`}>
        <div className={`grid md:grid-cols-2 ${drawerMode ? "h-full" : "min-h-screen"}`}>

          {/* ── Left: conversation ── */}
          <div className="relative flex flex-col overflow-hidden" style={{ backgroundColor: FOUND_BLACK, height: drawerMode ? "100%" : "100dvh" }}>

            {/* White phase panel — sweeps up from below when questions begin */}
            {phase === "questions" && (
              <div
                key="light-panel"
                className="absolute inset-0 z-0"
                style={{ backgroundColor: LIGHT_BG, animation: "sweep-up 300ms cubic-bezier(0.32,0.72,0,1) both" }}
              />
            )}

            {/* Content layer */}
            <div className="relative z-10 flex h-full flex-col">

              <header
                className="shrink-0 flex items-center justify-between px-7 pt-8 pb-2 md:px-12 md:pt-10"
                style={onClose ? { paddingTop: "max(2rem, env(safe-area-inset-top))" } : undefined}
              >
                {onClose ? (
                  <svg viewBox="0 0 420 72" className="h-7 w-36" aria-label="Found" style={{ color: tk.text }}>
                    <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
                  </svg>
                ) : (
                  <Link href="/">
                    <svg viewBox="0 0 420 72" className="h-7 w-36 text-white" aria-label="Found">
                      <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
                    </svg>
                  </Link>
                )}
                {onClose && (
                  <button
                    type="button"
                    onClick={requestClose}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/10"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" style={{ color: tk.text }}>
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </header>

              {/* Scrollable body — lets content scroll on short viewports / keyboard-open */}
              <div className="flex-1 overflow-y-auto px-7 md:px-12">

              {/* ── Welcome (dark) ── */}
              {phase === "welcome" && (
                <section key="welcome" className="relative flex min-h-full flex-col justify-center py-10">
                  {/* Ambient Signal Green glow */}
                  <div
                    className="pointer-events-none absolute bottom-0 -left-7 -right-7 md:-left-12 md:-right-12 h-2/3"
                    style={{ background: "radial-gradient(ellipse 100% 70% at 50% 100%, rgba(50,208,116,0.16) 0%, transparent 70%)" }}
                  />
                  <div className="relative mb-10 max-w-lg">
                    <h1
                      className="text-4xl font-light leading-tight text-white md:text-[2.8rem]"
                      style={{ animation: "fade-up 0.45s ease-out both" }}
                    >
                      Let's build your website.
                    </h1>
                    <p
                      className="mt-4 text-base leading-8 text-white/60"
                      style={{ animation: "fade-up 0.45s 0.12s ease-out both" }}
                    >
                      Answer a few questions. We'll do the rest.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={advance}
                    className="relative w-full rounded-full py-5 text-sm font-black uppercase tracking-widest sm:w-auto sm:px-12 md:py-6"
                    style={{
                      backgroundColor: SIGNAL_GREEN,
                      color: FOUND_BLACK,
                      boxShadow: "0 0 40px rgba(50,208,116,0.38)",
                      animation: "fade-up 0.45s 0.24s ease-out both",
                    }}
                  >
                    Let's go →
                  </button>
                </section>
              )}

              {/* ── Questions (light) ── */}
              {phase === "questions" && (
                <section
                  key={step}
                  className="flex min-h-full flex-col justify-center py-8"
                  style={{ animation: "fade-up 0.38s ease-out both" }}
                >
                    <div className="mb-8 max-w-lg">
                      {answers.industry && !["description"].includes(step) && (
                        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
                          {industryLabels[answers.industry]}
                        </p>
                      )}
                      <h1 className="text-3xl font-light leading-tight md:text-[2.6rem]" style={{ color: tk.text }}>
                        {questionTitle(step, answers)}
                      </h1>
                      {step === "description" && (
                        <p className="mt-3 text-[1rem]" style={{ color: tk.hint }}>In your own words. This is how Found understands your business.</p>
                      )}
                      {step === "location" && (
                        <p className="mt-3 text-[1rem]" style={{ color: tk.hint }}>Your city anchors your headline, your CTA, and your SEO.</p>
                      )}
                      {step === "contact" && (
                        <p className="mt-3 text-[1rem]" style={{ color: tk.hint }}>You control what shows publicly — each field has a toggle below it.</p>
                      )}
                      {ready && affirm && (
                        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em]"
                          style={{ color: SIGNAL_GREEN, animation: "fade-in 0.3s ease-out both" }}>
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
                        className={`w-full text-4xl ${tk.inputCls} ${tk.placeholder}`}
                        style={{ color: tk.text, borderBottomColor: answers.name ? SIGNAL_GREEN : tk.border(false) }}
                      />
                    )}

                    {step === "description" && (
                      <textarea
                        autoFocus
                        value={answers.description}
                        onChange={(e) => handleDescription(e.target.value)}
                        placeholder="I do roofing and remodeling in Tucson... I'm a balloon artist for parties and events..."
                        rows={4}
                        className={`w-full resize-none text-[2rem] leading-relaxed ${tk.inputCls} ${tk.placeholder}`}
                        style={{ color: tk.text, borderBottomColor: answers.description.length > 8 ? SIGNAL_GREEN : tk.border(false) }}
                      />
                    )}

                    {step === "subIndustry" && (
                      <div className="space-y-4">
                        {manifest && (
                          <button type="button"
                            onClick={() => setAnswers((prev) => ({ ...prev, industry: null, subIndustry: "" }))}
                            className="text-xs font-black uppercase tracking-[0.14em] underline decoration-[#32D074] underline-offset-4"
                            style={{ color: tk.muted }}>
                            Not {manifest.label}? Change it
                          </button>
                        )}
                        <div className="grid gap-2 sm:grid-cols-2">
                          {subOptions.map((option) => {
                            const active = answers.subIndustry === option || (!manifest && industryLabels[answers.industry ?? ""] === option)
                            return (
                              <button key={option} type="button"
                                onClick={() => autoAdvance(() => {
                                  if (!manifest) {
                                    const k = Object.entries(industryLabels).find(([, l]) => l === option)?.[0] ?? null
                                    setAnswers((prev) => ({ ...prev, industry: k, subIndustry: option }))
                                  } else {
                                    set("subIndustry", option)
                                  }
                                })}
                                className="min-h-[3.25rem] rounded-xl border px-4 py-3 text-left text-sm font-black uppercase tracking-[0.1em] transition-all duration-150"
                                style={{
                                  borderColor: active ? SIGNAL_GREEN : tk.cardBorder(false),
                                  backgroundColor: active ? `${SIGNAL_GREEN}14` : tk.cardBg(false),
                                  color: active ? tk.text : tk.muted,
                                }}>
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
                        isLight={isLight}
                        primaryColor={answers.primaryColor}
                      />
                    )}

                    {step === "contact" && (
                      <div className="space-y-8">
                        {/* Phone */}
                        <div>
                          <input
                            autoFocus type="tel"
                            value={answers.phone}
                            onChange={(e) => set("phone", e.target.value)}
                            placeholder="Phone number"
                            className={`w-full text-[2rem] ${tk.inputCls} ${tk.placeholder}`}
                            style={{ color: tk.text, borderBottomColor: answers.phone.length > 6 ? SIGNAL_GREEN : tk.border(false) }}
                          />
                          {answers.phone.length > 6 && (
                            <button type="button"
                              onClick={() => set("phoneVisible", !answers.phoneVisible)}
                              className="mt-3 text-xs font-black uppercase tracking-[0.14em] transition-colors"
                              style={{ color: answers.phoneVisible ? SIGNAL_GREEN : tk.muted }}>
                              {answers.phoneVisible
                                ? "✓ Shows on your contact page — tap to hide"
                                : "Hidden from your site — tap to show"}
                            </button>
                          )}
                        </div>

                        {/* Email */}
                        <div>
                          <input
                            type="email"
                            value={answers.email}
                            onChange={(e) => set("email", e.target.value)}
                            placeholder="Email address"
                            className={`w-full text-[2rem] ${tk.inputCls} ${tk.placeholder}`}
                            style={{ color: tk.text, borderBottomColor: answers.email.includes("@") ? SIGNAL_GREEN : tk.border(false) }}
                          />
                          {answers.email.includes("@") && (
                            <button type="button"
                              onClick={() => set("emailVisible", !answers.emailVisible)}
                              className="mt-3 text-xs font-black uppercase tracking-[0.14em] transition-colors"
                              style={{ color: answers.emailVisible ? SIGNAL_GREEN : tk.muted }}>
                              {answers.emailVisible
                                ? "✓ Shows on your contact page — tap to hide"
                                : "Hidden from your site — tap to show"}
                            </button>
                          )}
                        </div>

                        {/* Lead routing — only shows when both fields are valid */}
                        {answers.phone.length > 6 && answers.email.includes("@") && (
                          !answers.separateLeads ? (
                            <button type="button"
                              onClick={() => set("separateLeads", true)}
                              className="text-xs font-black uppercase tracking-[0.14em] underline decoration-[#32D074] underline-offset-4"
                              style={{ color: tk.muted }}>
                              Send leads to a different number or email?
                            </button>
                          ) : (
                            <div className="space-y-5">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: tk.muted }}>
                                  Lead notifications go to:
                                </p>
                                <button type="button"
                                  onClick={() => { set("separateLeads", false); set("leadPhone", ""); set("leadEmail", "") }}
                                  className="text-xs font-black uppercase tracking-[0.14em]"
                                  style={{ color: tk.muted }}>
                                  Cancel
                                </button>
                              </div>
                              <input
                                type="tel"
                                value={answers.leadPhone}
                                onChange={(e) => set("leadPhone", e.target.value)}
                                placeholder="Lead notification phone (optional)"
                                className={`w-full text-xl ${tk.inputCls} ${tk.placeholder}`}
                                style={{ color: tk.text, borderBottomColor: answers.leadPhone.length > 6 ? SIGNAL_GREEN : tk.border(false) }}
                              />
                              <input
                                type="email"
                                value={answers.leadEmail}
                                onChange={(e) => set("leadEmail", e.target.value)}
                                placeholder="Lead notification email"
                                className={`w-full text-xl ${tk.inputCls} ${tk.placeholder}`}
                                style={{ color: tk.text, borderBottomColor: answers.leadEmail.includes("@") ? SIGNAL_GREEN : tk.border(false) }}
                              />
                            </div>
                          )
                        )}
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
                          className={`w-full resize-none text-[2rem] leading-relaxed ${tk.inputCls} ${tk.placeholder}`}
                          style={{ color: tk.text, borderBottomColor: answers.different.length > 8 ? SIGNAL_GREEN : tk.border(false) }}
                        />
                        {answers.industry && DIFFERENTIATOR_CHIPS[answers.industry] && (
                          <div className="space-y-2">
                            <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: tk.hint }}>Quick adds</p>
                            <div className="flex flex-wrap gap-2">
                              {DIFFERENTIATOR_CHIPS[answers.industry].map((chip) => (
                                <button key={chip} type="button"
                                  onClick={() => set("different", answers.different ? `${answers.different}, ${chip}` : chip)}
                                  className="rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] transition"
                                  style={{ borderColor: tk.chipBorder(false), color: tk.muted }}>
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
                        isLight={isLight}
                        primaryColor={answers.primaryColor}
                        industry={answers.industry}
                      />
                    )}

                    {step === "photos" && (
                      <div className="space-y-3">
                        <OptionCard active={answers.photoChoice === "stock"} isLight={isLight} primaryColor={answers.primaryColor}
                          onClick={() => autoAdvance(() => set("photoChoice", "stock"))}
                          title="Skip for now"
                          body="We'll pull great photos for your industry automatically." />

                        {/* Hero photo upload */}
                        {answers.heroImageUrl ? (
                          <div className="flex items-center gap-4 rounded-xl border p-4 transition-all"
                            style={{ borderColor: tk.cardBorder(true), backgroundColor: tk.cardBg(true) }}>
                            <div className="h-14 w-20 shrink-0 rounded-lg overflow-hidden">
                              <img src={answers.heroImageUrl} alt="Hero" className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black" style={{ color: tk.text }}>Photo uploaded</p>
                              <p className="text-xs mt-0.5" style={{ color: tk.muted }}>This will be your hero image</p>
                            </div>
                            <label className="shrink-0 cursor-pointer text-xs font-black uppercase tracking-widest transition hover:opacity-70"
                              style={{ color: answers.primaryColor }}>
                              Replace
                              <input type="file" accept="image/png,image/jpeg,image/webp"
                                className="sr-only" onChange={handleHeroUpload} disabled={heroUploading} />
                            </label>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center gap-3 cursor-pointer rounded-xl border-2 border-dashed p-8 transition hover:opacity-80 active:opacity-60"
                            style={{ borderColor: tk.cardBorder(false) }}>
                            {heroUploading ? (
                              <div className="flex items-center gap-3">
                                <svg className="animate-spin" width="20" height="20" fill="none" viewBox="0 0 24 24" style={{ color: answers.primaryColor }}>
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span className="text-sm font-black" style={{ color: tk.muted }}>Uploading...</span>
                              </div>
                            ) : (
                              <>
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ color: tk.muted }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                                <p className="text-sm font-black text-center" style={{ color: tk.text }}>Upload your own photo</p>
                                <p className="text-xs text-center" style={{ color: tk.muted }}>JPG · PNG · WEBP · up to 20 MB</p>
                                {heroError && <p className="text-xs font-black text-red-500">{heroError}</p>}
                              </>
                            )}
                            <input type="file" accept="image/*"
                              className="sr-only" onChange={handleHeroUpload} disabled={heroUploading} />
                          </label>
                        )}
                      </div>
                    )}

                    {step === "logo" && (
                      <div className="space-y-3">
                        <OptionCard active={answers.logoChoice === "brandmark"} isLight={isLight} primaryColor={answers.primaryColor}
                          onClick={() => autoAdvance(() => set("logoChoice", "brandmark"))}
                          title="Not yet — that's okay"
                          body="Found turns your business name into a clean professional wordmark." />

                        {/* Real upload zone */}
                        {answers.logoUrl ? (
                          <div className="flex items-center gap-4 rounded-xl border p-4 transition-all"
                            style={{ borderColor: tk.cardBorder(true), backgroundColor: tk.cardBg(true) }}>
                            <div className="h-14 w-14 shrink-0 rounded-lg border flex items-center justify-center overflow-hidden"
                              style={{ borderColor: tk.cardBorder(false), backgroundColor: "#fff" }}>
                              <img src={answers.logoUrl} alt="Logo" className="max-h-12 max-w-12 object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black" style={{ color: tk.text }}>Logo uploaded</p>
                              <p className="text-xs mt-0.5 truncate" style={{ color: tk.muted }}>Tap continue or replace below</p>
                            </div>
                            <label className="shrink-0 cursor-pointer text-xs font-black uppercase tracking-widest transition hover:opacity-70"
                              style={{ color: answers.primaryColor }}>
                              Replace
                              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                className="sr-only" onChange={handleLogoUpload} disabled={logoUploading} />
                            </label>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center gap-3 cursor-pointer rounded-xl border-2 border-dashed p-8 transition hover:opacity-80 active:opacity-60"
                            style={{ borderColor: tk.cardBorder(false) }}>
                            {logoUploading ? (
                              <div className="flex items-center gap-3">
                                <svg className="animate-spin" width="20" height="20" fill="none" viewBox="0 0 24 24" style={{ color: answers.primaryColor }}>
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span className="text-sm font-black" style={{ color: tk.muted }}>Uploading...</span>
                              </div>
                            ) : (
                              <>
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ color: tk.muted }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                                <p className="text-sm font-black text-center" style={{ color: tk.text }}>I have a logo — upload it</p>
                                <p className="text-xs text-center" style={{ color: tk.muted }}>PNG · JPG · SVG · WEBP · under 5 MB</p>
                                {logoError && <p className="text-xs font-black text-red-500">{logoError}</p>}
                              </>
                            )}
                            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              className="sr-only" onChange={handleLogoUpload} disabled={logoUploading} />
                          </label>
                        )}
                      </div>
                    )}

                    {step === "color" && (
                      <div className="space-y-4">
                      {answers.logoUrl && (
                        <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                          style={{ backgroundColor: `${answers.primaryColor}18`, border: `1px solid ${answers.primaryColor}40` }}>
                          <div className="h-8 w-8 shrink-0 rounded overflow-hidden border flex items-center justify-center"
                            style={{ borderColor: `${answers.primaryColor}30`, backgroundColor: "#fff" }}>
                            <img src={answers.logoUrl} alt="Logo" className="max-h-7 max-w-7 object-contain" />
                          </div>
                          <p className="text-xs font-black" style={{ color: answers.primaryColor }}>
                            Color detected from your logo — change it below if needed.
                          </p>
                        </div>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2">
                        {palettes.map((p) => {
                          const active = answers.primaryColor.toLowerCase() === p.hex.toLowerCase()
                          return (
                            <button key={p.hex} type="button"
                              onClick={() => set("primaryColor", p.hex)}
                              className="flex min-h-[4rem] items-center gap-4 rounded-xl border px-4 py-3 text-left transition-all duration-150"
                              style={{ borderColor: tk.cardBorder(active, p.hex), backgroundColor: tk.cardBg(active) }}>
                              <span className="h-8 w-8 shrink-0 rounded-full" style={{ backgroundColor: p.hex }} />
                              <span>
                                <span className="block text-sm font-black" style={{ color: tk.text }}>{p.name}</span>
                                <span className="block text-xs" style={{ color: tk.muted }}>{p.feel}</span>
                              </span>
                            </button>
                          )
                        })}
                        <label className="flex min-h-[4rem] cursor-pointer items-center gap-4 rounded-xl border px-4 py-3 transition"
                          style={{ borderColor: tk.cardBorder(false), backgroundColor: tk.cardBg(false) }}>
                          <span className="h-8 w-8 shrink-0 rounded-full border" style={{ backgroundColor: answers.primaryColor, borderColor: tk.cardBorder(false) }} />
                          <span className="flex-1">
                            <span className="block text-sm font-black" style={{ color: tk.text }}>Custom</span>
                            <input
                              value={answers.primaryColor}
                              onChange={(e) => set("primaryColor", e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 w-full bg-transparent text-xs font-black uppercase outline-none"
                              style={{ color: tk.muted }}
                              placeholder="#2E7D32"
                            />
                          </span>
                        </label>
                      </div>
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
                            <button key={o.key} type="button"
                              onClick={() => autoAdvance(() => set("vibe", o.key))}
                              className="min-h-[7rem] border p-5 text-left transition-all duration-150"
                              style={{ borderRadius: o.radius, borderColor: tk.cardBorder(active), backgroundColor: tk.cardBg(active) }}>
                              <div className="mb-3 h-0.5 w-10" style={{ backgroundColor: answers.primaryColor }} />
                              <span className="block text-base font-black" style={{ color: tk.text }}>{o.label}</span>
                              <span className="mt-1 block text-xs" style={{ color: tk.muted }}>{o.desc}</span>
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
                          className={`w-full resize-none text-xl leading-relaxed ${tk.inputCls} ${tk.placeholder}`}
                          style={{ color: tk.text, borderBottomColor: tk.border(false) }}
                        />
                        <p className="text-[1rem]" style={{ color: tk.hint }}>
                          Optional. Each line is one review. Your site looks great without these too.
                        </p>
                      </div>
                    )}

                    {result?.error && (
                      <p className="mt-5 text-sm font-bold text-red-500">{result.error}</p>
                    )}
                </section>
              )}

              </div>{/* end scrollable body */}

              {/* Continue button — always visible, never behind the keyboard */}
              {phase === "questions" && !isAutoStep && (
                <footer className="shrink-0 px-7 pt-2 md:px-12" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
                  <button
                    type="button" onClick={advance}
                    disabled={!ready || logoUploading || heroUploading}
                    className="w-full rounded-full py-5 text-sm font-black uppercase tracking-widest transition disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto sm:px-10"
                    style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
                  >
                    {step === "testimonials" ? "Build my site" : "Continue →"}
                  </button>
                </footer>
              )}
            </div>
          </div>

          {/* ── Right: live preview (desktop only) ── */}
          <div className="hidden flex-col md:flex"
            style={{ backgroundColor: "#050705", borderLeft: "1px solid rgba(255,255,255,0.045)" }}>
            <LivePreview answers={answers} />
          </div>

        </div>
      </main>
    </>
  )
}
