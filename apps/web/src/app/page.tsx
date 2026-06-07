/**
 * Scaffold placeholder for [next-scaffold]. Real landing page lands with [landing-structure].
 * Purpose right now: prove that Tailwind v4 tokens, fonts, and the build pipeline all work.
 */
export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center">
        <p className="font-heading text-sm uppercase tracking-wider text-wagr-gray">
          Scaffold smoke test
        </p>
        <h1 className="mt-3 font-heading text-5xl font-semibold text-wagr-navy">
          Don’t wait for <span className="text-wagr-gold">payday.</span>
        </h1>
        <p className="mt-6 font-body text-lg text-wagr-gray">
          Wagr is a Wagr web scaffold (Next 16 + Tailwind v4 + shadcn/ui). The real landing page
          lands with the <code className="font-mono text-wagr-navy">[landing-structure]</code>{' '}
          story.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <button
            type="button"
            className="rounded-wagr bg-wagr-navy px-6 py-3 font-heading text-sm font-medium text-white transition hover:bg-wagr-navy-light"
          >
            Primary action
          </button>
          <button
            type="button"
            className="rounded-wagr bg-wagr-gold px-6 py-3 font-heading text-sm font-medium text-wagr-navy transition hover:bg-wagr-gold-light"
          >
            Accent action
          </button>
        </div>
      </div>
    </main>
  )
}
