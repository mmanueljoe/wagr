// MoMo number prefixes per network. Moolre expects 10-digit local format
// (0XXXXXXXXX). Checking the prefix catches mismatches like "MTN" declared
// for a Telecel number, which would cause a Moolre transfer failure.
const MOMO_PREFIXES: Record<string, string[]> = {
  mtn: ['024', '054', '055', '059'],
  telecel: ['020', '050'],
  at: ['026', '056', '027', '057'],
}

export function validateMoMoNetwork(momoNumber: string, network: string): boolean {
  const prefixes = MOMO_PREFIXES[network.toLowerCase()]
  if (!prefixes) return false
  return prefixes.some((p) => momoNumber.startsWith(p))
}
