"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { adminLogout } from "./adminAuth"

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: "overview", match: ["/admin"] },
  { href: "/admin/businesses", label: "Businesses", icon: "businesses", match: ["/admin/businesses"] },
  { href: "/admin/quality", label: "Quality", icon: "quality", match: ["/admin/quality", "/admin/photos", "/admin/emails", "/admin/copy"] },
  { href: "/admin/more", label: "More", icon: "more", match: ["/admin/more"] },
] as const

function NavIcon({ name }: { name: string }) {
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  if (name === "overview") return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  if (name === "businesses") return <svg {...common}><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M7 7V4a1 1 0 011-1h8a1 1 0 011 1v3"/></svg>
  if (name === "quality") return <svg {...common}><path d="M12 3l2.2 4.5L19 9l-3.5 3.4.8 4.8L12 15l-4.3 2.2.8-4.8L5 9l4.8-1.5L12 3z"/></svg>
  if (name === "signout") return <svg {...common}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  return <svg {...common}><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="found-hq-root">
      <aside className="found-hq-sidebar">
        <div className="found-hq-brand">
          <div className="found-hq-brand-name">Found HQ</div>
          <div className="found-hq-brand-label">Operator workspace</div>
        </div>
        <nav className="found-hq-nav" aria-label="Found HQ">
          {NAV_ITEMS.map((item) => {
            const active = item.match.some((path) => path === "/admin" ? pathname === path : pathname.startsWith(path))
            return (
              <Link key={item.href} href={item.href} className="found-hq-navlink" data-active={active}>
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <form action={adminLogout} className="found-hq-signout">
          <button type="submit" className="found-hq-navlink">
            <NavIcon name="signout" />
            <span>Sign out</span>
          </button>
        </form>
      </aside>
      <main className="found-hq-main">{children}</main>
    </div>
  )
}
