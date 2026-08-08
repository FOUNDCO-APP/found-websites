"use client"

import { useEffect, useState } from "react"
import InView from "@/components/InView"
import SubscribeForm from "@/app/[slug]/subscribe/SubscribeForm"
import type { Company } from "@/types/company"

export default function EmailSignupSection({
  company,
  activeAddons,
}: {
  company: Company
  activeAddons: string[]
}) {
  const [open, setOpen] = useState(false)
  const primary = company.primary_color || "#22C55E"
  const hasEmailMarketing = activeAddons.includes("email_marketing")

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  if (!hasEmailMarketing) return null

  return (
    <section className="border-t border-black/10 bg-white py-16 md:py-20">
      <InView distance={18}>
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: primary }}>
              Updates
            </p>
            <h2
              className="text-3xl font-black leading-tight text-black md:text-5xl"
              style={{ fontFamily: "var(--font-heading, inherit)" }}
            >
              Stay in the loop.
            </h2>
            <p className="mt-4 text-base leading-7 text-black/60 md:text-lg">
              Get updates, specials, and reminders from {company.name}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            Join the List
          </button>
        </div>
      </InView>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm md:items-center md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-signup-title"
        >
          <button
            type="button"
            aria-label="Close signup"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="relative max-h-[92vh] w-full overflow-auto rounded-t-[28px] bg-white p-6 shadow-2xl md:max-w-lg md:rounded-[28px] md:p-8">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-2xl leading-none text-black/60"
            >
              ×
            </button>
            <p className="mb-3 pr-12 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: primary }}>
              {company.name}
            </p>
            <h2 id="email-signup-title" className="pr-12 text-3xl font-black leading-tight text-black">
              Stay in the loop.
            </h2>
            <p className="mb-6 mt-3 text-sm leading-6 text-black/60">
              Get updates, specials, and reminders from {company.name}.
            </p>
            <SubscribeForm
              companyId={company.id}
              primaryColor={primary}
              industry={company.industry_category ?? null}
              companyName={company.name}
            />
          </div>
        </div>
      )}
    </section>
  )
}
