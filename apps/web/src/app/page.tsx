import { SiteFooter } from '@/components/landing/site-footer'
import { UssdScreen } from '@/components/landing/ussd-screen'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex-1 px-6 sm:px-8">
      <article className="max-w-[480px] mx-auto pt-16 sm:pt-24 pb-12">
        <p className="text-sm text-wagr-gray mb-14">
          Abena. Nurse at the clinic in Accra. It&apos;s the 15th.
        </p>

        <ArtifactRow timestamp="11:42">
          <SmsBubble sender="Adabraka Methodist School">
            Madam, kindly clear the GHS 300 BECE accommodation balance by Thursday. Thank you.
          </SmsBubble>
        </ArtifactRow>

        <ArtifactRow timestamp="11:44">
          <UssdScreen />
        </ArtifactRow>

        <ArtifactRow timestamp="11:45" className="mb-14">
          <MomoNotification />
        </ArtifactRow>

        <p className="font-heading text-lg font-medium text-wagr-navy mb-16 leading-snug">
          It was already hers.
        </p>

        <section className="mb-16">
          <p className="text-sm mb-2">Asking the boss is a favour.</p>
          <p className="text-sm mb-2">A loan from a sister stays.</p>
          <p className="text-sm mb-6">Waiting costs the most.</p>
          <p className="font-heading text-[17px] font-medium text-wagr-navy">Wagr is a system.</p>
        </section>

        <p className="mb-16">
          <Link
            href="/register"
            className="font-heading text-sm font-medium text-wagr-navy border-b border-wagr-navy pb-0.5 hover:text-wagr-gold hover:border-wagr-gold transition-colors"
          >
            Set up the team in one sitting. →
          </Link>
        </p>

        <SiteFooter />
      </article>
    </main>
  )
}

function ArtifactRow({
  timestamp,
  children,
  className = '',
}: {
  timestamp: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`grid grid-cols-[3rem_1fr] gap-4 mb-10 items-start ${className}`}>
      <div className="text-xs text-wagr-gray pt-2.5 tabular-nums">{timestamp}</div>
      <div>{children}</div>
    </div>
  )
}

function SmsBubble({ sender, children }: { sender: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl px-4 py-3.5 text-[13px] border border-wagr-gray-light leading-snug">
      <div className="text-[10px] text-wagr-gray mb-1 uppercase tracking-wider font-medium">
        {sender}
      </div>
      {children}
    </div>
  )
}

function MomoNotification() {
  return (
    <div className="bg-white border-l-2 border-[#FFCC00] px-4 py-3.5 text-[13px] leading-snug">
      <div className="text-[10px] text-wagr-gray mb-1 uppercase tracking-wider font-medium">
        MTN MoMo
      </div>
      GHS 194.00 received from WAGR LTD. Ref: WGR-A4F2. New balance: GHS 312.45.
    </div>
  )
}
