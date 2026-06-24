import type { Company } from "./company"
import type { CTA } from "@/lib/industryCTAs"

export type LayoutProps = {
  company: Company
  activeAddons: string[]
  supportingCTA: CTA | null
  imgs: string[]
  gradient: string
  heroImage: string | null
  heroVideo: string | null
  uploadedImgs?: string[]
}
