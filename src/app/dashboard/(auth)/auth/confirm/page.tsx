"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function handleAuth() {
      // Parse hash fragment — Supabase implicit flow sends #access_token=...&refresh_token=...
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (!error) {
          // Small pause to ensure cookies are written before server-side middleware checks
          await new Promise(r => setTimeout(r, 300))
          window.location.href = "/"
          return
        }
      }

      // Fallback: already have a session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.href = "/"
        return
      }

      window.location.href = "/login?error=auth_failed"
    }

    handleAuth()
  }, [router])

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#080A09",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          backgroundColor: "#32D074",
          boxShadow: "0 0 12px #32D074",
          margin: "0 auto 20px",
          animation: "pulse 1.5s ease-in-out infinite",
        }}/>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, margin: 0 }}>
          Signing you in…
        </p>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>
    </div>
  )
}
