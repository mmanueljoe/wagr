import { SiteFooter } from '@/components/landing/site-footer'
import Link from 'next/link'

export const metadata = {
  title: 'Privacy — Wagr',
}

export default function PrivacyPage() {
  return (
    <main className="flex-1 px-6 sm:px-8">
      <article className="max-w-[640px] mx-auto pt-16 sm:pt-24 pb-12 font-body text-[15px] leading-relaxed text-wagr-black">
        <p className="text-sm text-wagr-gray mb-14">
          <Link href="/" className="hover:text-wagr-navy transition-colors">
            ← Wagr
          </Link>
        </p>

        <h1 className="font-heading text-2xl font-medium text-wagr-navy mb-6">Privacy</h1>

        <p className="mb-4">
          This page is a placeholder. The full Wagr privacy policy lands before the production
          launch in 2026 and will cover what personal data Wagr collects, how it is stored, how it
          is shared with Moolre and Supabase, and the rights workers and employers have over their
          own data.
        </p>

        <p className="mb-4">
          Until then: Wagr stores employer account details, employee names, MoMo numbers, and
          advance history. Advance PINs are bcrypt-hashed. Phone numbers are stored in E.164 format.
          We never log salaries or PINs.
        </p>

        <p className="mb-12">
          Questions about data handling can go to{' '}
          <a
            href="mailto:hello@wagr.gh"
            className="text-wagr-navy border-b border-wagr-navy hover:text-wagr-gold hover:border-wagr-gold transition-colors"
          >
            hello@wagr.gh
          </a>
          .
        </p>

        <SiteFooter />
      </article>
    </main>
  )
}
