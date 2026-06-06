"use client"

import { useMemo, useState } from "react"
import { detectIndustry, industryLabels } from "@/lib/industryDetection"
import { getIndustryManifest, industryManifests } from "@/lib/industryManifests"
import { palettes } from "@/lib/palettes"
import { createOnboardingSite } from "./actions"

type Step = "welcome" | "name" | "description" | "subIndustry" | "location" | "contact" | "different" | "services" | "photos" | "logo" | "color" | "vibe" | "testimonials" | "summary"

type Answers = {
  name: string
  description: string
  industry: string | null
  subIndustry: string
  location: string
  phone: string
  email: string
  different: string
  services: string
  photoChoice: string
  logoChoice: string
  primaryColor: string
  vibe: string
  testimonials: string
}

const orderedSteps: Step[] = ["welcome", "name", "description", "subIndustry", "location", "contact", "different", "services", "photos", "logo", "color", "vibe", "testimonials", "summary"]
const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"
const stepLabels: Record<Step, string> = {
  welcome: "Start",
  name: "Business name",
  description: "What you do",
  subIndustry: "Business type",
  location: "Location",
  contact: "Contact",
  different: "Difference",
  services: "Services",
  photos: "Photos",
  logo: "Logo",
  color: "Color",
  vibe: "Vibe",
  testimonials: "Reviews",
  summary: "Review",
}

const initialAnswers: Answers = {
  name: "",
  description: "",
  industry: null,
  subIndustry: "",
  location: "",
  phone: "",
  email: "",
  different: "",
  services: "",
  photoChoice: "stock",
  logoChoice: "brandmark",
  primaryColor: "#2E7D32",
  vibe: "bold",
  testimonials: "",
}

const vibeOptions = [
  { key: "bold", title: "Bold", body: "Strong and confident" },
  { key: "calm", title: "Calm", body: "Soft and elevated" },
  { key: "modern", title: "Modern", body: "Clean and sharp" },
  { key: "warm", title: "Warm", body: "Friendly and approachable" },
]

