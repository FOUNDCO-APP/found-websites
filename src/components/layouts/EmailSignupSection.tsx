import Link from "next/link"
import InView from "@/components/InView"
import type { Company } from "@/types/company"

export default function EmailSignupSection({
  company,
  activeAddons,
}: {
  company: Company
  activeAddons: string[]
}) {
  if (!activeAddons.includes("email_marketing")) return null

  const primary = company.primary_color || "#22C55E"

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
          <Link
            href="/subscribe"
            className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            Join the List
          </Link>
        </div>
      </InView>
    </section>
  )
}
