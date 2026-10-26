"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

function safeNextPath(value: string | null): string | null {
  if (!value) return null
  let decoded = value
  // Check each encoding layer; never let browser URL normalization turn a
  // protocol-relative path, backslash or control character into navigation.
  for (let layer = 0; layer < 5; layer++) {
    if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return null
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) return value
      decoded = next
    } catch {
      return null
    }
  }
  return null
}

async function withTimeout<T>(request: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Connection timed out")), 15000) }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

export default function AuthTokenPage() {
  useEffect(() => {
    async function handle() {
      try {
        const supabase = createClient()
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const accessToken = params.get("access_token")
        const refreshToken = params.get("refresh_token")

        if (params.has("error") || params.has("error_code")) {
          window.location.href = "/login?error=link_expired"
          return
        }

        if (accessToken && refreshToken) {
          const { error } = await withTimeout(supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }))
          if (!error) {
            // Hard redirect so middleware sees fresh cookie
            await new Promise(r => setTimeout(r, 200))
            const next = safeNextPath(new URLSearchParams(window.location.search).get("next"))
            window.location.href = next ?? "/auth/set-password"
            return
          }
          // Token failed — sign out any stale session so we never land on the wrong account
          try {
            await withTimeout(supabase.auth.signOut())
          } finally {
            window.location.href = "/login?error=link_expired"
          }
          return
        }

        // No tokens in hash — this page was reached incorrectly
        window.location.href = "/login?error=auth_failed"
      } catch {
        window.location.href = "/login?error=link_expired"
      }
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
