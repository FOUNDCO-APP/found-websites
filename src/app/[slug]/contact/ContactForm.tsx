"use client"
import { useActionState } from "react"
import { submitLead } from "@/app/actions/leads"

const initialState = { success: false, error: "" }

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 bg-white"

export default function ContactForm({
  companyId,
  primaryColor,
}: {
  companyId: string
  primaryColor: string
}) {
  const [state, formAction, pending] = useActionState(submitLead, initialState)

  if (state.success) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: `${primaryColor}18` }}>
          <svg className="w-7 h-7" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-black mb-2" style={{ color: "#111111" }}>Message sent!</h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          Check your email — we sent you a confirmation. We&apos;ll be in touch soon.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="company_id" value={companyId} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
            Name <span style={{ color: primaryColor }}>*</span>
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

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
          Email <span style={{ color: primaryColor }}>*</span>
        </label>
        <input name="email" type="email" required placeholder="your@email.com" className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
          How can we help? <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea name="message" rows={4} placeholder="Tell us what's on your mind..."
          className={`${inputClass} resize-none`} style={{ lineHeight: "1.6" }} />
      </div>

      {state.error && (
        <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <button type="submit" disabled={pending}
        className="btn w-full text-white disabled:opacity-60"
        style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>
        {pending ? "Sending..." : "Send Message"}
      </button>

      <p className="text-xs text-center text-gray-400">We respond within 1 business day — usually the same day.</p>
    </form>
  )
}
