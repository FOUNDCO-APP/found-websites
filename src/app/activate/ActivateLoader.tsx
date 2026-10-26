"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

const ActivateFlow = dynamic(() => import("./ActivateFlow"), {
  ssr: false,
  loading: () => <div style={{ backgroundColor: "#111111", minHeight: "100vh" }} />,
})

const FOUND_BLACK = "#111111"

export default function ActivateLoader() {
  const [slug, setSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | undefined>()
  const [preloadedName, setPreloadedName] = useState<string | undefined>()
  const [retryHref, setRetryHref] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Prefer sessionStorage (set by banner on click) — zero server calls needed
    const slug = params.get("slug") ?? sessionStorage.getItem("activate_slug") ?? null
    const name = sessionStorage.getItem("activate_name") ?? undefined
    const err = params.get("error") ?? undefined
    const intent = params.get("setup_intent")
    if (err === "activation_incomplete" && slug && intent) {
      const retry = new URLSearchParams({ slug, setup_intent: intent, redirect_status: "succeeded" })
      if (params.get("returnTo") === "dashboard") retry.set("returnTo", "dashboard")
      setRetryHref(`/activate/confirm?${retry.toString()}`)
    }

    // One-time use — clear so back-navigation doesn't reuse stale data
    sessionStorage.removeItem("activate_slug")
    sessionStorage.removeItem("activate_secret")
    sessionStorage.removeItem("activate_name")

    if (!slug) { window.location.href = "/"; return }
    setPreloadedName(name)
    setError(err)
    setSlug(slug)
  }, [])

  if (!slug) {
    return <div style={{ backgroundColor: FOUND_BLACK, minHeight: "100vh" }} />
  }

  // Never restart payment setup while an earlier confirmation is unresolved.
  if (error === "activation_incomplete") {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
    return (
      <main style={{ minHeight: "100dvh", backgroundColor: FOUND_BLACK, color: "white",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, marginBottom: 16 }}>Let&apos;s check your activation.</h1>
          <p style={{ lineHeight: 1.6, color: "rgba(255,255,255,0.7)", marginBottom: 24 }}>
            We couldn&apos;t finish checking your activation. You don&apos;t need to enter your card again.
          </p>
          {retryHref && <a href={retryHref} style={{ display: "block", padding: "16px 20px", textAlign: "center",
            backgroundColor: "#32D074", color: FOUND_BLACK, borderRadius: 8, fontWeight: 700,
            textDecoration: "none", marginBottom: 20 }}>Check again</a>}
          <a href={`https://my.${rootDomain}/login`} style={{ display: "block", textAlign: "center", color: "white" }}>
            Open your dashboard
          </a>
        </div>
      </main>
    )
  }

  return (
    <ActivateFlow
      slug={slug}
      error={error === "payment_failed" ? "Your payment setup wasn't completed. Please try again." : error}
      preloadedName={preloadedName}
    />
  )
}
