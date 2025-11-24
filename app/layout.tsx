import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Place Finder - Discover Great Places Near You",
  description:
    "Find and explore places in your area using OpenStreetMap. Get directions, view details, and discover your next favorite coffee spot.",
  keywords: ["Place finder", "coffee shops", "places near me", "coffee", "openstreetmap"],
  authors: [{ name: "place Finder" }],
  creator: "Carey Aboagye Osafo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Place Finder",
  },
  icons: {
    icon: [
      {
        url: "/icon-192.jpg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-192.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon-512.jpg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#8b5cf6" },
    { media: "(prefers-color-scheme: dark)", color: "#8b5cf6" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
