# Spec: Disbursements and Collections (Moolre Integration)

**Epic:** WAGR-E5 Moolre Disbursements and Collections
**Stories:** [moolre-disbursement], [float-funding], [payday-recovery]
**Sprint:** Week 3 ([moolre-disbursement]), Week 4 ([float-funding], [payday-recovery])
**Status:** Not started

---

## Overview

All money movement in Wagr runs through Moolre's APIs. This spec covers three flows: disbursing an advance to a worker's MoMo wallet, collecting float funds from an employer, and recovering advance repayments from an employer on payday.

Moolre uses **two different status delivery patterns** depending on the API. The implementation must respect both:

- **Transfers API** (used for [moolre-disbursement] — sending money out): status is delivered by **polling** the Transfer Status endpoint. There is no webhook for transfers. Never mark a transfer as failed unless `txstatus = 2`.
- **Payments API** (used for [float-funding] and [payday-recovery] — pulling money in): status is delivered by **webhook**. Moolre POSTs to our configured callback URL when the customer approves or rejects the payment prompt.

Full Moolre integration details are in [moolre-api-reference.md](../architecture/moolre-api-reference.md).

---

## User Stories

**[moolre-disbursement]** — As the system, I want to disburse an advance to a worker's MoMo wallet via Moolre's Transfers API so that money reaches the worker within 60 seconds.

**[float-funding]** — As an employer, I want to fund my float via Moolre's Payments API so that advances can be disbursed from my account.

**[payday-recovery]** — As the system, I want to recover outstanding advances from an employer on payday via Moolre's Payments API.

---

## Acceptance Criteria

