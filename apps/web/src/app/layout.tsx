import { QueryProvider } from '@/components/shared/query-provider'
import { Toaster } from '@/components/ui/sonner'
import { env } from '@/lib/env'
import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

const inter = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500'],
})

// The || fallback looks redundant against the zod default, but CI builds
// with SKIP_ENV_VALIDATION=1 which bypasses zod entirely — without it,
// new URL(undefined) kills `next build` in the runner.
const SITE_URL = env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const TITLE = 'Wagr — Don’t wait for payday'
const DESCRIPTION =
  'Earned-wage-access for Ghanaian SME workers. Access wages you have already earned, via USSD, in under 60 seconds.'

// openGraph + twitter drive the link preview when the voting-campaign link
// is shared on WhatsApp and X. The card image comes from opengraph-image.tsx
// (twitter inherits it via the resolver).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    siteName: 'Wagr',
    locale: 'en_GH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col font-body bg-wagr-white text-wagr-black"
      >
        <QueryProvider>{children}</QueryProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
