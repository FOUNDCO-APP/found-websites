"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { adminLogout } from "./adminAuth"

const SIGNAL_GREEN = "#32D074"

const NAV_ITEMS = [
  { href: "/admin", label: "Home", icon: "home" },
  { href: "/admin/businesses", label: "Businesses", icon: "businesses" },
  { href: "/admin/photos", label: "Photos", icon: "photos" },
  { href: "/admin/emails", label: "Emails", icon: "emails" },
  { href: "/admin/copy", label: "Copy", icon: "copy" },
] as const

function NavIcon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  if (name === "home") return <svg {...common}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>
  if (name === "businesses") return <svg {...common}><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M7 7V4a1 1 0 011-1h8a1 1 0 011 1v3"/></svg>
  if (name === "photos") return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  if (name === "emails") return <svg {...common}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  if (name === "signout") return <svg {...common}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#080A09", display: "flex" }}>
      {/* Sidebar — desktop, bottom bar — mobile. Sticky + z-index (not fixed +
          contain-layout) so the page keeps normal document scroll and any
          position:fixed bar a wrapped page renders (e.g. PhotoCurator's) stays
          correctly pinned to the true viewport during scroll - only the paint
          order changes, so the sidebar draws on top instead of colliding.
          All layout-affecting rules live in the <style> block below so the
          media query can win; inline style here is colors/spacing only. */}
      <aside className="found-hq-sidebar">
        <div className="found-hq-logo">
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: SIGNAL_GREEN, marginBottom: 2 }}>Found</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "white" }}>HQ</div>
        </div>

        <nav className="found-hq-nav">
          {NAV_ITEMS.map(item => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className="found-hq-navlink" style={{
                backgroundColor: active ? `${SIGNAL_GREEN}14` : "transparent",
                color: active ? SIGNAL_GREEN : "rgba(255,255,255,0.55)",
              }}>
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            )
          })}

          <form action={adminLogout} className="found-hq-signout-form">
            <button type="submit" className="found-hq-navlink found-hq-signout-btn">
              <NavIcon name="signout" />
              <span>Sign out</span>
            </button>
          </form>
        </nav>
      </aside>

      {/* Main content - normal document flow/scroll, same as every page before
          it was wrapped in this shell. */}
      <main className="found-hq-main" style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>

      <style>{`
        .found-hq-sidebar {
          width: 220px; flex-shrink: 0; border-right: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column; padding: 24px 16px;
          position: sticky; top: 0; height: 100dvh; overflow-y: auto; z-index: 50;
        }
        .found-hq-logo { padding: 0 8px; margin-bottom: 28px; }
        .found-hq-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .found-hq-navlink {
          display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px;
          text-decoration: none; font-size: 13px; font-weight: 700;
          border: none; width: 100%; text-align: left; background: none; cursor: pointer;
        }
        .found-hq-signout-form { margin-top: auto; }
        .found-hq-signout-btn { color: rgba(255,255,255,0.4); }

        @media (max-width: 720px) {
          .found-hq-sidebar {
            position: fixed; bottom: 0; left: 0; right: 0; top: auto; width: 100%;
            height: auto; /* base rule sets height:100dvh for the desktop sticky
              sidebar - must be reset here or this fixed bar's hit box silently
              covers the entire screen and swallows every tap on the page. */
            flex-direction: row; padding: 6px 4px calc(env(safe-area-inset-bottom, 0px) + 6px);
            border-right: none; border-top: 1px solid rgba(255,255,255,0.07);
            background-color: #080A09; z-index: 50;
          }
          .found-hq-logo { display: none; }
          .found-hq-nav {
            flex-direction: row; justify-content: space-around; align-items: center;
            width: 100%; gap: 0;
          }
          .found-hq-navlink { flex-direction: column; gap: 3px; padding: 6px 4px; }
          .found-hq-navlink span { font-size: 9.5px; }
          .found-hq-signout-form { margin-top: 0; }
          .found-hq-main { padding-bottom: 72px; }

          /* PhotoCurator's own fixed bottom action bar would otherwise sit
             directly under this bottom nav on mobile - lift it clear. */
          .found-hq-bottom-bar { bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important; }
        }
      `}</style>
    </div>
  )
}
