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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const s = params.get("slug")
    const e = params.get("error") ?? undefined
    if (!s) { window.location.href = "/"; return }
    setError(e)
    setSlug(s)
  }, [])

  // Show dark background immediately while slug is read — no flash of white
  if (!slug) {
    return <div style={{ backgroundColor: FOUND_BLACK, minHeight: "100vh" }} />
  }

  return <ActivateFlow slug={slug} error={error} />
}
