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
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import FoundPostHogProvider from "@/components/FoundPostHogProvider"
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
  width: "device-width",
  initialScale: 1,
  themeColor: "#080A09",
  viewportFit: "cover",
}

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "y0u9dw7ln4"

// Fallback for any root-domain page that doesn't set its own metadata (e.g.
// src/app/page.tsx sets richer page-specific metadata that overrides this).
export const metadata: Metadata = {
  title: { default: "Found — Get Found. Get Hired.", template: "%s — Found" },
  description: "Found builds your website, writes your copy, and picks your photos — all from your phone. Most owners are live the same day.",
  metadataBase: new URL(`https://${ROOT_DOMAIN}`),
  icons: {
    icon: [
      { url: "/icons/found-app-icon-v3-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/found-app-icon-v3-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/found-app-icon-v3-32.png",
    apple: "/icons/found-app-icon-v3-180.png",
  },
}


function rootSiteSchema(rootDomain: string) {
  const origin = `https://${rootDomain}`
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "Found",
        url: origin,
        logo: `${origin}/icons/found-app-icon-v3-512.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "Found",
        url: origin,
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#software`,
        name: "Found",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        url: origin,
        description: "Found builds websites and mobile business tools for local businesses, including leads, photos, online ordering, bookings, estimates, and payments.",
        offers: {
          "@type": "Offer",
          priceCurrency: "USD",
          price: "29",
          url: `${origin}/plans`,
        },
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  }
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Set by middleware only for foundco.app / www.foundco.app requests - never
  // true for tenant sites (my.foundco.app, admin.foundco.app, or any
  // customer subdomain/custom domain). Keeps Found's own site analytics
  // separate from every tenant's traffic.
  const isRootSite = (await headers()).get("x-found-root-site") === "1"

  return (
    <html lang="en" className="h-full antialiased" style={{ backgroundColor: "#080A09" }}>
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
      ].join(" ")} style={{ backgroundColor: "#080A09" }}>
        {children}
        {isRootSite && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(rootSiteSchema(ROOT_DOMAIN)) }} />
        )}
        {isRootSite && <Analytics />}
        {isRootSite && <FoundPostHogProvider />}
        {isRootSite && CLARITY_PROJECT_ID && (
          <Script id="found-clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
            `}
          </Script>
        )}
      </body>
    </html>
  )
}
