"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Link from "next/link"
import { detectIndustry, industryLabels } from "@/lib/industryDetection"
import { getIndustryManifest, industryManifests } from "@/lib/industryManifests"
import { palettes } from "@/lib/palettes"
import { createOnboardingSite, saveAbandonedLead } from "./actions"
import { createSetupIntentForCompany } from "./stripeActions"
import { checkSlugAvailable } from "./slugActions"
import { uploadLogoFile, uploadHeroFile } from "./uploadActions"
import { slugify as clientSlugify } from "@/lib/slugify"

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
  logoWhiteUrl: string
  navbarDark: boolean
  heroImageUrls: string[]
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
  logoUrl: "", logoWhiteUrl: "", navbarDark: false, heroImageUrls: [],
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
    case "contact":      return a.phone.replace(/\D/g, "").length >= 10 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email)
    case "different":    return a.different.trim().length > 8
    case "services":     return a.services.length > 0
    case "photos":       return !!a.photoChoice || a.heroImageUrls.length > 0
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
function planDetails(plan?: string) {
  if (plan === "found_business") return { price: 69, normal: 99 }
  if (plan === "found_pro")      return { price: 39, normal: 69 }
  return { price: 29, normal: 39 }
}

function RevealScreen({ name, url, primaryColor, email, checkoutUrl, plan, drawerMode }: { name: string; url: string; primaryColor: string; email: string; checkoutUrl?: string; plan?: string; drawerMode?: boolean }) {
  const [iframeReady, setIframeReady] = useState(false)

  // Compact phone dimensions for drawer (520px panel) vs full-page
  const phoneW    = drawerMode ? 156 : 272
  const phoneH    = drawerMode ? 320 : 560
  const phonePad  = drawerMode ? 7   : 10
  const phoneR    = drawerMode ? 32  : 44
  const notchW    = drawerMode ? 60  : 80
  const notchH    = drawerMode ? 18  : 22
  const notchTop  = drawerMode ? 14  : 18
  const screenR   = drawerMode ? 26  : 36
  const innerW    = phoneW - phonePad * 2 - 2      // subtract padding + border
  const iframeScale = innerW / 390

  return (
    <main
      className={`relative ${drawerMode ? "h-full overflow-y-auto" : "min-h-screen overflow-hidden"}`}
      style={{ backgroundColor: FOUND_BLACK, animation: "fade-in 0.7s ease-out both" }}>
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full blur-[120px]" style={{ backgroundColor: `${primaryColor}1a` }} />
      <div className={`relative ${drawerMode ? "" : "mx-auto flex min-h-screen max-w-6xl flex-col"} px-7 py-8`}>
        <header className="flex items-center justify-between">
          <svg viewBox="0 0 420 72" className="h-7 w-36 text-white" aria-label="Found">
            <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
          </svg>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SIGNAL_GREEN, boxShadow: `0 0 10px ${SIGNAL_GREEN}` }} />
            <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: SIGNAL_GREEN }}>Live</span>
          </div>
        </header>

        <div className={drawerMode
          ? "flex flex-col gap-6 pt-5 pb-6"
          : "grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1fr_0.88fr]"}>

          {/* ── Text content ── */}
          <div style={{ animation: "fade-up 0.6s ease-out both" }}>
            <p className={`${drawerMode ? "mb-3" : "mb-6"} text-xs font-black uppercase tracking-[0.24em]`} style={{ color: SIGNAL_GREEN }}>Found it.</p>
            <h1 className={`${drawerMode ? "text-3xl" : "text-5xl md:text-7xl"} font-light leading-[1.05] text-white`}>{name}<br />is live.</h1>
            <p className={`${drawerMode ? "mt-3 text-sm" : "mt-6 max-w-sm text-base"} leading-8 text-white/45`}>
              Your business now has a place online.{!drawerMode && " Open it, look around, and make it yours."}
            </p>
            <div className={drawerMode ? "mt-5" : "mt-9"}>
              <a href={`${url}?preview=true`} target="_blank" rel="noreferrer"
                className={`inline-flex ${drawerMode ? "w-full min-h-11" : "min-h-14"} items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90`}
                style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}>
                See your site →
              </a>
            </div>
            {!drawerMode && <p className="mt-5 break-all text-xs font-bold text-white/22">{url}</p>}

            {/* Email nudge — P.S. moment, delayed */}
            {email && !drawerMode && (
              <div className="mt-8 flex items-start gap-3" style={{ animation: "fade-up 0.6s 0.9s ease-out both", opacity: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-white/30">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m2 7 10 7 10-7" />
                </svg>
                <div>
                  <p className="text-xs leading-5 text-white/45">
                    We sent your next steps to <span className="font-black text-white/70">{email}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-white/25">
                    Don&apos;t see it? Check your spam — just this once.
                  </p>
                </div>
              </div>
            )}

            {/* Billing CTA */}
            {checkoutUrl && (() => {
              const { price, normal } = planDetails(plan)
              return (
                <div
                  className={`${drawerMode ? "mt-5" : "mt-8"} rounded-2xl p-5`}
                  style={{ animation: "fade-up 0.6s 1.4s ease-out both", opacity: 0, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: SIGNAL_GREEN }}>Founding rate</p>
                  <p className="mt-1.5 text-base font-black text-white">${price}/month.</p>
                  <p className="mt-0.5 text-xs text-white/35">Locked for 12 months, then ${normal}/month. Cancel anytime.</p>
                  <a
                    href={checkoutUrl}
                    className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full text-sm font-black uppercase tracking-widest transition hover:opacity-90"
                    style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
                  >
                    Activate my site →
                  </a>
                </div>
              )
            })()}
          </div>

          {/* ── Phone mockup with live site preview ── */}
          <div className={drawerMode ? "flex justify-center pb-4" : "flex items-center justify-center"} style={drawerMode ? undefined : { animation: "fade-up 0.85s ease-out both" }}>
            <div
              className="relative rounded-[44px] border border-white/10 bg-[#141715]"
              style={{ width: phoneW, height: phoneH, padding: phonePad, borderRadius: phoneR, boxShadow: "0 40px 100px rgba(0,0,0,0.7)" }}>
              <div className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[#0a0c0b]"
                style={{ top: notchTop, width: notchW, height: notchH }} />

              {/* Screen area */}
              <div className="relative h-full overflow-hidden bg-[#F5F7F4]" style={{ borderRadius: screenR }}>

                {/* Placeholder skeleton */}
                <div
                  className="absolute inset-0 transition-opacity duration-700"
                  style={{ opacity: iframeReady ? 0 : 1, pointerEvents: "none" }}
                >
                  <div className="relative flex flex-col justify-end p-4" style={{ backgroundColor: primaryColor, height: drawerMode ? "44%" : "52%" }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/60" />
                    <div className="relative">
                      <div className="h-3 w-28 rounded-full bg-white" />
                      <div className="mt-2 h-2 w-20 rounded-full bg-white/35" />
                    </div>
                  </div>
                  <div className="space-y-2.5 p-4">
                    <div className="h-2 w-16 rounded-full" style={{ backgroundColor: primaryColor, opacity: 0.7 }} />
                    <div className="h-10 rounded-xl bg-black/[0.05]" />
                    <div className="h-10 rounded-xl bg-black/[0.05]" />
                    <div className="h-8 rounded-full" style={{ backgroundColor: primaryColor }} />
                  </div>
                </div>

                {/* Live site iframe */}
                <iframe
                  src={url}
                  title={`${name} website preview`}
                  loading="eager"
                  sandbox="allow-scripts allow-same-origin"
                  className="absolute top-0 left-0 border-0 transition-opacity duration-700"
                  style={{
                    opacity: iframeReady ? 1 : 0,
                    pointerEvents: "none",
                    width: "390px",
                    height: "844px",
                    transform: `scale(${iframeScale})`,
                    transformOrigin: "top left",
                  }}
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
        className={`w-full text-[1.25rem] ${tk.inputCls} ${tk.placeholder}`}
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
type PlacePrediction = { description: string; place_id: string }

async function fetchPlaces(q: string): Promise<PlacePrediction[]> {
  if (q.length < 2) return []
  try {
    const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    return data.predictions ?? []
  } catch {
    return []
  }
}

function parsePlace(prediction: PlacePrediction): string {
  // "Tucson, AZ, USA" → "Tucson, AZ"  |  "London, UK" → "London, UK"
  const parts = prediction.description.split(",").map((s) => s.trim())
  if (parts.length >= 3 && parts[parts.length - 1] === "USA") {
    return `${parts[0]}, ${parts[1]}`
  }
  return parts.slice(0, 2).join(", ")
}

function LocationInput({ location, serviceAreas, onLocation, onAreas, isLight, primaryColor }: {
  location: string; serviceAreas: string[]
  onLocation: (v: string) => void; onAreas: (v: string[]) => void
  isLight: boolean; primaryColor: string
}) {
  const [citySuggestions, setCitySuggestions] = useState<PlacePrediction[]>([])
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [areaDraft, setAreaDraft] = useState("")
  const [areaSuggestions, setAreaSuggestions] = useState<PlacePrediction[]>([])
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false)
  const cityBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const areaBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cityDebounce  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const areaDebounce  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tk = getTokens(isLight, primaryColor)

  const dropdownBg     = isLight ? "#ffffff" : "#1a1c1b"
  const dropdownBorder = isLight ? "rgba(8,10,9,0.1)" : "rgba(255,255,255,0.1)"

  function handleCityChange(v: string) {
    onLocation(v)
    setShowCitySuggestions(true)
    if (cityDebounce.current) clearTimeout(cityDebounce.current)
    if (v.length >= 2) {
      cityDebounce.current = setTimeout(async () => {
        setCitySuggestions(await fetchPlaces(v))
      }, 280)
    } else {
      setCitySuggestions([])
    }
  }

  function handleAreaChange(v: string) {
    setAreaDraft(v)
    setShowAreaSuggestions(true)
    if (areaDebounce.current) clearTimeout(areaDebounce.current)
    if (v.length >= 2) {
      areaDebounce.current = setTimeout(async () => {
        setAreaSuggestions(await fetchPlaces(v))
      }, 280)
    } else {
      setAreaSuggestions([])
    }
  }

  function selectCity(prediction: PlacePrediction) {
    onLocation(parsePlace(prediction))
    setCitySuggestions([])
    setShowCitySuggestions(false)
  }

  function addArea(prediction: PlacePrediction) {
    const formatted = parsePlace(prediction)
    if (!serviceAreas.includes(formatted)) onAreas([...serviceAreas, formatted])
    setAreaDraft("")
    setAreaSuggestions([])
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
          onChange={(e) => handleCityChange(e.target.value)}
          onFocus={() => setShowCitySuggestions(true)}
          onBlur={() => { cityBlurTimer.current = setTimeout(() => setShowCitySuggestions(false), 150) }}
          placeholder="Tucson, AZ"
          className={`w-full text-[1.25rem] ${tk.inputCls} ${tk.placeholder}`}
          style={{ color: tk.text, borderBottomColor: location.length > 2 ? SIGNAL_GREEN : tk.border(false) }}
        />
        {showCitySuggestions && citySuggestions.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl shadow-xl"
            style={{ backgroundColor: dropdownBg, border: `1px solid ${dropdownBorder}` }}
          >
            {citySuggestions.map((p) => (
              <button
                key={p.place_id}
                type="button"
                onMouseDown={() => {
                  if (cityBlurTimer.current) clearTimeout(cityBlurTimer.current)
                  selectCity(p)
                }}
                className="block w-full px-4 py-3 text-left text-sm font-black uppercase tracking-[0.08em] transition hover:opacity-60"
                style={{ color: tk.text }}
              >
                {parsePlace(p)}
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
                onChange={(e) => handleAreaChange(e.target.value)}
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
                  {areaSuggestions.map((p) => (
                    <button
                      key={`area-${p.place_id}`}
                      type="button"
                      onMouseDown={() => {
                        if (areaBlurTimer.current) clearTimeout(areaBlurTimer.current)
                        addArea(p)
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-black uppercase tracking-[0.08em] transition hover:opacity-60"
                      style={{ color: tk.text }}
                    >
                      {parsePlace(p)}
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

// ── Slug taken bottom sheet ───────────────────────────────────────────────────
function SlugSheet({
  effective, ROOT, suggestions, custom, onCustomChange, onPick, onConfirm, onDismiss,
}: {
  effective: string; ROOT: string; suggestions: string[]; custom: string
  onCustomChange: (v: string) => void; onPick: (s: string) => void
  onConfirm: () => void; onDismiss: () => void
}) {
  const chosen = custom || effective
  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onDismiss} />
      {/* Sheet — fixed above keyboard on iOS */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl px-6 pt-6 pb-10"
        style={{ backgroundColor: "#ffffff", boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-black/10" />
        <p className="text-lg font-black" style={{ color: FOUND_BLACK }}>
          That address is taken
        </p>
        <p className="mt-1 text-sm leading-6" style={{ color: "rgba(8,10,9,0.50)" }}>
          <span className="font-black" style={{ color: "#f87171" }}>{effective}</span>.{ROOT} is already in use.
          Pick one below or type your own.
        </p>

        {suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} type="button"
                onClick={() => onPick(s)}
                className="rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.1em] transition"
                style={{
                  borderColor: custom === s ? SIGNAL_GREEN : "rgba(8,10,9,0.12)",
                  backgroundColor: custom === s ? `${SIGNAL_GREEN}14` : "transparent",
                  color: custom === s ? SIGNAL_GREEN : FOUND_BLACK,
                }}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-xl border px-4 py-3" style={{ borderColor: "rgba(8,10,9,0.12)" }}>
          <input
            type="text"
            value={custom}
            onChange={(e) => onCustomChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48))}
            placeholder="or type your own"
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            className="flex-1 bg-transparent text-sm font-black outline-none placeholder:text-black/30"
            style={{ color: FOUND_BLACK }}
          />
          <span className="shrink-0 text-xs font-black" style={{ color: "rgba(8,10,9,0.35)" }}>.{ROOT}</span>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="mt-5 w-full rounded-full py-4 text-sm font-black uppercase tracking-widest"
          style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}>
          Use {chosen}.{ROOT} →
        </button>
      </div>
    </>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OnboardingFlow({ onClose, drawerMode, plan = "found_pro" }: { onClose?: () => void; drawerMode?: boolean; plan?: string }) {
  const [phase, setPhase]           = useState<Phase>("welcome")
  const [stepIndex, setStepIndex]   = useState(0)
  const [answers, setAnswers]       = useState<Answers>(INITIAL)
  const [saving, setSaving]         = useState(false)
  const [result, setResult]         = useState<{ url?: string; checkoutUrl?: string; error?: string } | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveLeadForm, setSaveLeadForm]     = useState({ firstName: "", email: "" })
  const [savingLead, setSavingLead]         = useState(false)

  // Pre-generate the company ID so logo/hero uploads go to the permanent path
  const sessionId = useMemo(() => crypto.randomUUID(), [])

  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError]         = useState<string | null>(null)
  const [heroUploading, setHeroUploading] = useState([false, false, false])
  const [heroError, setHeroError]         = useState<string | null>(null)
  const [logoTipOpen, setLogoTipOpen]               = useState(false)
  const [logoWhiteUploading, setLogoWhiteUploading] = useState(false)
  const [logoWhiteError, setLogoWhiteError]         = useState<string | null>(null)
  const [logoTheme, setLogoTheme]                   = useState<"light" | "dark" | "unknown" | null>(null)
  const [logoDetectedColor, setLogoDetectedColor]   = useState<string | null>(null)

  // Slug picker state (name step)
  const [slugCustom, setSlugCustom]         = useState("")
  const [slugChecking, setSlugChecking]     = useState(false)
  const [slugStatus, setSlugStatus]         = useState<"idle" | "ok" | "taken">("idle")
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([])
  const [showSlugSheet, setShowSlugSheet]   = useState(false)

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

  function back() {
    if (stepIndex <= 1) {
      setPhase("welcome")
      setStepIndex(0)
    } else {
      setStepIndex((i) => i - 1)
    }
  }

  function advance() {
    if (step === "welcome") {
      setPhase("questions")
      setStepIndex(1)
      return
    }
    if (!canAdvance(step, answers)) return
    // If slug is taken, intercept and show the choice sheet instead of advancing
    if (step === "name" && slugStatus === "taken") {
      setShowSlugSheet(true)
      return
    }
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
        slugPreference: (slugCustom || clientSlugify(answers.name)) || undefined,
        logoUrl: answers.logoUrl || undefined,
        logoWhiteUrl: answers.logoWhiteUrl || undefined,
        navbarDark: answers.navbarDark,
        heroImageUrls: answers.heroImageUrls,
        plan,
      }),
      uiTimeout,
    ])
    if (res.success && res.url && res.slug) {
      await createSetupIntentForCompany({
        companyId: sessionId,
        email: answers.email,
        name: answers.name.trim(),
        slug: res.slug,
        plan,
      })
      const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "foundco.app"
      setResult({ url: res.url, checkoutUrl: `https://${ROOT}/activate?slug=${res.slug}` })
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

  function detectLogoLightness(url: string): Promise<"light" | "dark" | "unknown"> {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          const scale = Math.min(1, 64 / Math.max(img.width, img.height))
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          const ctx = canvas.getContext("2d")
          if (!ctx) { resolve("unknown"); return }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
          let totalLum = 0; let pixels = 0
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] > 32) {
              totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
              pixels++
            }
          }
          if (!pixels) { resolve("unknown"); return }
          const avg = totalLum / pixels
          resolve(avg > 190 ? "light" : avg < 80 ? "dark" : "unknown")
        } catch { resolve("unknown") }
      }
      img.onerror = () => resolve("unknown")
      img.src = url
    })
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
        if (res.dominantColor) {
          set("primaryColor", res.dominantColor)
          setLogoDetectedColor(res.dominantColor)
        }
        detectLogoLightness(res.url).then((theme) => {
          setLogoTheme(theme)
          if (theme === "light") set("navbarDark", true)
          else if (theme === "dark") set("navbarDark", false)
        })
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

  async function handleLogoWhiteUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoWhiteUploading(true)
    setLogoWhiteError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await uploadLogoFile(fd, sessionId, "light")
      if (res.success && res.url) {
        set("logoWhiteUrl", res.url)
      } else {
        setLogoWhiteError(res.error ?? "Upload failed — please try again.")
      }
    } catch {
      setLogoWhiteError("Upload failed — please try again.")
    } finally {
      setLogoWhiteUploading(false)
      e.target.value = ""
    }
  }

  async function handleHeroUpload(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setHeroUploading((prev) => { const next = [...prev]; next[index] = true; return next })
    setHeroError(null)
    try {
      const resized = await resizeImageToJpeg(file, 2400, 0.85)
      const fd = new FormData()
      fd.append("file", new File([resized], `hero-${index + 1}.jpg`, { type: "image/jpeg" }))
      const res = await uploadHeroFile(fd, sessionId, index)
      if (res.success && res.url) {
        const url = res.url
        setAnswers((prev) => {
          const urls = [...prev.heroImageUrls]
          urls[index] = url
          return { ...prev, heroImageUrls: urls, photoChoice: "uploaded" }
        })
      } else {
        setHeroError(res.error ?? "Upload failed — please try again.")
      }
    } catch {
      setHeroError("Upload failed — please try again.")
    } finally {
      setHeroUploading((prev) => { const next = [...prev]; next[index] = false; return next })
      e.target.value = ""
    }
  }

  // Real-time slug availability check (debounced 650ms)
  useEffect(() => {
    if (step !== "name" || answers.name.trim().length < 2) {
      setSlugStatus("idle")
      return
    }
    const effective = slugCustom || clientSlugify(answers.name)
    if (!effective) return
    setSlugChecking(true)
    setSlugStatus("idle")
    const city = answers.location.split(",")[0].trim() || null
    const timer = setTimeout(async () => {
      try {
        const res = await checkSlugAvailable(effective, city)
        setSlugStatus(res.available ? "ok" : "taken")
        setSlugSuggestions(res.suggestions)
      } catch {
        setSlugStatus("idle")
      } finally {
        setSlugChecking(false)
      }
    }, 650)
    return () => clearTimeout(timer)
  }, [answers.name, slugCustom, step, answers.location])

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
      email={answers.email}
      checkoutUrl={result.checkoutUrl}
      plan={plan}
      drawerMode={drawerMode}
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

      {showSlugSheet && (() => {
        const effective = slugCustom || clientSlugify(answers.name)
        const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "foundco.app"
        // When slug was taken and user confirmed a suggestion (pre-verified available) → advance
        // When user is just customizing a good slug → close sheet, re-check, user taps Next
        const confirmedSuggestion = slugSuggestions.includes(slugCustom)
        return (
          <SlugSheet
            effective={effective}
            ROOT={ROOT}
            suggestions={slugSuggestions}
            custom={slugCustom}
            onCustomChange={(v) => setSlugCustom(v)}
            onPick={(s) => setSlugCustom(s)}
            onConfirm={() => {
              setShowSlugSheet(false)
              if (confirmedSuggestion) {
                setSlugStatus("ok")
                setStepIndex((i) => i + 1)
              }
              // else: let debounce re-check the custom slug; user taps Next after ✓ appears
            }}
            onDismiss={() => setShowSlugSheet(false)}
          />
        )
      })()}

      <main className={`relative overflow-hidden ${drawerMode ? "h-full" : "min-h-screen"}`}>
        <div className={`grid ${!drawerMode ? "md:grid-cols-2" : ""} ${drawerMode ? "h-full" : "min-h-screen"}`}>

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
                {phase === "questions" ? (
                  <button
                    type="button"
                    onClick={back}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-black/10"
                    aria-label="Back"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" style={{ color: tk.text }}>
                      <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : onClose ? (
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
                    className="relative w-full rounded-full py-5 text-sm font-black uppercase tracking-widest whitespace-nowrap sm:w-auto sm:px-12 md:py-6"
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
                  className="flex min-h-full flex-col justify-start pt-6 pb-8"
                  style={{ animation: "fade-up 0.38s ease-out both" }}
                >
                    <div className="mb-4 max-w-lg">
                      {answers.industry && !["description"].includes(step) && (
                        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
                          {industryLabels[answers.industry]}
                        </p>
                      )}
                      <h1 className="text-xl font-light leading-tight md:text-2xl" style={{ color: tk.text }}>
                        {questionTitle(step, answers)}
                      </h1>
                      {step === "description" && (
                        <p className="mt-2 text-sm" style={{ color: tk.hint }}>In your own words. This is how Found understands your business.</p>
                      )}
                      {step === "location" && (
                        <p className="mt-2 text-sm" style={{ color: tk.hint }}>Your city anchors your headline, your CTA, and your SEO.</p>
                      )}
                      {step === "contact" && (
                        <p className="mt-2 text-sm" style={{ color: tk.hint }}>You control what shows publicly — each field has a toggle below it.</p>
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
                      <div className="space-y-3">
                        {/* Input with inline status icon — always visible above keyboard */}
                        <div className="relative">
                          <input
                            autoFocus
                            value={answers.name}
                            onChange={(e) => { set("name", e.target.value); setSlugCustom(""); setSlugStatus("idle"); setShowSlugSheet(false) }}
                            onKeyDown={(e) => e.key === "Enter" && advance()}
                            placeholder="e.g. Barrio Builders"
                            className={`w-full text-[1.8rem] pr-8 ${tk.inputCls} ${tk.placeholder}`}
                            style={{ color: tk.text, borderBottomColor: answers.name ? SIGNAL_GREEN : tk.border(false) }}
                          />
                          {/* Status icon — inside the input's right edge, never hidden by keyboard */}
                          <div className="absolute right-0 bottom-3 flex items-center">
                            {slugChecking && (
                              <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ color: tk.muted }}>
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            )}
                            {!slugChecking && slugStatus === "ok" && (
                              <span className="text-base font-black" style={{ color: SIGNAL_GREEN }}>✓</span>
                            )}
                            {!slugChecking && slugStatus === "taken" && (
                              <span className="text-base font-black" style={{ color: "#f87171" }}>✗</span>
                            )}
                          </div>
                        </div>

                        {/* URL line — compact, below input, visible on taller phones */}
                        {answers.name.trim().length >= 2 && (() => {
                          const effective = slugCustom || clientSlugify(answers.name)
                          const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "foundco.app"
                          return (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black" style={{ color: slugStatus === "ok" ? SIGNAL_GREEN : slugStatus === "taken" ? "#f87171" : tk.muted }}>
                                  {effective}<span style={{ color: tk.muted }}>.{ROOT}</span>
                                </span>
                                {slugStatus === "ok" && !slugCustom && (
                                  <button type="button"
                                    onClick={() => setShowSlugSheet(true)}
                                    className="text-[10px] font-black uppercase tracking-widest ml-auto"
                                    style={{ color: tk.muted }}>
                                    Change →
                                  </button>
                                )}
                                {slugStatus === "ok" && slugCustom && (
                                  <button type="button"
                                    onClick={() => setSlugCustom("")}
                                    className="text-[10px] font-black uppercase tracking-widest ml-auto"
                                    style={{ color: tk.muted }}>
                                    Reset
                                  </button>
                                )}
                              </div>

                              {/* Inline suggestions — shown immediately when slug is taken */}
                              {slugStatus === "taken" && slugSuggestions.length > 0 && (
                                <div className="mt-3" style={{ animation: "fade-up 0.3s ease-out both" }}>
                                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "#f87171" }}>
                                    That address is taken. These are available:
                                  </p>
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {slugSuggestions.map((s) => (
                                      <button key={s} type="button"
                                        onClick={() => { setSlugCustom(s); setSlugStatus("ok") }}
                                        className="rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] transition"
                                        style={{
                                          borderColor: slugCustom === s ? SIGNAL_GREEN : `${SIGNAL_GREEN}55`,
                                          backgroundColor: slugCustom === s ? `${SIGNAL_GREEN}14` : `${SIGNAL_GREEN}08`,
                                          color: SIGNAL_GREEN,
                                        }}>
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2 rounded-xl border px-4 py-2.5" style={{ borderColor: `${SIGNAL_GREEN}30` }}>
                                    <input
                                      type="text"
                                      value={slugCustom}
                                      onChange={(e) => {
                                        const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48)
                                        setSlugCustom(v)
                                        setSlugStatus("idle")
                                      }}
                                      placeholder="or type your own…"
                                      autoCapitalize="none" autoCorrect="off" spellCheck={false}
                                      className="flex-1 bg-transparent text-xs font-black outline-none placeholder:font-normal placeholder:opacity-40"
                                      style={{ color: FOUND_BLACK, letterSpacing: "0.04em" }}
                                    />
                                    <span className="shrink-0 text-[10px] font-black" style={{ color: tk.muted }}>
                                      .{process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "foundco.app"}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    )}

                    {step === "description" && (
                      <textarea
                        autoFocus
                        value={answers.description}
                        onChange={(e) => handleDescription(e.target.value)}
                        placeholder="I do roofing and remodeling in Tucson... I'm a balloon artist for parties and events..."
                        rows={3}
                        className={`w-full resize-none text-[1.15rem] leading-relaxed ${tk.inputCls} ${tk.placeholder}`}
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
                            autoFocus type="tel" autoComplete="tel"
                            value={answers.phone}
                            onChange={(e) => set("phone", e.target.value)}
                            placeholder="Phone number"
                            className={`w-full text-[1.25rem] ${tk.inputCls} ${tk.placeholder}`}
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
                            type="email" autoComplete="email"
                            value={answers.email}
                            onChange={(e) => set("email", e.target.value)}
                            placeholder="Email address"
                            className={`w-full text-[1.25rem] ${tk.inputCls} ${tk.placeholder}`}
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
                                type="tel" autoComplete="tel"
                                value={answers.leadPhone}
                                onChange={(e) => set("leadPhone", e.target.value)}
                                placeholder="Lead notification phone (optional)"
                                className={`w-full text-xl ${tk.inputCls} ${tk.placeholder}`}
                                style={{ color: tk.text, borderBottomColor: answers.leadPhone.length > 6 ? SIGNAL_GREEN : tk.border(false) }}
                              />
                              <input
                                type="email" autoComplete="email"
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
                          rows={3}
                          className={`w-full resize-none text-[1.15rem] leading-relaxed ${tk.inputCls} ${tk.placeholder}`}
                          style={{ color: tk.text, borderBottomColor: answers.different.length > 8 ? SIGNAL_GREEN : tk.border(false) }}
                        />
                        {answers.industry && DIFFERENTIATOR_CHIPS[answers.industry] && (
                          <div className="space-y-2">
                            <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: tk.hint }}>Quick adds</p>
                            <div className="flex flex-wrap gap-2">
                              {DIFFERENTIATOR_CHIPS[answers.industry].map((chip) => {
                                const selected = answers.different.toLowerCase().includes(chip.toLowerCase())
                                return (
                                  <button key={chip} type="button"
                                    onClick={() => { if (!selected) set("different", answers.different ? `${answers.different}, ${chip}` : chip) }}
                                    className="rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] transition"
                                    style={{
                                      borderColor: selected ? tk.chipBorder(true) : tk.chipBorder(false),
                                      color: selected ? tk.text : tk.muted,
                                      opacity: selected ? 0.4 : 1,
                                      cursor: selected ? "default" : "pointer",
                                    }}>
                                    {chip}
                                  </button>
                                )
                              })}
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
                      <div className="space-y-4">
                        <OptionCard active={answers.photoChoice === "stock"} isLight={isLight} primaryColor={answers.primaryColor}
                          onClick={() => autoAdvance(() => { set("photoChoice", "stock"); })}
                          title="Skip for now"
                          body="We'll pull great photos for your industry automatically." />

                        {/* Three photo slots */}
                        <div className="grid grid-cols-3 gap-2">
                          {[0, 1, 2].map((i) => {
                            const url = answers.heroImageUrls[i]
                            const uploading = heroUploading[i]
                            const label = i === 0 ? "Photo 1" : i === 1 ? "Photo 2" : "Photo 3"
                            const required = i === 0
                            return (
                              <label key={i} className="relative flex flex-col items-center justify-center cursor-pointer rounded-xl border-2 border-dashed aspect-square transition hover:opacity-80 active:opacity-60 overflow-hidden"
                                style={{ borderColor: url ? answers.primaryColor : tk.cardBorder(false), backgroundColor: url ? "transparent" : tk.cardBg(false) }}>
                                {url ? (
                                  <img src={url} alt={label} className="absolute inset-0 w-full h-full object-cover" />
                                ) : uploading ? (
                                  <svg className="animate-spin" width="20" height="20" fill="none" viewBox="0 0 24 24" style={{ color: answers.primaryColor }}>
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <div className="flex flex-col items-center gap-1 p-2">
                                    <span className="text-xl font-light" style={{ color: tk.muted }}>+</span>
                                    <span className="text-[10px] font-black text-center uppercase tracking-widest" style={{ color: tk.muted }}>{label}{required ? "" : " (optional)"}</span>
                                  </div>
                                )}
                                <input type="file" accept="image/*" className="sr-only"
                                  onChange={(e) => handleHeroUpload(i, e)} disabled={uploading} />
                              </label>
                            )
                          })}
                        </div>
                        {heroError && <p className="text-xs font-black text-red-500">{heroError}</p>}
                        <p className="text-xs text-center italic" style={{ color: answers.primaryColor }}>Once your site is live, you can add your full photo gallery.</p>
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
                          <div className="space-y-3">
                            {/* Dual-background preview */}
                            <p className="text-xs font-black uppercase tracking-widest" style={{ color: tk.muted }}>
                              How your logo looks on your site
                            </p>
                            <div className="grid grid-cols-2 rounded-xl overflow-hidden border"
                              style={{ borderColor: tk.cardBorder(false) }}>
                              <div className="flex flex-col items-center justify-center gap-2 p-5" style={{ backgroundColor: "#111111", minHeight: "88px" }}>
                                <img src={answers.logoUrl} alt="Logo on dark" className="max-h-10 max-w-full object-contain" />
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Dark sections</span>
                              </div>
                              <div className="flex flex-col items-center justify-center gap-2 p-5 border-l"
                                style={{ backgroundColor: "#ffffff", borderColor: tk.cardBorder(false), minHeight: "88px" }}>
                                <img src={answers.logoUrl} alt="Logo on light" className="max-h-10 max-w-full object-contain"
                                  style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.18)) drop-shadow(0 0 3px rgba(0,0,0,0.10))" }} />
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(0,0,0,0.3)" }}>Top nav bar</span>
                              </div>
                            </div>
                            {/* Smart fork — only shown when no decision made yet */}
                            {!answers.navbarDark && !answers.logoWhiteUrl && (
                              <div className="space-y-2">
                                {logoTheme === "dark" && (
                                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#32D074" }}>
                                    ✓ Your logo looks great on both backgrounds.
                                  </p>
                                )}
                                {(logoTheme === "unknown" || !logoTheme) && (
                                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: tk.muted }}>
                                    If the light side looks faint:
                                  </p>
                                )}
                                {(logoTheme === "unknown" || !logoTheme) && (
                                  <>
                                  <button type="button" onClick={() => set("navbarDark", true)}
                                    className="w-full flex items-center gap-3 rounded-xl border p-4 text-left transition hover:opacity-80"
                                    style={{ borderColor: tk.cardBorder(false), backgroundColor: tk.cardBg(false) }}>
                                    <div className="h-8 w-10 shrink-0 rounded flex items-center justify-center" style={{ backgroundColor: "#111111" }}>
                                      <div className="h-1.5 rounded" style={{ width: "65%", backgroundColor: "rgba(255,255,255,0.65)" }} />
                                    </div>
                                    <div>
                                      <span className="block text-sm font-black" style={{ color: tk.text }}>Keep my site dark</span>
                                      <span className="block text-xs mt-0.5" style={{ color: tk.muted }}>Dark navigation throughout — your logo always shows perfectly</span>
                                    </div>
                                  </button>
                                  <label className="w-full flex items-center gap-3 rounded-xl border p-4 text-left cursor-pointer transition hover:opacity-80"
                                    style={{ borderColor: tk.cardBorder(false), backgroundColor: tk.cardBg(false) }}>
                                    <div className="h-8 w-10 shrink-0 rounded border flex items-center justify-center"
                                      style={{ backgroundColor: "#ffffff", borderColor: "#e5e5e5" }}>
                                      {logoWhiteUploading ? (
                                        <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ color: answers.primaryColor }}>
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                      ) : (
                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ color: "#999" }}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <span className="block text-sm font-black" style={{ color: tk.text }}>I have a version for white backgrounds</span>
                                      <span className="block text-xs mt-0.5" style={{ color: tk.muted }}>Ask your designer for "the dark version of the logo" — then upload it here</span>
                                      {logoWhiteError && <p className="text-xs font-black text-red-500 mt-1">{logoWhiteError}</p>}
                                    </div>
                                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                      className="sr-only" onChange={handleLogoWhiteUpload} disabled={logoWhiteUploading} />
                                  </label>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Confirmation: dark site selected */}
                            {answers.navbarDark && (
                              <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                                style={{ backgroundColor: `${answers.primaryColor}18`, border: `1px solid ${answers.primaryColor}40` }}>
                                <div className="h-7 w-9 shrink-0 rounded flex items-center justify-center" style={{ backgroundColor: "#111111" }}>
                                  <div className="h-1.5 rounded" style={{ width: "65%", backgroundColor: "rgba(255,255,255,0.65)" }} />
                                </div>
                                <p className="flex-1 text-xs font-black" style={{ color: answers.primaryColor }}>
                                  {logoTheme === "light"
                                    ? "Light logo detected — navigation set to dark so it always stands out."
                                    : "Dark navigation — your logo will look great everywhere."}
                                </p>
                                <button type="button" className="text-xs font-black underline shrink-0"
                                  style={{ color: tk.muted }} onClick={() => set("navbarDark", false)}>
                                  Undo
                                </button>
                              </div>
                            )}

                            {/* Confirmation: light-bg logo uploaded */}
                            {answers.logoWhiteUrl && !answers.navbarDark && (
                              <div className="flex items-center gap-3 rounded-xl px-4 py-3"
                                style={{ backgroundColor: `${answers.primaryColor}18`, border: `1px solid ${answers.primaryColor}40` }}>
                                <div className="h-8 w-10 shrink-0 rounded border flex items-center justify-center overflow-hidden"
                                  style={{ backgroundColor: "#ffffff", borderColor: "#e5e5e5" }}>
                                  <img src={answers.logoWhiteUrl} alt="Light logo" className="max-h-7 max-w-full object-contain" />
                                </div>
                                <p className="flex-1 text-xs font-black" style={{ color: answers.primaryColor }}>
                                  Light-background version uploaded ✓
                                </p>
                                <button type="button" className="text-xs font-black underline shrink-0"
                                  style={{ color: tk.muted }} onClick={() => set("logoWhiteUrl", "")}>
                                  Remove
                                </button>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              <p className="text-xs font-black" style={{ color: answers.primaryColor }}>Logo uploaded ✓</p>
                              <label className="cursor-pointer text-xs font-black uppercase tracking-widest transition hover:opacity-70"
                                style={{ color: tk.muted }}>
                                Replace
                                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                  className="sr-only" onChange={handleLogoUpload} disabled={logoUploading} />
                              </label>
                            </div>
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

                        {/* Collapsible logo tip */}
                        <div className="pt-1">
                          <button type="button" onClick={() => setLogoTipOpen((v) => !v)}
                            className="text-xs font-black uppercase tracking-widest transition hover:opacity-70"
                            style={{ color: tk.muted }}>
                            {logoTipOpen ? "▾" : "▸"} Tips for a great logo
                          </button>
                          {logoTipOpen && (
                            <p className="mt-2 text-xs leading-relaxed" style={{ color: tk.muted }}>
                              For the best look, upload a file with a transparent background. If your logo has a white or dark background, it will appear as a box on your site. The file type you&apos;re looking for is called a <strong>PNG with transparency</strong> — your designer can send you one, or search &ldquo;[your logo name] transparent PNG&rdquo; online.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {step === "color" && (
                      <div className="space-y-4">
                      {logoDetectedColor && (
                        <>
                          <div>
                            <p className="mb-2 text-xs font-black uppercase tracking-widest" style={{ color: tk.muted }}>
                              From your logo
                            </p>
                            <button type="button"
                              onClick={() => set("primaryColor", logoDetectedColor)}
                              className="flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition"
                              style={{
                                borderColor: answers.primaryColor === logoDetectedColor ? logoDetectedColor : tk.cardBorder(false),
                                backgroundColor: answers.primaryColor === logoDetectedColor ? `${logoDetectedColor}14` : tk.cardBg(false),
                              }}>
                              <span className="h-12 w-12 shrink-0 rounded-full shadow-md" style={{ backgroundColor: logoDetectedColor }} />
                              <div className="flex-1">
                                <span className="block text-base font-black" style={{ color: tk.text }}>Your brand color</span>
                                <span className="block text-xs font-black uppercase mt-0.5" style={{ color: tk.muted }}>{logoDetectedColor}</span>
                              </div>
                              {answers.primaryColor === logoDetectedColor && (
                                <span className="text-sm font-black shrink-0" style={{ color: logoDetectedColor }}>✓</span>
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 border-t" style={{ borderColor: tk.cardBorder(false) }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: tk.muted }}>Or choose a different color</span>
                            <div className="flex-1 border-t" style={{ borderColor: tk.cardBorder(false) }} />
                          </div>
                        </>
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
                      <div className="space-y-3">
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

                        {/* Navigation style — light or dark */}
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: tk.muted }}>
                            Navigation style
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { dark: false, label: "Light",  desc: "White navigation bar" },
                              { dark: true,  label: "Dark",   desc: "Dark nav — great for light-colored logos" },
                            ] as const).map((o) => {
                              const active = answers.navbarDark === o.dark
                              return (
                                <button key={String(o.dark)} type="button"
                                  onClick={() => set("navbarDark", o.dark)}
                                  className="border p-4 text-left transition-all duration-150"
                                  style={{ borderRadius: "8px", borderColor: tk.cardBorder(active), backgroundColor: tk.cardBg(active) }}>
                                  {/* Mini navbar preview */}
                                  <div className="h-5 w-full rounded mb-3 flex items-center px-2 gap-1.5 overflow-hidden"
                                    style={{ backgroundColor: o.dark ? "#111111" : "#ffffff", border: o.dark ? "none" : "1px solid #e0e0e0" }}>
                                    <div className="h-1.5 w-8 rounded" style={{ backgroundColor: o.dark ? "rgba(255,255,255,0.6)" : "#cccccc" }} />
                                    <div className="flex-1" />
                                    <div className="h-4 w-8 rounded" style={{ backgroundColor: o.dark ? answers.primaryColor : answers.primaryColor, opacity: 0.9 }} />
                                  </div>
                                  <span className="block text-sm font-black" style={{ color: tk.text }}>{o.label}</span>
                                  <span className="mt-0.5 block text-xs" style={{ color: tk.muted }}>{o.desc}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
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
                    disabled={!ready || logoUploading || logoWhiteUploading || heroUploading.some(Boolean)}
                    className="w-full rounded-full py-5 text-sm font-black uppercase tracking-widest transition disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto sm:px-10"
                    style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
                  >
                    {step === "testimonials" ? "Build my site" : "Continue →"}
                  </button>
                </footer>
              )}
            </div>
          </div>

          {/* ── Right: live preview (full-page only, not in drawer) ── */}
          {!drawerMode && (
            <div className="hidden flex-col md:flex"
              style={{ backgroundColor: "#050705", borderLeft: "1px solid rgba(255,255,255,0.045)" }}>
              <LivePreview answers={answers} />
            </div>
          )}

        </div>
      </main>
    </>
  )
}
