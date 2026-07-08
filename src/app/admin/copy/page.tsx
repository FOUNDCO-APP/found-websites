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

  if (!isAuthed) redirect("/admin")

  const sites = await getSitesNeedingCopy()

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080A09" }}>
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/admin"
                className="text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                ← Admin
              </Link>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
              <Link href="/admin/emails"
                className="text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                Email Preview
              </Link>
            </div>
            <h1 className="text-3xl font-black" style={{ color: "#ffffff" }}>Copy Review</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              All sites — regenerate copy on any of them at any time
            </p>
          </div>

          {sites.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span className="text-sm font-black" style={{ color: "rgba(255,255,255,0.5)" }}>
                {sites.length} {sites.length === 1 ? "site" : "sites"}
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
            Tap Regenerate on any site and Claude rewrites the hero, about text, tagline, and CTA — the site updates immediately. Sites marked AI show Claude-written copy; Fallback means the smart templates ran instead (Claude was unavailable at creation time).
          </p>
        </div>

      </div>
    </div>
  )
}
