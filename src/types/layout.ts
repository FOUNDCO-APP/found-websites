import type { Company } from "./company"
import type { CTA } from "@/lib/industryCTAs"
import type { PublicLocation } from "@/components/layouts/FindUsSection"

export type SectionImages = {
  hero?: string | null
  about?: string | null
  cta?: string | null
  gallery?: string[]
}

export type LayoutProps = {
  company: Company
  activeAddons: string[]
  supportingCTA: CTA | null
  imgs: string[]
  gradient: string
  heroImage: string | null
  heroVideo: string | null
  uploadedImgs?: string[]
  sectionImages?: SectionImages
  locations?: PublicLocation[]
}
