"use client"
import { useState } from "react"
import { adminLogin } from "./actions"

export default function AdminLogin() {
  const [key, setKey] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    const ok = await adminLogin(key)
    if (ok) {
      window.location.reload()
    } else {
      setError(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center px-8">
      <div className="w-full max-w-sm">
        <p className="text-xs font-black tracking-widest uppercase mb-6 text-center" style={{ color: "#2E7D32" }}>
          Found Co.
        </p>
        <h1 className="text-3xl font-black text-white text-center mb-10">Admin</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="Access key"
            className="w-full px-5 py-4 bg-white/10 text-white placeholder-white/30 rounded-lg border border-white/10 focus:outline-none focus:border-white/40 text-base"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-400 text-center">Wrong key. Try again.</p>
          )}
          <button
            type="submit"
            disabled={loading || !key}
            className="w-full py-4 font-black text-sm uppercase tracking-widest rounded-lg transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#2E7D32", color: "#ffffff" }}
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </div>
  )
}
