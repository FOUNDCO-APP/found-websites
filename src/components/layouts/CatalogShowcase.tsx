import Link from "next/link"
import type { Company, MenuItem } from "@/types/company"

type ShowcaseItem = MenuItem & { category: string }

function isFoodBusiness(company: Company) {
  const label = `${company.industry_category ?? ""} ${company.sub_industry ?? ""} ${company.primary_intent ?? ""}`.toLowerCase()
  return /food|restaurant|cafe|coffee|taco|menu|reserve|bar|bakery/.test(label)
}

function itemImage(item: MenuItem) {
  return item.photo_url || item.images?.find(Boolean) || null
}

function parsePrice(price: string | null | undefined) {
  if (!price) return ""
  const match = price.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/)
  if (!match) return price
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(match[1]))
}

export default function CatalogShowcase({ company }: { company: Company }) {
  const config = company.website_config
  const primary = company.primary_color
  const isFood = isFoodBusiness(company)
  const rows: ShowcaseItem[] = []

  for (const category of config?.menu_items ?? []) {
    for (const item of category.items ?? []) {
      if (!item.name || !itemImage(item)) continue
      rows.push({ ...item, category: category.category })
    }
  }

  if (rows.length === 0) return null

  const href = isFood ? "/menu" : "/shop"
  const eyebrow = isFood ? "From the menu" : "From the shop"
  const title = isFood ? "A taste of what is ready" : "A closer look at what they carry"
  const linkLabel = isFood ? "View full menu" : "Shop all products"
  const items = rows.slice(0, 10)
  const loop = items.length >= 4 ? [...items, ...items] : items

  return (
    <section className="overflow-hidden bg-white py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em]" style={{ color: primary }}>{eyebrow}</p>
            <h2 className="max-w-2xl text-4xl font-black leading-none text-neutral-950 md:text-5xl" style={{ fontFamily: "var(--font-heading, inherit)" }}>{title}</h2>
          </div>
          <Link href={href} className="text-sm font-black uppercase tracking-[0.16em] transition-opacity hover:opacity-70" style={{ color: primary }}>
            {linkLabel} →
          </Link>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent md:w-28" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent md:w-28" />
        <div className={items.length >= 4 ? "flex w-max gap-4 px-6 catalog-showcase-track md:gap-5 md:px-8" : "flex gap-4 overflow-x-auto px-6 pb-2 md:gap-5 md:px-8"}>
          {loop.map((item, index) => {
            const image = itemImage(item)
            return (
              <Link key={`${item.category}-${item.name}-${index}`} href={href} className="group block w-[74vw] max-w-[320px] shrink-0 overflow-hidden rounded-[28px] border border-neutral-200 bg-white text-left shadow-[0_18px_50px_rgba(0,0,0,0.08)] md:w-[300px]" style={{ textDecoration: "none" }}>
                <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
                  {image && <img src={image} alt={item.name} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 pt-16">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/72">{item.category}</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-black leading-tight text-neutral-950" style={{ fontFamily: "var(--font-heading, inherit)" }}>{item.name}</h3>
                    {item.price && <p className="shrink-0 text-sm font-black" style={{ color: primary }}>{parsePrice(item.price)}</p>}
                  </div>
                  {item.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-600">{item.description}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}