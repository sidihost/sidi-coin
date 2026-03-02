import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sidicoin Brand Assets',
  description: 'Download Sidicoin logo and welcome banner',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
