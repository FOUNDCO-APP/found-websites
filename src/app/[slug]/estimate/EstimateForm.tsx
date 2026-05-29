"use client"
import { useActionState } from "react"
import { submitLead } from "@/app/actions/leads"

const initialState = { success: false, error: "" }

export default function EstimateForm({
  companyId,
  services,
  primaryColor,
}: {
  companyId: string
  services: { name: string }[]
  primaryColor: string
}) {
  const [state, formAction, pending] = useActionState(submitLead, initialState)

  if (state.success) {
    return (
      <div className="text-center py-16 px-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}22` }}>
          <svg className="w-8 h-8" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black mb-3" style={{ color: "#111111" }}>We&apos;ll be in touch soon!</h2>
        <p className="text-gray-500 max-w-md mx-auto">We received your request and will reach out within one business day.</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="company_id" value={companyId} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
            Full Name <span style={{ color: primaryColor }}>*</span>
          </label>
          <input name="name" type="text" required placeholder="Your name"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
            Phone <span style={{ color: primaryColor }}>*</span>
          </label>
          <input name="phone" type="tel" required placeholder="Your phone number"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
          Email <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input name="email" type="email" placeholder="your@email.com"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2" />
      </div>

      {services.length > 0 && (
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>What do you need?</label>
          <select name="service" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2">
            <option value="">Select a service...</option>
            {services.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
          Tell us about your project <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea name="message" rows={4} placeholder="Any details that help us prepare..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 resize-none" />
      </div>

      {state.error && (
        <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <button type="submit" disabled={pending}
        className="w-full font-bold text-white py-4 rounded-full text-base disabled:opacity-60"
        style={{ backgroundColor: primaryColor }}>
        {pending ? "Sending..." : "Send Request"}
      </button>

      <p className="text-xs text-center text-gray-400">We respond within 1 business day. No spam, no pressure.</p>
    </form>
  )
}
