import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="border-t border-wagr-gray-light pt-5 mt-32 flex flex-wrap items-center justify-between gap-y-3 text-xs text-wagr-gray">
      <span className="font-heading text-base font-medium text-wagr-navy">Wagr</span>

      <nav className="flex items-center gap-5">
        <Link href="/privacy" className="hover:text-wagr-navy transition-colors">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-wagr-navy transition-colors">
          Terms
        </Link>
        <a href="mailto:hello@wagr.gh" className="hover:text-wagr-navy transition-colors">
          hello@wagr.gh
        </a>
      </nav>
    </footer>
  )
}
