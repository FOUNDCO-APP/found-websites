import { resolveDashboardIdentity } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import JSZip from "jszip"

// Owner-selected photo export - not "download everything," just whichever
// photos they picked. Zips them in memory and streams the result back;
// fine for the batch sizes an owner picks by hand, not meant for a
// thousands-of-photos bulk export. Owner-only - a worker's access is
// scoped to capturing photos, not bulk-exporting the company's library.
export async function POST(req: Request) {
  const identity = await resolveDashboardIdentity()
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })
  if (!(await requireOwnerAccess(identity.userId, identity.userEmail, company))) return NextResponse.json({ error: "Not available for your account" }, { status: 403 })

  const body = await req.json().catch(() => null)
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : []
  if (ids.length === 0) return NextResponse.json({ error: "No photos selected" }, { status: 400 })

  const admin = createAdminClient()
  const { data: photos } = await admin
    .from("company_photos")
    .select("id, url, storage_path")
    .eq("company_id", company.id)
    .in("id", ids)

  if (!photos || photos.length === 0) return NextResponse.json({ error: "No matching photos" }, { status: 404 })

  const zip = new JSZip()
  await Promise.all(photos.map(async (photo, index) => {
    try {
      const res = await fetch(photo.url)
      if (!res.ok) return
      const buffer = await res.arrayBuffer()
      const ext = photo.storage_path?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"
      zip.file(`photo-${index + 1}.${ext}`, buffer)
    } catch {
      // Skip a photo that fails to fetch rather than failing the whole export
    }
  }))

  const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" })
  const zipBlob = new Blob([zipArrayBuffer], { type: "application/zip" })

  return new NextResponse(zipBlob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${company.slug}-photos.zip"`,
    },
  })
}