function RevealPreview({ name, url, onEdit }: { name: string; url: string; onEdit: () => void }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080A09] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-[#32D074]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="text-sm font-black uppercase tracking-[0.22em] text-white">Found</div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#32D074]">
            <span className="h-2 w-2 rounded-full bg-[#32D074] shadow-[0_0_22px_rgba(50,208,116,0.9)]" />
            Live
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <p className="mb-6 text-xs font-black uppercase tracking-[0.22em] text-[#32D074]">Found it.</p>
            <h1 className="max-w-3xl text-5xl font-black leading-none tracking-normal md:text-7xl">
              {name} is live.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">
              Your business now has a place online. Open it, look around, and make it yours.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#32D074] px-7 text-sm font-black uppercase tracking-widest text-[#080A09] transition hover:bg-[#5DE894]"
              >
                See your site
              </a>
              <button
                type="button"
                className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/18 px-7 text-sm font-black uppercase tracking-widest text-white transition hover:border-white/35"
                onClick={onEdit}
              >
                Make changes
              </button>
            </div>
            <p className="mt-6 break-all text-sm font-bold text-white/40">{url}</p>
          </div>

          <div className="relative min-h-[460px]">
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#32D074]/20" />
            <div className="absolute left-[8%] top-[15%] hidden h-56 w-80 rotate-[-8deg] rounded-[28px] border border-white/12 bg-white/[0.03] p-3 shadow-2xl shadow-black/50 md:block">
              <div className="h-full rounded-[20px] bg-[#F5F7F4] p-5 text-[#080A09]">
                <div className="mb-6 h-2 w-24 rounded-full bg-[#32D074]" />
                <div className="space-y-3">
                  <div className="h-7 w-48 rounded-full bg-black/90" />
                  <div className="h-3 w-60 rounded-full bg-black/18" />
                  <div className="h-3 w-44 rounded-full bg-black/14" />
                </div>
              </div>
            </div>
            <div className="absolute right-[10%] top-[5%] h-[420px] w-[210px] rounded-[42px] border border-white/16 bg-[#141715] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
              <div className="h-full overflow-hidden rounded-[32px] bg-[#F5F7F4] text-[#080A09]">
                <div className="h-44 bg-[#111] p-5 text-white">
                  <div className="mb-16 h-2 w-16 rounded-full bg-[#32D074]" />
                  <div className="h-6 w-32 rounded-full bg-white" />
                  <div className="mt-3 h-2 w-24 rounded-full bg-white/35" />
                </div>
                <div className="space-y-3 p-5">
                  <div className="h-3 w-24 rounded-full bg-black/80" />
                  <div className="h-16 rounded-2xl bg-black/[0.07]" />
                  <div className="h-16 rounded-2xl bg-black/[0.07]" />
                  <div className="h-10 rounded-full bg-[#32D074]" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-[9%] left-[6%] h-40 w-64 rotate-[5deg] rounded-[22px] border border-white/12 bg-white/[0.04] p-3 shadow-2xl shadow-black/50">
              <div className="h-full rounded-[16px] bg-[#111] p-5">
                <div className="h-3 w-20 rounded-full bg-[#32D074]" />
                <div className="mt-8 h-6 w-36 rounded-full bg-white" />
                <div className="mt-3 h-2 w-44 rounded-full bg-white/25" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function fieldReady(step: Step, answers: Answers) {
  switch (step) {
    case "welcome": return true
    case "name": return answers.name.trim().length > 1
    case "description": return answers.description.trim().length > 8
    case "subIndustry": return !!answers.subIndustry
    case "location": return answers.location.trim().length > 2
    case "contact": return answers.phone.trim().length > 6 && answers.email.includes("@")
    case "different": return answers.different.trim().length > 8
    case "services": return answers.services.trim().length > 2
    case "photos": return ["stock", "upload_later"].includes(answers.photoChoice)
    case "logo": return ["brandmark", "upload_later"].includes(answers.logoChoice)
    case "color": return /^#[0-9a-f]{6}$/i.test(answers.primaryColor)
    case "vibe": return ["bold", "calm", "modern", "warm"].includes(answers.vibe)
    case "testimonials": return true
    case "summary": return true
  }
}

function questionTitle(step: Step, answers: Answers) {
  switch (step) {
    case "welcome": return "Let's build your website."
    case "name": return "What's the name of your business?"
    case "description": return "What do you do? Tell me in your own words."
    case "subIndustry": return "What kind of business is it?"
    case "location": return "Where are you based, and where do you work?"
    case "contact": return "How should customers reach you?"
    case "different": return "What makes you different?"
    case "services": return "List your main services."
    case "photos": return "Got photos or videos of your work?"
    case "logo": return "Do you have a logo?"
    case "color": return "Pick a color that feels like your brand."
    case "vibe": return "Which of these feels most like your business?"
    case "testimonials": return "Any happy customers you'd like to shout out?"
    case "summary": return `${answers.name || "Your business"} is taking shape.`
  }
}

export default function OnboardingFlow() {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ slug?: string; url?: string; error?: string } | null>(null)

  const step = orderedSteps[stepIndex]
  const industry = answers.industry
  const manifest = industry ? getIndustryManifest(industry) : null
  const subIndustryOptions = useMemo(() => {
    if (manifest) return manifest.subIndustries
    return Object.keys(industryManifests).map((key) => industryLabels[key])
  }, [manifest])
  const canContinue = fieldReady(step, answers)

  if (result?.url) {
    return <RevealPreview name={answers.name.trim() || "Your business"} url={result.url} onEdit={() => setResult(null)} />
  }

  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  function next() {
    if (!canContinue) return
    if (stepIndex < orderedSteps.length - 1) setStepIndex(stepIndex + 1)
  }

  function back() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }

  async function submit() {
    if (saving) return
    setSaving(true)
    setResult(null)
    const response = await createOnboardingSite(answers)
    if (response.success) {
      setResult({ slug: response.slug, url: response.url })
    } else {
      setResult({ error: response.error || "Something went wrong." })
    }
    setSaving(false)
  }

  function handleDescription(value: string) {
    const detected = detectIndustry(value)
    setAnswers((current) => ({
      ...current,
      description: value,
      industry: detected ?? current.industry,
      subIndustry: detected && detected !== current.industry ? "" : current.subIndustry,
    }))
  }

  function chooseSubIndustry(option: string) {
    if (!manifest) {
      const industryKey = Object.entries(industryLabels).find(([, label]) => label === option)?.[0] ?? null
      setAnswers((current) => ({ ...current, industry: industryKey, subIndustry: "" }))
      return
    }
    update("subIndustry", option)
  }

  function resetDetectedIndustry() {
    setAnswers((current) => ({ ...current, industry: null, subIndustry: "" }))
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-[#111111]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: FOUND_BLACK }}>
            Found
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">
              <span className="block text-[#111]">{stepLabels[step]}</span>
              <span>{stepIndex + 1} of {orderedSteps.length}</span>
            </div>
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-[#111]"
              >
                Back
              </button>
            )}
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-12">
          <div className="mb-8">
            {industry && step !== "welcome" && (
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em]" style={{ color: SIGNAL_GREEN }}>
                {industryLabels[industry]}
              </p>
            )}
            <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-normal md:text-6xl">
              {questionTitle(step, answers)}
            </h1>
            {step === "welcome" && (
              <p className="mt-5 max-w-xl text-lg leading-8 text-[#555]">
                I&apos;m going to ask you a few questions. Answer however feels natural, like you&apos;re telling a friend about your business.
              </p>
            )}
            {step === "subIndustry" && manifest && (
              <div className="mt-5 max-w-xl">
                <p className="text-lg leading-8 text-[#555]">{manifest.primaryJob}</p>
                <button
                  type="button"
                  onClick={resetDetectedIndustry}
                  className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#111] underline decoration-[#32D074] decoration-2 underline-offset-4"
                >
                  Wrong business type? Change it
                </button>
              </div>
            )}
          </div>

          {step === "name" && (
            <input
              autoFocus
              value={answers.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="e.g. Barrio Builders"
              className="w-full rounded-none border-0 border-b-2 border-black/20 bg-transparent px-0 py-4 text-3xl font-black outline-none focus:border-[#32D074]"
            />
          )}

          {step === "description" && (
            <textarea
              autoFocus
              value={answers.description}
              onChange={(event) => handleDescription(event.target.value)}
              placeholder="I help people buy and sell homes in Tucson..."
              rows={5}
              className="w-full resize-none rounded-none border-0 border-b-2 border-black/20 bg-transparent px-0 py-4 text-2xl font-bold leading-relaxed outline-none focus:border-[#32D074]"
            />
          )}

          {step === "subIndustry" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {subIndustryOptions.map((option) => {
                const active = answers.subIndustry === option || (!manifest && industryLabels[answers.industry || ""] === option)
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => chooseSubIndustry(option)}
                    className="min-h-16 border-2 bg-white px-5 py-4 text-left text-base font-black transition"
                    style={{
                      borderColor: active ? SIGNAL_GREEN : "rgba(0,0,0,0.08)",
                      color: active ? FOUND_BLACK : "#111111",
                    }}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          )}

          {step === "location" && (
            <input
              autoFocus
              value={answers.location}
              onChange={(event) => update("location", event.target.value)}
              placeholder="Tucson, AZ - I serve Tucson and surrounding areas"
              className="w-full rounded-none border-0 border-b-2 border-black/20 bg-transparent px-0 py-4 text-2xl font-bold outline-none focus:border-[#32D074]"
            />
          )}

          {step === "contact" && (
            <div className="grid gap-5">
              <input
                autoFocus
                value={answers.phone}
                onChange={(event) => update("phone", event.target.value)}
                placeholder="Phone number"
                className="w-full rounded-none border-0 border-b-2 border-black/20 bg-transparent px-0 py-4 text-2xl font-bold outline-none focus:border-[#32D074]"
              />
              <input
                value={answers.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="Email address"
                className="w-full rounded-none border-0 border-b-2 border-black/20 bg-transparent px-0 py-4 text-2xl font-bold outline-none focus:border-[#32D074]"
              />
            </div>
          )}

          {step === "different" && (
            <textarea
              autoFocus
              value={answers.different}
              onChange={(event) => update("different", event.target.value)}
              placeholder="I know the Tucson market and I stay in front of my clients..."
              rows={5}
              className="w-full resize-none rounded-none border-0 border-b-2 border-black/20 bg-transparent px-0 py-4 text-2xl font-bold leading-relaxed outline-none focus:border-[#32D074]"
            />
          )}

          {step === "services" && (
            <textarea
              autoFocus
              value={answers.services}
              onChange={(event) => update("services", event.target.value)}
              placeholder="Buyer representation, seller listings, investment properties"
              rows={4}
              className="w-full resize-none rounded-none border-0 border-b-2 border-black/20 bg-transparent px-0 py-4 text-2xl font-bold leading-relaxed outline-none focus:border-[#32D074]"
            />
          )}

          {step === "photos" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { key: "stock", title: "Skip for now", body: "We'll pick strong photos for your industry automatically." },
                { key: "upload_later", title: "I'll add photos later", body: "Launch now. Add real work photos when you're ready." },
              ].map((option) => {
                const active = answers.photoChoice === option.key
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => update("photoChoice", option.key)}
                    className="min-h-28 border-2 bg-white px-5 py-5 text-left transition"
                    style={{
                      borderColor: active ? answers.primaryColor : "rgba(0,0,0,0.08)",
                    }}
                  >
                    <span className="block text-xl font-black text-[#111]">{option.title}</span>
                    <span className="mt-2 block text-sm font-bold leading-6 text-[#666]">{option.body}</span>
                  </button>
                )
              })}
            </div>
          )}

          {step === "logo" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { key: "brandmark", title: "Not yet - that's okay", body: "Found will turn your business name into a clean typography logo." },
                { key: "upload_later", title: "I have one", body: "We'll add upload next. For now, we'll launch with a BrandMark." },
              ].map((option) => {
                const active = answers.logoChoice === option.key
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => update("logoChoice", option.key)}
                    className="min-h-28 border-2 bg-white px-5 py-5 text-left transition"
                    style={{
                      borderColor: active ? answers.primaryColor : "rgba(0,0,0,0.08)",
                    }}
                  >
                    <span className="block text-xl font-black text-[#111]">{option.title}</span>
                    <span className="mt-2 block text-sm font-bold leading-6 text-[#666]">{option.body}</span>
                  </button>
                )
              })}
            </div>
          )}

          {step === "color" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {palettes.map((palette) => {
                const active = answers.primaryColor.toLowerCase() === palette.hex.toLowerCase()
                return (
                  <button
                    key={palette.hex}
                    type="button"
                    onClick={() => update("primaryColor", palette.hex)}
                    className="flex min-h-20 items-center gap-4 border-2 bg-white px-5 py-4 text-left transition"
                    style={{ borderColor: active ? palette.hex : "rgba(0,0,0,0.08)" }}
                  >
                    <span className="h-10 w-10 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: palette.hex }} />
                    <span>
                      <span className="block text-base font-black text-[#111]">{palette.name}</span>
                      <span className="block text-sm font-bold text-[#666]">{palette.feel}</span>
                    </span>
                  </button>
                )
              })}
              <label className="flex min-h-20 items-center gap-4 border-2 border-black/10 bg-white px-5 py-4">
                <span className="h-10 w-10 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: answers.primaryColor }} />
                <span className="flex-1">
                  <span className="block text-base font-black text-[#111]">Custom</span>
                  <input
                    value={answers.primaryColor}
                    onChange={(event) => update("primaryColor", event.target.value)}
                    className="mt-1 w-full bg-transparent text-sm font-bold uppercase text-[#666] outline-none"
                    placeholder="#2E7D32"
                  />
                </span>
              </label>
            </div>
          )}

          {step === "vibe" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {vibeOptions.map((option) => {
                const active = answers.vibe === option.key
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => update("vibe", option.key)}
                    className="min-h-28 border-2 bg-white px-5 py-5 text-left transition"
                    style={{
                      borderColor: active ? answers.primaryColor : "rgba(0,0,0,0.08)",
                      borderRadius: option.key === "bold" ? 10 : option.key === "modern" ? 6 : 24,
                    }}
                  >
                    <span
                      className="mb-3 block h-1 w-12"
                      style={{ backgroundColor: answers.primaryColor }}
                    />
                    <span className="block text-xl font-black text-[#111]">{option.title}</span>
                    <span className="mt-1 block text-sm font-bold text-[#666]">{option.body}</span>
                  </button>
                )
              })}
            </div>
          )}

          {step === "testimonials" && (
            <textarea
              autoFocus
              value={answers.testimonials}
              onChange={(event) => update("testimonials", event.target.value)}
              placeholder={"Maria - John helped us sell fast and made everything simple.\nDaniel - He stayed in touch and answered every question."}
              rows={6}
              className="w-full resize-none rounded-none border-0 border-b-2 border-black/20 bg-transparent px-0 py-4 text-2xl font-bold leading-relaxed outline-none focus:border-[#32D074]"
            />
          )}

          {step === "summary" && (
            <div className="space-y-3 text-lg leading-8 text-[#444]">
              <p><strong className="text-[#111]">Industry:</strong> {industry ? industryLabels[industry] : "Needs review"}</p>
              <p><strong className="text-[#111]">Kind:</strong> {answers.subIndustry}</p>
              <p><strong className="text-[#111]">Location:</strong> {answers.location}</p>
              <p><strong className="text-[#111]">Primary CTA:</strong> {manifest?.primaryIntent ?? "contact"}</p>
              <p><strong className="text-[#111]">Logo:</strong> BrandMark</p>
              <p><strong className="text-[#111]">Photos:</strong> Curated industry photos</p>
              <p><strong className="text-[#111]">Color:</strong> <span style={{ color: answers.primaryColor }}>{answers.primaryColor}</span></p>
              <p><strong className="text-[#111]">Vibe:</strong> {answers.vibe}</p>
              {result?.url && (
                <p className="pt-3 text-base text-[#666]">
                  Site created: <a className="font-black underline" href={result.url} target="_blank" rel="noreferrer">{result.url}</a>
                </p>
              )}
              {result?.error && (
                <p className="pt-3 text-base font-bold text-red-700">{result.error}</p>
              )}
            </div>
          )}
        </section>

        <footer className="pb-4">
          <button
            type="button"
            onClick={step === "summary" ? submit : next}
            disabled={!canContinue || saving || (step === "summary" && !!result?.url)}
            className="w-full rounded-full px-7 py-5 text-sm font-black uppercase tracking-widest text-white transition disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
            style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
          >
            {saving ? "Creating..." : step === "welcome" ? "Let's go" : step === "summary" ? "Create site" : "Continue"}
          </button>
        </footer>
      </div>
    </main>
  )
}
