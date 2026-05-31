"use client"

import { useActionState } from "react"
import { sendReply } from "@/app/actions/reply"

const initialState = { success: false, error: "" }

export default function ReplyForm({
  token,
  customerName,
  customerEmail,
  defaultSubject,
  defaultMessage,
  primaryColor,
}: {
  token: string
  customerName: string
  customerEmail: string
  defaultSubject: string
  defaultMessage: string
  primaryColor: string
}) {
  const [state, formAction, pending] = useActionState(sendReply, initialState)

  if (state.success) {
    return (
      <div className="text-center py-16 px-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: `${primaryColor}22` }}
        >
          <svg className="w-8 h-8" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black mb-3" style={{ color: "#111111" }}>Message sent.</h2>
        <p className="text-gray-500 max-w-sm mx-auto">
          Your reply has been delivered to {customerName.split(" ")[0]}. They'll receive a professional email from your business.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#999999" }}>To</label>
        <div className="w-full border border-gray-100 rounded-xl px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-500">
          {customerName} — {customerEmail}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#999999" }}>Subject</label>
        <input
          name="subject"
          type="text"
          defaultValue={defaultSubject}
          required
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
        />
      </div>

      <div>
        <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#999999" }}>Message</label>
        <textarea
          name="message"
          rows={8}
          defaultValue={defaultMessage}
          required
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 resize-none leading-relaxed"
          style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
        />
      </div>

      {state.error && (
        <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full font-bold text-white py-4 rounded-full text-base disabled:opacity-60"
        style={{ backgroundColor: primaryColor }}
      >
        {pending ? "Sending…" : `Send to ${customerName.split(" ")[0]}`}
      </button>
    </form>
  )
}
