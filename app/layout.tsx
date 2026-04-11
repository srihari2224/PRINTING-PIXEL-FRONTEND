import type { Metadata } from "next"
import { Inter, Space_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "PRINTIT — Self-Service Printing Kiosk",
  description: "Upload, configure, pay and print — all in under 2 minutes.",
  verification: {
    google: "Qt0kT2_TqzEGpxDQGsmb4YtfCbtHYESjFkpnt81ZmXU",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://printing-pixel-1.onrender.com" />
        <link rel="preconnect" href="https://kiosk-backend-t1mi.onrender.com" />
        <link rel="dns-prefetch" href="https://printing-pixel-1.onrender.com" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}