import Link from "next/link"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

export default function SiteFooter() {
  return (
    <footer
      className="px-6 py-10 md:px-10"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)", backgroundColor: FOUND_BLACK }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-white/25 font-medium">
          &copy; {new Date().getFullYear()} Found Co. LLC. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <Link
            href="/terms"
            className="text-xs font-medium transition-colors hover:text-white/60"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="text-xs font-medium transition-colors hover:text-white/60"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Privacy Policy
          </Link>
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.15)" }}>
            Results vary by market and business type.
          </span>
        </div>
      </div>
    </footer>
  )
}