### Advance Disbursement ([moolre-disbursement])
- [ ] Disbursement triggered asynchronously after USSD PIN confirmation
- [ ] Moolre Transfers API called (POST /open/transact/transfer) with: type=1, channel (network code), currency=GHS, **amount = net_disbursed** (the worker receives net; Wagr's fee stays in Wagr's wallet — see Float accounting below), receiver (momo_number), externalref, accountnumber
- [ ] externalref format: `wagr-adv-{advance_request_id}` — Moolre uses this as an idempotency key; the same externalref will never charge twice
- [ ] advance_request stays in status: pending until Transfer Status confirms terminal state
- [ ] Transfer Status (POST /open/transact/status) polled by externalref every 5 seconds, up to 24 attempts (2 minutes total)
- [ ] On txstatus = 1 (Successful): advance_request → status: disbursed
- [ ] On txstatus = 2 (Failed): advance_request → status: failed, employer notified via SMS, **float_balance refunded by the gross requested_amount** (Wagr revenue is not accrued because the transfer didn't happen)
- [ ] On txstatus = 0 (Pending) or 3 (Unknown): keep polling — **never assume failure on these values** per Moolre's explicit warning
- [ ] If still non-terminal after 24 polls, alert the team but leave the advance_request in pending (do not mark failed)
- [ ] employer `float_balance` decremented by **gross `requested_amount`** when status becomes disbursed — not `net_disbursed`. The gross is what the employer is fronting; the worker takes net, Wagr keeps the fee.
- [ ] Wagr revenue accrued on successful disbursement: a row in `wagr_ledger` (proposed table — one row per fee event with `{ advance_request_id, fee_pesewas, accrued_at }`) so total Wagr revenue is derivable by sum. Avoids a mutable singleton balance.
- [ ] All state transitions written to audit_log

### Float Funding ([float-funding])
- [ ] Every employer pre-funds a float before workers can request advances —
      no advance can be disbursed against a zero float
- [ ] Fund Float card prominently visible on the dashboard home (and prompted
      right after registration for first-time employers with `float_balance = 0`).
      Funding is a core money operation, not a preference — it does NOT belong
      behind a Settings page.
- [ ] Employer enters an amount and confirms
- [ ] Moolre Payments API called (POST /open/transact/payment) with: type=1, channel (network code), currency=GHS, payer (employer's MoMo), amount, externalref (`wagr-float-{employer_id}-{timestamp}`), accountnumber
- [ ] Employer receives a USSD payment prompt on their phone and enters their MoMo PIN to authorise
- [ ] employer float_balance updated when Moolre webhook fires confirming success (txstatus = 1)
- [ ] Employer receives SMS confirmation when float is funded
- [ ] Transaction recorded in audit_log

### Payday Recovery ([payday-recovery])
- [ ] Triggered when employer clicks Process Payroll on the dashboard
- [ ] System calculates total outstanding advances: **SUM of `requested_amount` (gross)** for advance_requests with status: disbursed in the current pay period for this employer — this is what the employer fronted (worker's net + Wagr's fee, both came from the employer's float). The worker repays the gross from their salary; the Wagr fee was their cost of taking the advance early.
- [ ] Moolre Payments API called for the total recovery amount, externalref = `wagr-repay-{repayment_id}`
- [ ] If the employer authorises the recovery from within the dashboard via the same USSD session that prompted the action, pass the USSD `sessionid` in the Payments call to skip the OTP step. This avoids a double-PIN UX.
- [ ] When Moolre webhook fires with txstatus = 1: all included advance_request records updated to status: repaid, repayment record created
- [ ] When Moolre webhook fires with txstatus = 2: employer notified, payroll run blocked until resolved — partial recovery not allowed
- [ ] float_balance replenished by recovered amount
- [ ] WhatsApp payslips triggered after successful recovery ([whatsapp-worker-payslip])
- [ ] All events written to audit_log

---

## Technical Notes

### Moolre Integration Layer

All Moolre API calls are centralised in a single module. No route file calls Moolre directly. Each Moolre API uses different auth headers — see [moolre-api-reference.md](../architecture/moolre-api-reference.md) for the full mapping.

```typescript
// apps/api/src/lib/moolre.ts

const BASE_URL = process.env.MOOLRE_BASE_URL  // https://sandbox.moolre.com
const ACCOUNT = process.env.MOOLRE_ACCOUNT_NUMBER

// Canonical internal network values. Translated to Moolre's integer codes at the API boundary.
export type Network = 'mtn' | 'telecel' | 'at'

// Network code mapping (Moolre uses different integers per API — easy to get wrong)
const TRANSFER_NETWORK_CODE: Record<Network, number> = { mtn: 1, telecel: 6, at: 7 }
const PAYMENT_NETWORK_CODE:  Record<Network, number> = { mtn: 13, telecel: 6, at: 7 }
const USSD_NETWORK_CODE:     Record<Network, number> = { mtn: 3, telecel: 6, at: 5 }

interface TransferPayload {
  amount: number
  receiver: string           // MoMo number, e.g. 233241235993
  network: Network
  externalref: string        // Idempotency key
  reference?: string         // Human-readable memo
}

interface PaymentPayload {
  amount: number
  payer: string              // MoMo number
  network: Network
  externalref: string
  reference?: string
  sessionid?: string         // USSD session ID — when present, Moolre skips OTP
}

// Send money out (uses X-API-KEY private)
export async function initiateTransfer(payload: TransferPayload): Promise<MoolreResponse>

// Pull money in (uses X-API-PUBKEY). Status arrives via webhook.
export async function initiatePayment(payload: PaymentPayload): Promise<MoolreResponse>

// Poll transfer status by externalref (uses X-API-KEY)
export async function getTransferStatus(externalref: string): Promise<TransferStatus>
```

### Transfer Status Polling (used by [moolre-disbursement])

Transfers don't webhook. We poll Transfer Status until terminal.

```typescript
// apps/api/src/lib/transfer-polling.ts

const POLL_INTERVAL_MS = 5_000
const MAX_ATTEMPTS = 24  // 2 minutes total

export async function pollUntilTerminal(advanceRequestId: string, externalref: string) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { txstatus } = await getTransferStatus(externalref)
    if (txstatus === 1) {
      return markAdvanceDisbursed(advanceRequestId)
    }
    if (txstatus === 2) {
      return markAdvanceFailed(advanceRequestId)
    }
    // txstatus 0 (Pending) or 3 (Unknown) — keep polling. Never assume failure here.
    await sleep(POLL_INTERVAL_MS)
  }
  // Still non-terminal after the window — alert the team but do not mark failed
  await alertOpsTeam(advanceRequestId)
}
```

### Webhook Handler (used by [float-funding] and [payday-recovery])

Moolre sends a POST to `/webhooks/moolre` only for Payments API status changes. The payload includes a `secret` field that must match our stored account secret.

```typescript
// apps/api/src/routes/webhooks.ts

router.post('/webhooks/moolre', async (req, res) => {
  // 1. Verify the secret in the payload matches our stored account secret
  const { data } = req.body
  if (data?.secret !== process.env.MOOLRE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' })
  }

  const { externalref, txstatus } = data

  // 2. Route to the correct handler based on externalref prefix
  if (externalref.startsWith('wagr-float-')) {
    await handleFloatFundingResult(externalref, txstatus)
  } else if (externalref.startsWith('wagr-repay-')) {
    await handleRepaymentResult(externalref, txstatus)
  }

  // Always return 200 to Moolre — handle internal errors with our own monitoring
  res.status(200).json({ received: true })
})
```

### externalref convention

Used as Moolre's idempotency key. Same externalref never charges twice — safe to retry.

| Flow | externalref format | Example |
|---|---|---|
| Advance disbursement (Transfers) | `wagr-adv-{advance_request_id}` | `wagr-adv-abc123` |
| Float funding (Payments) | `wagr-float-{employer_id}-{timestamp}` | `wagr-float-xyz-1718000000` |
| Payday recovery (Payments) | `wagr-repay-{repayment_id}` | `wagr-repay-def456` |

### Network code rule

The database stores the canonical `Network` value (`'mtn' | 'telecel' | 'at'`) on the `employees` and `employers` tables. Moolre's integer codes are translated only at the call site inside `moolre.ts`. **Never pass raw Moolre integer network codes around the codebase** — they differ by API and are a common source of bugs.

### Float accounting model

Wagr has **one Moolre business account** (`MOOLRE_ACCOUNT_NUMBER`). Its wallet
holds float for all employers, commingled. Each employer's share is bookkept
in Postgres on `employer.float_balance`. Wagr's accumulated fee revenue is
bookkept separately in `wagr_ledger` (one row per advance fee).

This is the only model Moolre's API actually supports — there is no
sub-account API. The docs confirm `type=1` is the only Create Account flow,
and `sublist` is a settlement-routing field, not a sub-wallet primitive.

#### Worked example — one advance

Worker Ama requests **GHS 200**. Wagr's 3% fee is **GHS 6**. Worker net = **GHS 194**.

| Step | Wagr Moolre wallet | `employer.float_balance` (DB) | `wagr_ledger` total (DB) |
|---|---|---|---|
| Before | GHS 200 | GHS 200 | GHS 0 |
| Disbursement (assuming Moolre Option A — sender pays fee separately) | −GHS 194 (transfer) − ~GHS 2 (Moolre's 1%) = **−GHS 195.94** | **−GHS 200 (gross)** | **+GHS 6 (Wagr fee)** |
| After | GHS 4.06 | GHS 0 | GHS 6 |

Key idea: the **GHS 6 Wagr fee never leaves the wallet** — it's just retagged
from "employer float" to "Wagr revenue" inside our books. The only thing
that physically leaves the wallet on a disbursement is **net + Moolre's own
transaction fee**. On payday, the employer repays the gross GHS 200, restoring
the float.

#### Reconciliation invariant

At any point in time:

```
Wagr Moolre wallet balance  ≈  SUM(employer.float_balance)
                              + SUM(wagr_ledger.fee_pesewas)
                              − SUM(moolre_transaction_fees_paid_to_date)
```

"≈" not "=" because Moolre's transaction fees aren't fully predictable
(rounding, caps, network fee variations). We track them via a daily
reconciliation job, not by predicting them in code.

#### Open questions blocking [moolre-disbursement]

1. **Moolre's fee deduction model** — Option A (sender pays separately) is
   the assumption above. The docs don't state it explicitly; the Transfer
   Status response shows `amountfee` and `fee` fields but never specifies
   who pays. **Confirm in sandbox before shipping** — if it turns out to be
   Option B (skim from the transfer), the Moolre call has to gross up the
   amount so the worker actually receives the promised net.
2. **Settlement fee from Moolre wallet to bank** — silent on the pricing
   page. Email Moolre support.

---

## Dependencies

| Story | Depends On |
|---|---|
| [moolre-disbursement] | [moolre-sandbox-tested] (Moolre sandbox tested), [ussd-pin-step] (PIN confirmation), [db-schema] (database) |
| [float-funding] | [moolre-sandbox-tested], [employer-register] (employer auth) |
| [payday-recovery] | [moolre-disbursement] (advances exist to recover), [float-funding] (float funded) |

---

## Files to Create

```
apps/api/src/lib/
├── moolre.ts                    # Moolre API integration layer (Transfers + Payments + network code translation)
└── transfer-polling.ts          # Poll Transfer Status until txstatus is terminal

apps/api/src/routes/
├── webhooks.ts                  # POST /webhooks/moolre (Payments status only — Transfers use polling)
└── payroll.ts                   # POST /payroll/run (triggers [payday-recovery])
```
