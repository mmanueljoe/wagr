import { SiteFooter } from '@/components/landing/site-footer'
import Link from 'next/link'

export const metadata = {
  title: 'Terms — Wagr',
}

export default function TermsPage() {
  return (
    <main className="flex-1 px-6 sm:px-8">
      <article className="max-w-[640px] mx-auto pt-16 sm:pt-24 pb-12 font-body text-[15px] leading-relaxed text-wagr-black">
        <p className="text-sm text-wagr-gray mb-14">
          <Link href="/" className="hover:text-wagr-navy transition-colors">
            ← Wagr
          </Link>
        </p>

        <h1 className="font-heading text-2xl font-medium text-wagr-navy mb-6">Terms</h1>

        <p className="mb-4">
          This page is a placeholder. The full Wagr terms of service land before the production
          launch in 2026 and will cover the employer agreement, the worker agreement, fee structure,
          dispute handling, and the limits of Wagr's responsibility when something fails in the
          Moolre or MoMo network.
        </p>

        <p className="mb-4">
          Until then: Wagr charges a 3% flat fee on the requested advance amount. The fee is
          deducted from the amount the worker receives. The employer repays the gross requested
          amount automatically on their pay-period close via Moolre Payments.
        </p>

        <p className="mb-12">
          Questions about the agreement can go to{' '}
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
