# 009. Idempotency keys on every money-moving request

Date: 2026-06-09
Status: Accepted

## Context

A worker requests an advance via USSD. The Moolre disbursement call
takes ~3 seconds. The worker doesn't see a confirmation, panics, and
re-dials. Without protection, we send two disbursements for one request.
Same risk with payday recovery (Collections), float top-up, and every
other money-moving call.

This isn't theoretical. It's why every serious payments API supports
idempotency keys — Stripe, Adyen, PayPal, Plaid all do.

## Decision

Every money-moving request — outbound to Moolre or inbound from a worker
— carries an **idempotency key**. The api uses the key to short-circuit
duplicates before any external call.

Concretely:

- The api generates a UUID idempotency key when a worker initiates an
  advance (or any other money operation). Generated server-side so the
  client can't replay an old key to get duplicate behaviour.
- The key is stored on the relevant row before the Moolre call. For
  advances, this is `advance_requests.moolre_external_ref` (already
  declared `unique` in the schema). The Postgres unique constraint
  enforces it at the DB layer.
- Before each Moolre call, the api checks: does a row with this key
  already exist with a non-failed status? If yes → return the existing
  result. If no → insert a `pending` row, then call Moolre.
- The same key is sent to Moolre as Moolre's own idempotency parameter
  so that if our retry duplicates, Moolre also catches it.

## Consequences

**Accepted:**

- The api always writes the row first, then calls Moolre. If the network
  drops between write and call, the row is stuck `pending` and a cleanup
  job (or the next status poll) resolves it.
- Every money-moving endpoint needs the same idempotency check. A small
  shared helper (`withIdempotency(key, fn)`) hides the boilerplate.

**Gained:**

- Retrying a failed money operation is safe. Workers can re-dial without
  fear. Webhooks can fire twice without paying twice.
- Reconciliation jobs become tractable — the unique key is the join
  between our system, Moolre, and any post-incident audit.

## Why we can't skip this for V1

Wagr's whole product is "tap a few keys, get GHS 50 in your wallet."
If the worker taps too many keys (because their phone froze, because
the network blinked) and gets GHS 100, the float drains and we owe
the worker money we already paid. This isn't a future polish item.

## References

- [Stripe — Idempotent requests](https://stripe.com/docs/api/idempotent_requests)
- [Moolre Transfers API](../moolre-api-reference.md) — Moolre supports
  external reference deduplication on transfers.
