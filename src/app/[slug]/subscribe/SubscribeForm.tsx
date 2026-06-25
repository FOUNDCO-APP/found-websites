"use client"

import { useState } from "react"

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

const INDUSTRY_CONFIG: Record<string, { birthday: boolean; anniversary: boolean; pet: boolean }> = {
  food:         { birthday: true,  anniversary: true,  pet: false },
  wellness:     { birthday: true,  anniversary: false, pet: false },
  beauty:       { birthday: true,  anniversary: false, pet: false },
  fitness:      { birthday: true,  anniversary: false, pet: false },
  pet_services: { birthday: true,  anniversary: false, pet: true  },
  home_services:{ birthday: false, anniversary: false, pet: false },
  automotive:   { birthday: false, anniversary: false, pet: false },
  healthcare:   { birthday: false, anniversary: false, pet: false },
  education:    { birthday: false, anniversary: false, pet: false },
}

function getDaysInMonth(month: number) {
  return new Date(2024, month, 0).getDate()
}

export default function SubscribeForm({
  companyId,
  primaryColor,
  industry,
  companyName,
}: {
  companyId: string
  primaryColor: string
  industry: string | null
  companyName: string
}) {
  const cfg = INDUSTRY_CONFIG[industry ?? ""] ?? { birthday: false, anniversary: false, pet: false }

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [bdMonth, setBdMonth] = useState("")
  const [bdDay, setBdDay] = useState("")
  const [annMonth, setAnnMonth] = useState("")
  const [annDay, setAnnDay] = useState("")
  const [petName, setPetName] = useState("")
  const [petBdMonth, setPetBdMonth] = useState("")
  const [petBdDay, setPetBdDay] = useState("")
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || (!email.trim() && !phone.trim())) {
      setError("Please enter your name and at least an email or phone number.")
      return
    }
    setPending(true)
    setError(null)
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          name, email, phone,
          birthday_month: bdMonth || null,
          birthday_day: bdDay || null,
          anniversary_month: annMonth || null,
          anniversary_day: annDay || null,
          pet_name: petName || null,
          pet_birthday_month: petBdMonth || null,
          pet_birthday_day: petBdDay || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return }
      setSuccess(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setPending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid #e5e7eb", borderRadius: 12,
    padding: "12px 16px", fontSize: 14, color: "#111",
    outline: "none", background: "white",
  }
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 6 }
  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: `${primaryColor}15`, border: `2px solid ${primaryColor}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#111" }}>You&apos;re on the list!</h2>
        <p style={{ margin: 0, fontSize: 14, color: "#666", lineHeight: 1.6 }}>
          Thanks for joining {companyName}. We&apos;ll be in touch with updates, specials, and more.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <label style={labelStyle}>Full Name <span style={{ color: primaryColor }}>*</span></label>
        <input style={inputStyle} type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
      </div>

      <div>
        <label style={labelStyle}>Email</label>
        <input style={inputStyle} type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>

      <div>
        <label style={labelStyle}>Phone</label>
        <input style={inputStyle} type="tel" placeholder="(555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
      </div>

      {cfg.birthday && (
        <div>
          <label style={labelStyle}>Your Birthday <span style={{ fontWeight: 400, color: "#888" }}>(day and month — no year needed)</span></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select style={selectStyle} value={bdMonth} onChange={e => { setBdMonth(e.target.value); setBdDay("") }}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
            <select style={selectStyle} value={bdDay} onChange={e => setBdDay(e.target.value)} disabled={!bdMonth}>
              <option value="">Day</option>
              {bdMonth && Array.from({ length: getDaysInMonth(Number(bdMonth)) }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {cfg.anniversary && (
        <div>
          <label style={labelStyle}>Anniversary <span style={{ fontWeight: 400, color: "#888" }}>(optional)</span></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select style={selectStyle} value={annMonth} onChange={e => { setAnnMonth(e.target.value); setAnnDay("") }}>
              <option value="">Month</option>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
            <select style={selectStyle} value={annDay} onChange={e => setAnnDay(e.target.value)} disabled={!annMonth}>
              <option value="">Day</option>
              {annMonth && Array.from({ length: getDaysInMonth(Number(annMonth)) }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {cfg.pet && (
        <>
          <div>
            <label style={labelStyle}>Pet&apos;s Name <span style={{ fontWeight: 400, color: "#888" }}>(optional)</span></label>
            <input style={inputStyle} type="text" placeholder="Buddy, Luna..." value={petName} onChange={e => setPetName(e.target.value)} />
          </div>
          {petName && (
            <div>
              <label style={labelStyle}>{petName}&apos;s Birthday <span style={{ fontWeight: 400, color: "#888" }}>(optional)</span></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <select style={selectStyle} value={petBdMonth} onChange={e => { setPetBdMonth(e.target.value); setPetBdDay("") }}>
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
                </select>
                <select style={selectStyle} value={petBdDay} onChange={e => setPetBdDay(e.target.value)} disabled={!petBdMonth}>
                  <option value="">Day</option>
                  {petBdMonth && Array.from({ length: getDaysInMonth(Number(petBdMonth)) }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#dc2626", padding: "10px 14px", backgroundColor: "#fef2f2", borderRadius: 10 }}>{error}</p>}

      <button
        type="submit"
        disabled={pending}
        style={{
          width: "100%", padding: "14px 0", borderRadius: 12,
          backgroundColor: primaryColor, color: "white",
          fontSize: 14, fontWeight: 800, border: "none",
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1, letterSpacing: "0.02em",
        }}
      >
        {pending ? "Joining..." : "Join the List"}
      </button>

      <p style={{ margin: 0, fontSize: 11, color: "#999", textAlign: "center", lineHeight: 1.5 }}>
        You can unsubscribe at any time. We&apos;ll never share your information.
      </p>
    </form>
  )
}
