import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Found",
  description: "Your business dashboard",
  manifest: "/dashboard-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Found",
    startupImage: [
      { url: "/icons/found-pwa-splash-828x1792.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/icons/found-pwa-splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/icons/found-pwa-splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/icons/found-pwa-splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/icons/found-pwa-splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/icons/found-pwa-splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/icons/found-pwa-splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    ],
  },
  icons: {
    icon: [
      { url: "/icons/found-app-icon-v3-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/found-app-icon-v3-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/found-app-icon-v3-180.png",
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
