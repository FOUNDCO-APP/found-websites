"use client"
import { useState } from "react"
import { adminLogin } from "./actions"

export default function AdminLogin() {
  const [key, setKey] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(false)
    const ok = await adminLogin(key)
    if (ok) window.location.reload()
    else { setError(true); setLoading(false) }
  }
  return (
    <div className="hq-login">
      <div className="hq-login-panel">
        <p className="hq-eyebrow">Found HQ</p>
        <h1 className="hq-title">Operator access</h1>
        <p className="hq-subtitle">Enter your private access key.</p>
        <form onSubmit={handleSubmit} className="hq-login-form">
          <input className="hq-input" type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Access key" autoFocus />
          {error && <p className="hq-login-error">That key did not work.</p>}
          <button type="submit" disabled={loading || !key} className="hq-button hq-button-primary">{loading ? "Checking..." : "Continue"}</button>
        </form>
      </div>
    </div>
  )
}
