// Ghanaian MoMo number normalisation helpers.
//
// Three formats we deal with:
//   - 10-digit local:  "0244123456"  → DB storage shape (matches GH_MOMO_REGEX)
//   - 12-digit MSISDN: "233244123456" → what Moolre sends in USSD callbacks
//   - E.164:           "+233244123456" → contact phone for employers
//
// USSD lookups go from Moolre's MSISDN → the 10-digit DB shape. Keep the
// helpers small and total — they throw on shapes that aren't Ghanaian.

const MSISDN_REGEX = /^233\d{9}$/

export function msisdnToLocal(msisdn: string): string {
  if (!MSISDN_REGEX.test(msisdn)) {
    throw new Error(`msisdn must match 233XXXXXXXXX, got ${msisdn}`)
  }
  return `0${msisdn.slice(3)}`
}

export function isGhanaianMsisdn(msisdn: string): boolean {
  return MSISDN_REGEX.test(msisdn)
}
