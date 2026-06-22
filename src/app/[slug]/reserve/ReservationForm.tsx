"use client"
import { useActionState } from "react"
import { submitReservation } from "@/app/actions/leads"

const initialState = { success: false, error: "" }

export default function ReservationForm({
  companyId,
  primaryColor,
  showPartySize = true,
}: {
  companyId: string
  primaryColor: string
  showPartySize?: boolean
}) {
  const [state, formAction, pending] = useActionState(submitReservation, initialState)

  const today = new Date().toISOString().split("T")[0]

  if (state.success) {
    return (
      <div className="text-center py-16 px-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: `${primaryColor}22` }}>
          <svg className="w-8 h-8" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black mb-3" style={{ color: "#111111" }}>Request received!</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          We&apos;ll confirm your reservation as soon as possible. Check your email for a confirmation.
        </p>
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
          Email <span className="text-gray-400 font-normal">(optional — for confirmation)</span>
        </label>
        <input name="email" type="email" placeholder="your@email.com"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
            Date <span style={{ color: primaryColor }}>*</span>
          </label>
          <input name="date" type="date" required min={today}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
            Time <span style={{ color: primaryColor }}>*</span>
          </label>
          <input name="time" type="time" required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2" />
        </div>
      </div>

      {showPartySize && (
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
            Party Size
          </label>
          <select name="party_size"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2">
            <option value="">Select party size...</option>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={String(n)}>{n} {n === 1 ? "guest" : "guests"}</option>
            ))}
            <option value="20+">20+ guests (large party)</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
          Special requests <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea name="notes" rows={3} placeholder="Allergies, celebrations, seating preferences..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 resize-none" />
      </div>

      {state.error && (
        <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <button type="submit" disabled={pending}
        className="btn w-full text-white disabled:opacity-60"
        style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>
        {pending ? "Sending..." : "Request Reservation"}
      </button>

      <p className="text-xs text-center text-gray-400">
        This is a reservation request — not an instant confirmation. We&apos;ll confirm as soon as possible.
      </p>
    </form>
  )
}
