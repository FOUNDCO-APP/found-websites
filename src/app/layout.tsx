import type { Metadata } from "next"
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
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", weight: ["500", "600", "700"] })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["400", "600", "700"] })
const lato = Lato({ subsets: ["latin"], variable: "--font-lato", weight: ["400", "700"] })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" })
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" })
const merriweather = Merriweather({ subsets: ["latin"], variable: "--font-merriweather", weight: ["400", "700"] })
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans", weight: ["400", "600", "700"] })

export const metadata: Metadata = {
  title: "FOUND",
  description: "Get Found.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      </body>
    </html>
  )
}
