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
  companyName,
  companyPhone,
  companyLogoUrl,
  websiteUrl,
  alreadyReplied,
}: {
  token: string
  customerName: string
  customerEmail: string
  defaultSubject: string
  defaultMessage: string
  primaryColor: string
  companyName: string
  companyPhone: string | null
  companyLogoUrl: string | null
  websiteUrl: string
  alreadyReplied: boolean
}) {
  const [state, formAction, pending] = useActionState(sendReply, initialState)
  const firstName = customerName.split(" ")[0]

  if (alreadyReplied) return null

  if (state.success) {
    return (
      <div style={{ padding: "48px 32px", textAlign: "center" }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "50%",
          background: `${primaryColor}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <svg width="24" height="24" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 800, color: "#111111" }}>Message sent.</p>
        <p style={{ margin: 0, fontSize: "14px", color: "#888888" }}>
          {firstName} will receive a professional email from {companyName}.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />

      {/* To */}
      <div style={{ padding: "20px 28px 0", borderBottom: "1px solid #f0f0f0" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#bbbbbb" }}>To</span>
        <p style={{ margin: "4px 0 16px", fontSize: "14px", color: "#555555" }}>
          {customerName} &mdash; <span style={{ color: "#aaaaaa" }}>{customerEmail}</span>
        </p>
      </div>

      {/* Subject */}
      <div style={{ padding: "16px 28px 0", borderBottom: "1px solid #f0f0f0" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#bbbbbb" }}>Subject</span>
        <input
          name="subject"
          type="text"
          defaultValue={defaultSubject}
          required
          style={{
            display: "block", width: "100%", border: "none", outline: "none",
            fontSize: "14px", color: "#111111", padding: "6px 0 16px",
            background: "transparent", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Message */}
      <div style={{ padding: "16px 28px 0" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#bbbbbb" }}>Message</span>
        <textarea
          name="message"
          rows={8}
          defaultValue={defaultMessage}
          required
          style={{
            display: "block", width: "100%", border: "none", outline: "none",
            fontSize: "14px", color: "#111111", lineHeight: "1.7",
            padding: "6px 0 16px", background: "transparent",
            resize: "none", boxSizing: "border-box", fontFamily: "inherit",
          }}
        />
      </div>

      {/* Signature preview */}
      <div style={{ margin: "0 28px 24px", padding: "16px 0", borderTop: "1px solid #eeeeee" }}>
        <p style={{ margin: "0 0 10px", fontSize: "10px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#cccccc" }}>
          Your signature — included automatically
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {companyLogoUrl ? (
            <img src={companyLogoUrl} alt={companyName} style={{ height: "28px", width: "auto", opacity: 0.4 }} />
          ) : (
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: `${primaryColor}33`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span style={{ fontSize: "12px", fontWeight: 900, color: primaryColor }}>
                {companyName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#bbbbbb" }}>{companyName}</p>
            {companyPhone && <p style={{ margin: 0, fontSize: "12px", color: "#cccccc" }}>{companyPhone}</p>}
            <p style={{ margin: 0, fontSize: "12px", color: "#cccccc" }}>{websiteUrl}</p>
          </div>
        </div>
      </div>

      {state.error && (
        <div style={{ margin: "0 28px 16px", padding: "12px 16px", background: "#fff5f5", borderRadius: "8px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#cc0000" }}>{state.error}</p>
        </div>
      )}

      {/* Send button */}
      <div style={{ padding: "0 28px 28px" }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            display: "block", width: "100%", padding: "15px",
            background: pending ? "#cccccc" : primaryColor,
            color: "#ffffff", border: "none", borderRadius: "50px",
            fontSize: "15px", fontWeight: 800, cursor: pending ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {pending ? "Sending…" : `Send to ${firstName}`}
        </button>
      </div>
    </form>
  )
}
