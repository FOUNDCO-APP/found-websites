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
  const [preloadedSecret, setPreloadedSecret] = useState<string | undefined>()
  const [preloadedName, setPreloadedName] = useState<string | undefined>()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Prefer sessionStorage (set by banner on click) — zero server calls needed
    const slug = params.get("slug") ?? sessionStorage.getItem("activate_slug") ?? null
    const secret = sessionStorage.getItem("activate_secret") ?? undefined
    const name = sessionStorage.getItem("activate_name") ?? undefined
    const err = params.get("error") ?? undefined

    // One-time use — clear so back-navigation doesn't reuse stale data
    sessionStorage.removeItem("activate_slug")
    sessionStorage.removeItem("activate_secret")
    sessionStorage.removeItem("activate_name")

    if (!slug) { window.location.href = "/"; return }

    setPreloadedSecret(secret)
    setPreloadedName(name)
    setError(err)
    setSlug(slug)
  }, [])

  if (!slug) {
    return <div style={{ backgroundColor: FOUND_BLACK, minHeight: "100vh" }} />
  }

  return (
    <ActivateFlow
      slug={slug}
      error={error}
      preloadedSecret={preloadedSecret}
      preloadedName={preloadedName}
    />
  )
}
