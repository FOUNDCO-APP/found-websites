import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getSitesNeedingCopy } from "./actions"
import CopyRegenPanel from "./CopyRegenPanel"

export const metadata = { title: "Copy Review — Found Admin" }

export default async function AdminCopyPage() {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  const isAuthed = !!adminKey && adminKey === process.env.ADMIN_KEY

  if (!isAuthed) redirect("/admin/photos")

  const sites = await getSitesNeedingCopy()

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080A09" }}>
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/admin/photos"
                className="text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                ← Admin
              </Link>
            </div>
            <h1 className="text-3xl font-black" style={{ color: "#ffffff" }}>Copy Review</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Sites that used fallback templates instead of Claude
            </p>
          </div>

          {sites.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: "rgba(255,180,0,0.12)", border: "1px solid rgba(255,180,0,0.25)" }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ffb400" }} />
              <span className="text-sm font-black" style={{ color: "#ffb400" }}>
                {sites.length} need{sites.length === 1 ? "s" : ""} attention
              </span>
            </div>
          )}
        </div>

        <CopyRegenPanel initialSites={sites} />

        {/* What this means */}
        <div className="mt-12 p-5 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            How this works
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
            When a new site is created, Found calls Claude to write custom copy. If Claude was unavailable (API down, key issue, network error), smart fallback templates ran instead. Those sites are flagged here. Tap Regenerate and Claude rewrites the hero, about text, tagline, and CTA — the site updates immediately.
          </p>
        </div>

      </div>
    </div>
  )
}
