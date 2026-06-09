# 008. Money is stored and computed as integer minor-units (pesewas)

Date: 2026-06-09
Status: Accepted

## Context

JavaScript has a single `number` type, which is an IEEE-754 double. It
cannot exactly represent most decimal fractions. `0.1 + 0.2` is
`0.30000000000000004`. For display, this is fine. For sums of money over
thousands of advances and recoveries, it is a real bug — the float can
drift, and the float is what we owe a worker or what we owe Moolre.

The Ghana cedi is divided into 100 pesewas (GHS 1.00 = 100 pesewas), the
same shape as the US dollar / cent or the British pound / penny.

## Decision

Money is stored and computed as **integer minor-units (pesewas)** in
domain code:

- GHS 11.00 is the number `1100`.
- GHS 0.50 is `50`.
- Function signatures, types, JSON payloads, and Redis values all use
  integer pesewas.

Postgres stays `numeric(12,2)` because the schema is human-readable in
database tools and the difference is hidden by the marshalling layer
(multiply by 100 on read, divide by 100 on write — or use Postgres
`numeric` directly with `pg-types` parsing into a string and converting
in the app).

The UI converts at the display boundary only (`formatGhs(1100) → "GHS 11.00"`).

## Consequences

**Accepted:**

- The three wage-engine helpers shipped so far (`earned-wage`,
  `max-advance`, `fee`) currently use JS `number` as cedis. They will be
  refactored to integer pesewas in a follow-up before any money actually
  moves. Tests update too.
- Every developer reading wage-engine code needs to know the unit. A
  one-line comment at every money-typed parameter (`amount: number //
  pesewas`) keeps it obvious.

**Gained:**

- Floating-point drift is impossible. Sums are exact.
- Idempotent reconciliation jobs become trivial — integer equality is safe.
- The pattern matches every serious payments library (Stripe API,
  Adyen, etc.). When we read external docs the units already match.

## Why this matters now and not later

We have three pure wage-engine functions. Refactoring three pure
functions and their tests is hours of work. Refactoring after USSD
disbursement, payday recovery, and the dashboard all consume cedis
as `number` is a multi-day project that touches every layer.

## References

- [Stripe — How to handle currency](https://stripe.com/docs/currencies)
- [Martin Fowler — Money pattern](https://martinfowler.com/eaaCatalog/money.html)
