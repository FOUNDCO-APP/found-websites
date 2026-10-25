import type { ReactNode } from "react"
import SiteNav from "@/components/SiteNav"
import SiteFooter from "@/components/SiteFooter"

export default function MarketingInfoPage({ title, description, children }: {
  title: string; description: ReactNode; children: ReactNode
}) {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: "#080A09" }}>
      <SiteNav />
      <main>
        <header className="px-6 pt-36 pb-12 md:px-10 max-w-3xl mx-auto">
          <h1 className="text-4xl font-normal leading-tight md:text-6xl text-white mb-5">{title}</h1>
          <div className="text-base text-white/55 font-medium leading-8">{description}</div>
        </header>
        <div className="px-6 pb-24 md:px-10 max-w-3xl mx-auto space-y-12 text-base font-medium leading-8 text-white/55">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
