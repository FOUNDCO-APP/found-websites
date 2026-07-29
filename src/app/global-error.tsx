"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body
        style={{
          background: "#080A09",
          color: "#fff",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "system-ui, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 600 }}>Something went wrong.</p>
        <button
          onClick={() => reset()}
          style={{
            background: "#32D074",
            color: "#080A09",
            border: "none",
            borderRadius: 999,
            padding: "10px 24px",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
