"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Company } from "@/types/company"
import { intentLabel, intentHref } from "@/types/company"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { logoColor } from "@/lib/color"

function BrandMark({ name, color, vibe }: { name: string; color: string; vibe: string }) {
  const len = name.length
  const isSoftBrand = vibe === "calm" || vibe === "warm"
  const fontSize = isSoftBrand
    ? len > 20 ? "text-lg lg:text-[1.65rem]" : len > 14 ? "text-2xl lg:text-[2.15rem]" : "text-3xl lg:text-[2.45rem]"
    : len > 20 ? "text-lg lg:text-xl" : len > 14 ? "text-2xl lg:text-3xl" : "text-3xl lg:text-4xl"
  const tracking = isSoftBrand ? "tracking-[0.035em]" : len > 20 ? "tracking-wide" : len > 14 ? "tracking-wider" : "tracking-[0.12em]"
  const weight = isSoftBrand ? "font-semibold" : "font-black"
  const casing = isSoftBrand ? "" : "uppercase"

  return (
    <span
      className={`${fontSize} ${tracking} ${weight} ${casing} leading-none`}
      style={{ color, fontFamily: "var(--font-heading, inherit)" }}
    >
      {name}
    </span>
  )
}

const FOOD_INDUSTRIES = new Set(["food", "home_based_food"])
const PRODUCT_LABEL_INDUSTRIES = new Set(["beauty", "wellness"])

function shopNavLabel(industryCategory: string) {
  if (FOOD_INDUSTRIES.has(industryCategory)) return "Order"
  if (PRODUCT_LABEL_INDUSTRIES.has(industryCategory)) return "Products"
  return "Shop"
}

function getNavLinks(industryCategory: string, subIndustry: string | null, hasShop: boolean) {
  const isFood = FOOD_INDUSTRIES.has(industryCategory)
  const vocab = getVocab(subIndustry, industryCategory)
  return [
    { label: "Home",              href: "/" },
    { label: "About",             href: "/about" },
    isFood
      ? { label: "Menu",          href: "/menu" }
      : { label: "Services",      href: "/services" },
    // Only a real destination once shopping_cart is genuinely active -
    // otherwise there's nothing behind it to link to.
    ...(hasShop ? [{ label: shopNavLabel(industryCategory), href: "/shop" }] : []),
    { label: vocab.galleryLabel,  href: "/gallery" },
    { label: "Contact",           href: "/contact" },
  ]
}

