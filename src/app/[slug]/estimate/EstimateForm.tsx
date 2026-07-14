"use client"
import { useActionState } from "react"
import { submitLead } from "@/app/actions/leads"

const initialState = { success: false, error: "" }

type SelectField = { kind: "select"; name: string; label: string; options: string[]; required?: boolean }
type TextField   = { kind: "text";   name: string; label: string; placeholder: string; required?: boolean }
type DateField   = { kind: "date";   name: string; label: string }
type ExtraField  = SelectField | TextField | DateField

function getExtraFields(industry: string): ExtraField[] {
  const fields: ExtraField[] = []

  const isHomeField   = ["home_services", "landscaping", "home_property"].includes(industry)
  const isCleaning    = industry === "cleaning"
  const isEventBased  = ["events", "music_performance"].includes(industry)
  const isCreative    = industry === "creative_services"
  const isAutomotive  = industry === "automotive"
  const isQuoteIndustry = ["home_services", "landscaping", "cleaning", "home_property",
    "events", "creative_services", "professional_services", "automotive", "music_performance"].includes(industry)

  if (isHomeField || isCleaning) {
    fields.push({ kind: "text", name: "job_address", label: "Job Address", placeholder: "Address where work is needed" })
  }

  if (isCleaning) {
    fields.push(
      { kind: "select", name: "home_type",  label: "Property Type",      options: ["House", "Apartment / Condo", "Commercial / Office", "Other"] },
      { kind: "select", name: "sq_footage", label: "Approximate Size",   options: ["Under 500 sq ft", "500–1,000 sq ft", "1,000–2,000 sq ft", "2,000–3,000 sq ft", "3,000+ sq ft", "Not sure"] },
      { kind: "select", name: "frequency",  label: "How often?",         options: ["One-time / Deep clean", "Weekly", "Every 2 weeks", "Monthly"] },
    )
  }

  if (isEventBased || isCreative) {
    fields.push({ kind: "date", name: "event_date", label: isCreative ? "Project / Shoot Date" : "Event Date" })
  }

  if (isEventBased) {
    fields.push({ kind: "select", name: "guest_count", label: "Approximate Guest Count", options: ["Under 25", "25–75", "75–150", "150–300", "300+", "Not sure yet"] })
  }

  if (isAutomotive) {
    fields.push({ kind: "text", name: "vehicle_info", label: "Vehicle", placeholder: "Year, Make, Model (e.g. 2019 Honda Civic)" })
  }

  if (isHomeField) {
    fields.push({ kind: "select", name: "timeline", label: "When do you need this done?", options: ["ASAP — this week", "Within a month", "1–3 months out", "Just planning ahead"] })
  }

  if (isQuoteIndustry) {
    fields.push({ kind: "select", name: "budget", label: "Approximate Budget", options: ["Under $500", "$500–$2,000", "$2,000–$5,000", "$5,000–$10,000", "$10,000–$25,000", "$25,000+", "Not sure yet"] })
  }

  return fields
}

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 bg-white"

export default function EstimateForm({
  companyId,
  services,
  primaryColor,
  industryCategory = "",
}: {
  companyId: string
  services: { name: string }[]
  primaryColor: string
  industryCategory?: string
}) {
  const [state, formAction, pending] = useActionState(submitLead, initialState)
  const extraFields = getExtraFields(industryCategory)

  if (state.success) {
    return (
      <div className="text-center py-16 px-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}18` }}>
          <svg className="w-8 h-8" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black mb-3" style={{ color: "#111111" }}>Request received!</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-2">
          Check your email — we just sent you a confirmation. Someone will follow up within 1 business day, usually sooner.
        </p>
        <p className="text-sm text-gray-400">You can close this page.</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="request_type" value="estimate_request" />
      <input type="hidden" name="request_source" value="estimate_form" />

      {/* Name + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
            Full Name <span style={{ color: primaryColor }}>*</span>
          </label>
          <input name="name" type="text" required placeholder="Your name" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
            Phone <span style={{ color: primaryColor }}>*</span>
          </label>
          <input name="phone" type="tel" required placeholder="Your phone number" className={inputClass} />
        </div>
      </div>

      {/* Email — required */}
      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
          Email <span style={{ color: primaryColor }}>*</span>
        </label>
        <input name="email" type="email" required placeholder="your@email.com" className={inputClass} />
        <p className="text-xs text-gray-400 mt-1.5">We&apos;ll send you a confirmation right away.</p>
      </div>

      {/* Service dropdown */}
      {services.length > 0 && (
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>What do you need?</label>
          <select name="service" className={inputClass}>
            <option value="">Select a service...</option>
            {services.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Industry-specific fields */}
      {extraFields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
            {field.label}
          </label>
          {field.kind === "text" && (
            <input
              name={field.name}
              type="text"
              required={field.required}
              placeholder={field.placeholder}
              className={inputClass}
            />
          )}
          {field.kind === "select" && (
            <select name={field.name} required={field.required} className={inputClass}>
              <option value="">Select...</option>
              {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {field.kind === "date" && (
            <input
              name={field.name}
              type="date"
              className={inputClass}
              min={new Date().toISOString().split("T")[0]}
            />
          )}
        </div>
      ))}

      {/* Message */}
      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
          Anything else we should know? <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea name="message" rows={4} placeholder="The more detail you share, the better we can prepare..."
          className={`${inputClass} resize-none`} style={{ lineHeight: "1.6" }} />
      </div>

      {state.error && (
        <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <button type="submit" disabled={pending}
        className="btn w-full text-white disabled:opacity-60"
        style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>
        {pending ? "Sending..." : "Send Request"}
      </button>

      <p className="text-xs text-center text-gray-400">No obligation. No spam. We respond within 1 business day.</p>
    </form>
  )
}
