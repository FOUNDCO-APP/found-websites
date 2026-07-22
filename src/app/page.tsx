import type { Metadata } from "next"
import HomeClient from "./HomeClient"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const TITLE = "Found — Your Website, Built and Managed From Your Phone"
const DESCRIPTION = "Answer a few questions and Found builds your site, writes your copy, and picks your photos — tuned to your trade and your town. Leads, bookings, and estimates, all from your phone. Most owners are live the same day."

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
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function Home() {
  return <HomeClient />
}
