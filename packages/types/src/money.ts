// All money in Wagr is stored and computed as integer pesewas (the smallest
// unit of the Ghana cedi). GHS 11.00 = 1100. GHS 0.50 = 50. We never use
// floating-point cedis in code — see ADR 008.
//
// Display conversion happens at the UI boundary only. Postgres keeps the
// numeric(12,2) columns for human readability; the marshalling layer turns
// them into integer pesewas on the way into the app.

// Type alias to signal intent at function signatures and DB rows. It's still
// a number at runtime — TypeScript doesn't enforce branded types without
// extra ceremony — but the alias documents what the value MUST be.
export type MoneyPesewas = number

const PESEWAS_PER_CEDI = 100

// "GHS 11.00", "GHS 1,250.75", "GHS 0.50". Use this at the UI boundary only.
export function formatGhs(pesewas: MoneyPesewas): string {
  const sign = pesewas < 0 ? '-' : ''
  const abs = Math.abs(pesewas)
  const whole = Math.floor(abs / PESEWAS_PER_CEDI)
  const fractional = abs % PESEWAS_PER_CEDI
  return `${sign}GHS ${whole.toLocaleString('en-GH')}.${fractional.toString().padStart(2, '0')}`
}

// Parse a user-typed string like "11", "11.00", "11.5", "1,250.75" into pesewas.
// Returns null when the input doesn't look like a cedi amount — caller decides
// what to do (show a form error, etc.).
export function parseGhs(input: string): MoneyPesewas | null {
  const cleaned = input.replace(/[,\sGHS]/gi, '').trim()
  if (!cleaned) return null
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [wholePart, fractionalPart = ''] = cleaned.split('.')
  const whole = Number.parseInt(wholePart ?? '0', 10)
  const fractional = Number.parseInt(fractionalPart.padEnd(2, '0'), 10)
  const sign = whole < 0 ? -1 : 1
  return sign * (Math.abs(whole) * PESEWAS_PER_CEDI + fractional)
}
