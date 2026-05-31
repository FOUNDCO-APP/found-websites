import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createClient } from "@/lib/supabase/server"
import { heroGradient } from "@/lib/color"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { getCompanyBySlug, getCompanyByDomain } = await import("@/lib/company")
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  return { title: company ? `Our Work | ${company.name}` : "Gallery" }
}

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const supabase = await createClient()
  const { data: photos } = await supabase
    .from("media")
    .select("id, url, thumbnail_url, type")
    .eq("company_id", company.id)
    .eq("website_flag", true)
    .eq("type", "photo")
    .order("gallery_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  const primary = company.primary_color
  const gradient = heroGradient(primary)

  return (
    <>
      <section className="py-24 text-white" style={{ background: gradient }}>
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: primary }}>Our Work</p>
          <h1 className="text-5xl md:text-6xl font-black mb-5" style={{ fontFamily: "var(--font-heading, inherit)" }}>Gallery</h1>
          <p className="text-lg" style={{ color: "#888888" }}>Real work. Real results.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          {photos && photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="aspect-square overflow-hidden bg-gray-100"
                  style={{ borderRadius: "var(--card-radius, 10px)" }}>
                  <img
                    src={photo.thumbnail_url || photo.url}
                    alt="Project photo"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-12 h-1 mb-10" style={{ backgroundColor: primary }} />
              <p className="text-2xl font-black mb-4"
                style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                Photos Coming Soon
              </p>
              <p className="text-base max-w-sm mb-10" style={{ color: "#888888" }}>
                We&apos;re documenting our latest work. Check back soon — or reach out to see examples directly.
              </p>
              <a href={`tel:${company.phone?.replace(/\D/g, "") || ""}`}
                className="btn text-white"
                style={{ backgroundColor: primary, borderColor: primary }}>
                {company.phone || "Contact Us"}
              </a>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
