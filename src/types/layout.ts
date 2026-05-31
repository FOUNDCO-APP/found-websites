import type { Company } from "./company"

export type LayoutProps = {
  company: Company
  imgs: string[]
  gradient: string
  heroImage: string | null
  heroVideo: string | null
}
