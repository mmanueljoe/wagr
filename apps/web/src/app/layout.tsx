import { QueryProvider } from '@/components/shared/query-provider'
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

export const metadata: Metadata = {
  title: 'Wagr — Don’t wait for payday',
  description:
    'Earned-wage-access for Ghanaian SME workers. Access wages you have already earned, via USSD, in under 60 seconds.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-body bg-wagr-white text-wagr-black">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
