import type { Company } from "./company"

export type LayoutProps = {
  company: Company
  activeAddons: string[]
  imgs: string[]
  gradient: string
  heroImage: string | null
  heroVideo: string | null
  uploadedImgs?: string[]
}
