import type { Metadata, Viewport } from "next"
import {
  Inter,
  Oswald,
  Playfair_Display,
  Lato,
  Space_Grotesk,
  DM_Sans,
  Merriweather,
  Source_Sans_3,
} from "next/font/google"
import { headers } from "next/headers"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", weight: ["500", "600", "700"] })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["400", "600", "700"] })
const lato = Lato({ subsets: ["latin"], variable: "--font-lato", weight: ["400", "700"] })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" })
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" })
const merriweather = Merriweather({ subsets: ["latin"], variable: "--font-merriweather", weight: ["400", "700"] })
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans", weight: ["400", "600", "700"] })

export const viewport: Viewport = {
  themeColor: "#080A09",
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "FOUND",
  description: "Get Found.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Set by middleware only for foundco.app / www.foundco.app requests - never
  // true for tenant sites (my.foundco.app, admin.foundco.app, or any
  // customer subdomain/custom domain). Keeps Found's own site analytics
  // separate from every tenant's traffic.
  const isRootSite = (await headers()).get("x-found-root-site") === "1"

  return (
    <html lang="en" className="h-full antialiased">
      <body className={[
        inter.variable,
        oswald.variable,
        playfair.variable,
        lato.variable,
        spaceGrotesk.variable,
        dmSans.variable,
        merriweather.variable,
        sourceSans.variable,
        inter.className,
        "min-h-full flex flex-col",
      ].join(" ")}>
        {children}
        {isRootSite && <Analytics />}
      </body>
    </html>
  )
}
