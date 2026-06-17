"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"

// Handles implicit flow — Supabase redirects here with #access_token in the hash
// Also handles ?token_hash= (email OTP flow)
export default function AuthConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        router.replace("/")
      }
    })

    // Also try getSession in case already set
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/")
    })
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
        }}/>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Signing you in…</p>
      </div>
    </div>
  )
}
