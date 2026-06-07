# 005. No provider abstraction over Moolre

Date: 2026-06-06
Status: Accepted

## Context

A common impulse when integrating with a third-party API is to wrap it
behind a generic interface — `PaymentProvider`, `NotificationProvider`,
etc. — so the rest of the codebase calls the abstraction and "we could
swap providers later."

For Wagr, the temptation is strong because we integrate five Moolre APIs
(Payments, Transfers, USSD, SMS, WhatsApp).

## Decision

Do not wrap Moolre in a generic provider abstraction. All Moolre calls
live in `apps/api/src/lib/moolre.ts` and are exported as plain functions
(`initiateTransfer`, `initiatePayment`, `sendSms`, `sendWhatsApp`,
`pollTransferStatus`). Other modules import these functions directly.

## Consequences

**Accepted:**
- If we ever move off Moolre, we will refactor the Moolre callsites at
  that point, with real knowledge of the replacement provider's shape.

**Gained:**
- Fewer files, fewer layers, less indirection.
- Implementations are easier to debug — stack traces don't pass through a
  generic dispatcher.
- We avoid the most common failure mode of premature abstraction: the
  abstraction shape turns out to fit only the original provider, so the
  "swap later" promise was never real.

## Why the typical "swap later" reasoning doesn't apply here

Moolre is the single provider for *all* of payments, transfers, USSD,
SMS, and WhatsApp. If we ever moved off Moolre, the replacement wouldn't
be one provider — it would be four or five different vendors with very
different shapes, auth models, and webhook formats. A single
`PaymentProvider` interface designed against Moolre would be wrong-shaped
for every one of them.

This aligns with the broader simplicity rule in [CLAUDE.md](../../../CLAUDE.md):
write the simplest code that meets the spec, extract abstractions only
when you have ≥2 concrete cases.

## Alternatives considered

- **Generic `PaymentProvider` / `NotificationProvider` interfaces.**
  Rejected — see above.
- **Lightweight adapter pattern (just splitting Moolre calls by category).**
  Considered but rejected. The five Moolre APIs are already split into
  categorised functions inside `moolre.ts` — adding another layer doesn't
  add value.
