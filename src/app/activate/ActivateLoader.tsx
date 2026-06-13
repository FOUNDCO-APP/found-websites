"use client"

import dynamic from "next/dynamic"

const ActivateFlow = dynamic(() => import("./ActivateFlow"), { ssr: false })

export default function ActivateLoader({ slug, error }: { slug: string; error?: string }) {
  return <ActivateFlow slug={slug} error={error} />
}
