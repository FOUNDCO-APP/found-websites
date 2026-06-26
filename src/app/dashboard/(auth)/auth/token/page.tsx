"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function AuthTokenPage() {
  useEffect(() => {
    const supabase = createClient()

    async function handle() {
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
          // Hard redirect so middleware sees fresh cookie
          await new Promise(r => setTimeout(r, 200))
          window.location.href = "/auth/set-password"
          return
        }
        // Token failed — sign out any stale session so we never land on the wrong account
        await supabase.auth.signOut()
        window.location.href = "/login?error=link_expired"
        return
      }

      // No tokens in hash — this page was reached incorrectly
      window.location.href = "/login?error=auth_failed"
    }

    handle()
  }, [])

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
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      </div>
    </div>
  )
}