export default function Navbar({ company, transparent = false, hasShop = false }: { company: Company; transparent?: boolean; hasShop?: boolean }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === "/"
  const isNavDark = !!company.navbar_dark
  const primary = company.primary_color
  const vibe = company.vibe || "bold"
  const isCalm = vibe === "calm" || vibe === "warm"

  useEffect(() => {
    if (!transparent) return
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [transparent])

  // Only overlay on the homepage - inner pages always get sticky navbar
  const isOverlay = transparent && isHome && !scrolled
  // isOnDark: logo and text should be white (either transparent hero or always-dark navbar)
  const isOnDark = isOverlay || isNavDark
  const showColorLogo = !isOnDark

  const isActive = (href: string) => pathname === href
  const ctaLabel = intentLabel[company.primary_intent] || "Contact Us"
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"

  const navLinkWeight = "font-medium"
  const inactiveColor = isOnDark ? "rgba(255,255,255,0.75)" : isCalm ? "#aaaaaa" : "#999999"
  const barColor = isOnDark ? "#ffffff" : isCalm ? "#555555" : "#1a1a1a"
  const brandTextColor = logoColor(isOnDark ? "dark" : "light", primary)

  return (
    <>
      <header
        className={`${transparent && isHome ? "fixed" : "sticky"} top-0 left-0 right-0 z-50 transition-all duration-[300ms]`}
        style={{
          backgroundColor: isOverlay ? "rgba(255,255,255,0)" : isNavDark ? "#111111" : "#ffffff",
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
          borderBottomColor: isOnDark ? "rgba(0,0,0,0)" : isCalm ? "#eeeeee" : "#f0f0f0",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 md:px-10">

          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            {company.logo_url || company.logo_white_url ? (
              company.logo_white_url ? (
                // Color logo appears on light nav; white logo appears over dark
                // hero/nav surfaces. Keep the swap tied to nav state so there
                // is no blank pause while scrolling.
                <div className="relative" style={{ height: "48px", width: "160px" }}>
                  {company.logo_url && (
                    <img src={company.logo_url} alt={company.name}
                      className="h-full w-auto object-contain"
                      style={{
                        opacity: showColorLogo ? 1 : 0,
                        transition: "opacity 120ms ease",
                      }} />
                  )}
                  <img src={company.logo_white_url} alt={company.name}
                    className="absolute top-0 left-0 h-full w-auto object-contain"
                    style={{
                      opacity: showColorLogo ? 0 : 1,
                      transition: "opacity 120ms ease",
                    }} />
                </div>
              ) : isOnDark ? (
                <div style={{ height: "48px", width: "160px" }}>
                  <img src={company.logo_url!} alt={company.name}
                    className="h-full w-full object-contain object-left" />
                </div>
              ) : (
                <div style={{ height: "48px", width: "160px" }}>
                  <img src={company.logo_url!} alt={company.name}
                    className="h-full w-full object-contain object-left" />
                </div>
              )
            ) : (
              <BrandMark name={company.name} color={brandTextColor} vibe={vibe} />
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7 text-xs tracking-wide uppercase">
            {getNavLinks(company.industry_category, company.sub_industry ?? null, hasShop).map((item) => (
              <Link key={item.label} href={item.href}
                className={`transition-colors ${navLinkWeight}`}
                style={{ color: isActive(item.href) && !isOnDark ? primary : inactiveColor }}>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-5 shrink-0">
            <div className="w-px h-5" style={{ backgroundColor: isOnDark ? "rgba(255,255,255,0.3)" : "#e5e5e5" }} />
            {company.phone && (
              <a href={`tel:${company.phone.replace(/\D/g, "")}`}
                className="flex items-center gap-1.5 text-sm font-black transition-colors hover:opacity-80"
                style={{ color: isOnDark ? "#ffffff" : primary }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Us
              </a>
            )}
            <Link href={ctaHref} className="btn text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {ctaLabel}
            </Link>
          </div>

          {/* Hamburger */}
          <button className="md:hidden flex flex-col justify-center items-end gap-1.5 w-10 h-10"
            onClick={() => setOpen(true)} aria-label="Open menu">
            <span className="block w-6 h-0.5 transition-colors" style={{ backgroundColor: barColor }} />
            <span className="block w-4 h-0.5 transition-colors" style={{ backgroundColor: barColor }} />
            <span className="block w-6 h-0.5 transition-colors" style={{ backgroundColor: barColor }} />
          </button>
        </div>
      </header>

      {/* Mobile menu - calm/warm gets lighter treatment */}
      {isCalm ? (
        // Calm: white slide-in panel, refined
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden"
          style={{
            transform: open ? "translateX(0)" : "translateX(100%)",
            transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
            visibility: open ? "visible" : "hidden",
            borderLeft: `2px solid ${primary}`,
          }}
        >
          <div className="flex items-center justify-between px-8 py-6" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <Link href="/" onClick={() => setOpen(false)} className="flex-shrink-0">
              {company.logo_url ? (
                <div style={{ height: "48px", width: "160px" }}>
                  <img src={company.logo_url} alt={company.name}
                    className="h-full w-full object-contain object-left" />
                </div>
              ) : (
                <BrandMark name={company.name} color={logoColor("light", primary)} vibe={vibe} />
              )}
            </Link>
            <button onClick={() => setOpen(false)} aria-label="Close menu"
              className="w-12 h-12 flex-shrink-0 flex items-center justify-center ml-4"
              style={{ border: "1px solid #cccccc", borderRadius: "50px" }}>
              <svg width="22" height="22" fill="none" stroke="#444444" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 flex flex-col justify-center px-8 gap-0">
            {getNavLinks(company.industry_category, company.sub_industry ?? null, hasShop).map((item) => (
              <Link key={item.label} href={item.href} onClick={() => setOpen(false)}
                className="py-5 text-2xl font-bold"
                style={{
                  color: isActive(item.href) ? primary : "#333333",
                  borderBottom: "1px solid #f5f5f5",
                  fontFamily: "var(--font-heading, inherit)",
                  fontStyle: "italic",
                }}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="px-8 py-10 flex flex-col gap-4" style={{ borderTop: "1px solid #f0f0f0" }}>
            {company.phone && (
              <a href={`tel:${company.phone.replace(/\D/g, "")}`}
                className="btn text-center font-black"
                style={{ borderColor: primary, color: primary }}
                onClick={() => setOpen(false)}>
                Call Us
              </a>
            )}
            <Link href={ctaHref} onClick={() => setOpen(false)}
              className="btn text-white text-center"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {ctaLabel}
            </Link>
          </div>
        </div>
      ) : (
        // Bold/Modern: dark full-screen overlay with numbered items
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{
            backgroundColor: "#111111",
            transform: open ? "translateX(0)" : "translateX(100%)",
            transition: "transform 320ms cubic-bezier(0.4, 0, 0.2, 1)",
            visibility: open ? "visible" : "hidden",
            borderLeft: `3px solid ${primary}`,
          }}
        >
          <div className="flex items-center justify-between px-8 py-6">
            <Link href="/" onClick={() => setOpen(false)}>
              {company.logo_white_url ? (
                // Use dedicated white logo directly - no filter artifacts
                <div style={{ height: "48px", width: "160px" }}>
                  <img src={company.logo_white_url} alt={company.name}
                    className="h-full w-full object-contain object-left" />
                </div>
              ) : company.logo_url ? (
                <div style={{ height: "48px", width: "160px" }}>
                  <img src={company.logo_url} alt={company.name}
                    className="h-full w-full object-contain object-left" />
                </div>
              ) : (
                <BrandMark name={company.name} color="#ffffff" vibe={vibe} />
              )}
            </Link>
            <button onClick={() => setOpen(false)} aria-label="Close menu"
              className="w-12 h-12 flex items-center justify-center border border-white/40 hover:border-white/70 transition-colors"
              style={{ borderRadius: "var(--button-radius, 6px)" }}>
              <svg width="22" height="22" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 flex flex-col justify-center px-8 gap-0">
            {getNavLinks(company.industry_category, company.sub_industry ?? null, hasShop).map((item, i) => (
              <Link key={item.label} href={item.href} onClick={() => setOpen(false)}
                className="flex items-baseline gap-5 py-5 border-b border-white/10 group hover:pl-2 transition-all duration-200"
                style={{
                  opacity: open ? 1 : 0,
                  transform: open ? "translateX(0)" : "translateX(-24px)",
                  transition: `opacity 400ms ease ${120 + i * 90}ms, transform 400ms ease ${120 + i * 90}ms`,
                }}>
                <span className="text-xs font-black tabular-nums" style={{ color: primary, letterSpacing: "0.1em" }}>
                  0{i + 1}
                </span>
                <span className="text-3xl font-black text-white group-hover:text-gray-300 transition-colors"
                  style={{ fontFamily: "var(--font-heading, inherit)" }}>
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="px-8 py-10 flex flex-col gap-4">
            {company.phone && (
              <a href={`tel:${company.phone.replace(/\D/g, "")}`}
                className="btn text-center font-black"
                style={{ borderColor: "rgba(255,255,255,0.4)", color: "#ffffff" }}
                onClick={() => setOpen(false)}>
                Call Us
              </a>
            )}
            <Link href={ctaHref} onClick={() => setOpen(false)}
              className="btn text-white text-center"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {ctaLabel}
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
