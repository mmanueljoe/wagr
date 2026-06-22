const USSD_LINES = [
  'WAGR',
  '',
  'Earned this period',
  'GHS 1,420',
  '',
  'Request amount?',
  '> 200',
  '',
  'You receive: GHS 194',
  'Fee:         GHS 6',
  '',
  'Enter PIN to confirm',
  '> ****',
  '',
  'Sending...',
] as const

const LINE_DELAY_MS = 220

export function UssdScreen() {
  return (
    <div className="rounded font-mono text-[12.5px] leading-relaxed bg-ussd-bg text-ussd-green px-4 py-4 whitespace-pre-wrap">
      {USSD_LINES.map((line, i) => (
        <div
          key={`${i}-${line}`}
          className="ussd-line"
          style={{ animationDelay: `${i * LINE_DELAY_MS}ms` }}
        >
          {line || ' '}
        </div>
      ))}
    </div>
  )
}
