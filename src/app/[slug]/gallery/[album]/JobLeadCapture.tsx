"use client"

import { useActionState, useMemo, useState } from "react"
import { submitLead } from "@/app/actions/leads"

const initialState = { success: false, error: "" }

export default function JobLeadCapture({
  companyId,
  businessName,
  subjectTitle,
  primaryColor,
  ctaLabel = "Ask about work like this",
  requestType = "contact",
  messagePrefix = "I'm interested in work like",
}: {
  companyId: string
  businessName: string
  subjectTitle: string
  primaryColor: string
  ctaLabel?: string
  requestType?: "contact" | "estimate_request"
  messagePrefix?: string
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(submitLead, initialState)
  const formLoadedAt = useMemo(() => String(Date.now()), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "12px 22px",
          borderRadius: 100,
          border: "none",
          backgroundColor: primaryColor,
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 700,
          color: "white",
          cursor: "pointer",
        }}
      >
        {ctaLabel}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ask about this work"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            background: "rgba(0,0,0,0.58)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ width: "min(100%, 430px)", borderRadius: 28, background: "#ffffff", boxShadow: "0 28px 90px rgba(0,0,0,0.34)", overflow: "hidden" }}>
            <div style={{ padding: "24px 24px 18px", borderBottom: "1px solid #eeeeee" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 850, letterSpacing: "0.16em", textTransform: "uppercase", color: primaryColor }}>
                    {businessName}
                  </p>
                  <h2 style={{ margin: 0, fontSize: 30, lineHeight: 1.02, letterSpacing: "-0.04em", color: "#101010" }}>
                    Ask about work like this.
                  </h2>
                  <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.45, color: "#666", fontWeight: 550 }}>
                    Tell {businessName} what you have in mind. This will mention {subjectTitle}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    border: "none",
                    background: "#f1f1f1",
                    color: "#222",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {state.success ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <div style={{ width: 54, height: 54, borderRadius: 999, background: `${primaryColor}18`, color: primaryColor, margin: "4px auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 22, lineHeight: 1.15, color: "#111" }}>Message sent.</h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#666" }}>
                  {businessName} received your request and will follow up soon.
                </p>
              </div>
            ) : (
              <form action={formAction} style={{ padding: 24 }}>
                <input type="hidden" name="company_id" value={companyId} />
                <input type="hidden" name="request_type" value={requestType} />
                <input type="hidden" name="request_source" value="contact_form" />
                <input type="hidden" name="service" value={subjectTitle} />
                <input type="hidden" name="project_type" value={subjectTitle} />
                <input type="hidden" name="form_loaded_at" value={formLoadedAt} />
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: "none" }} />

                <div style={{ display: "grid", gap: 12 }}>
                  <input name="name" required placeholder="Your name" style={inputStyle} />
                  <input name="phone" required type="tel" placeholder="Phone number" style={inputStyle} />
                  <input name="email" required type="email" placeholder="Email" style={inputStyle} />
                  <textarea
                    name="message"
                    rows={4}
                    defaultValue={`${messagePrefix} ${subjectTitle}.`}
                    style={{ ...inputStyle, resize: "none", lineHeight: 1.45 }}
                  />
                </div>

                {state.error && (
                  <p style={{ margin: "14px 0 0", padding: "12px 14px", borderRadius: 14, background: "#fff0f0", color: "#c62828", fontSize: 13, fontWeight: 700 }}>
                    {state.error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  style={{
                    width: "100%",
                    marginTop: 16,
                    padding: "15px 18px",
                    borderRadius: 999,
                    border: "none",
                    background: primaryColor,
                    color: "white",
                    fontSize: 15,
                    fontWeight: 850,
                    cursor: pending ? "default" : "pointer",
                    opacity: pending ? 0.7 : 1,
                  }}
                >
                  {pending ? "Sending..." : "Send request"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const inputStyle = {
  width: "100%",
  border: "1px solid #e5e5e5",
  borderRadius: 16,
  padding: "14px 15px",
  fontSize: 15,
  color: "#111",
  background: "#fafafa",
  outline: "none",
  boxSizing: "border-box" as const,
}
