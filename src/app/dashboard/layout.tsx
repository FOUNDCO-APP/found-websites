import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Found",
  description: "Your business dashboard",
  manifest: "/dashboard-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Found",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#080A09",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
