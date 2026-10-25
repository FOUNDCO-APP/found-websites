import type { Metadata } from "next"
import HomeClient from "./HomeClient"

export const dynamic = "force-dynamic"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const TITLE = "Get Found. Manage What Comes Next. | Found"
const DESCRIPTION = "Answer a few questions, review your site, then activate when ready. Found builds your pages, copy, and photos around your business. Custom-domain setup can take longer."
const OG_IMAGE = "/images/found-og-home.png"

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(`https://${ROOT_DOMAIN}`),
  alternates: { canonical: `https://${ROOT_DOMAIN}` },
  openGraph: {
    type: "website",
    url: `https://${ROOT_DOMAIN}`,
    siteName: "Found",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Found - Get found. Get jobs.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
}

export default function Home() {
  return <HomeClient />
}
