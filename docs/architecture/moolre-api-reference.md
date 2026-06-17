# Moolre API Reference

A condensed reference for Wagr's Moolre integration. Pulled from
[docs.moolre.com](https://docs.moolre.com/). Refresh this page when you discover
something that doesn't match what the live API actually returns.

This is a working summary, not a replacement for the official docs. When in
doubt, check the source.

---

## Platform basics

- **Sandbox base URL:** `https://sandbox.moolre.com`
- **Live base URL:** `https://api.moolre.com`
- **All endpoints are versionless.** They live under `/open/<service>/<action>`.
  Note: the old `MOOLRE_BASE_URL=https://sandbox.moolre.com/api/v1` value in
  [setup.md](setup.md) is wrong. Remove the `/api/v1` suffix.
- **Format:** JSON in, JSON out.
- **Standard response envelope** (every endpoint returns this shape):
  ```json
  {
    "status": 1,
    "code": "SMS01",
    "message": "Success",
    "data": { },
    "go": null
  }
  ```
  - `status`: `1` = success, `0` = failure
  - `code`: short string identifier (`SMS01`, `WAS401`, etc.) — use this for
    branching, not the message text
  - `message`: human-readable string or array
  - `data`: payload, varies per endpoint
  - `go`: navigation hint, usually `null`, ignore for now

## Authentication

Header-based API keys. Different endpoints need different combinations.

| Header | What it is | Used for |
|---|---|---|
| `X-API-USER` | Moolre username | Required on every endpoint |
| `X-API-KEY` | Private key | Transfers (initiating), Account Status |
| `X-API-PUBKEY` | Public key | Payments (initiating) |
| `X-API-VASKEY` | Value-added services key | SMS, WhatsApp |

The repo's `apps/api/.env` therefore needs four secrets, not one:
```
MOOLRE_API_USER=...
MOOLRE_API_KEY=...
MOOLRE_API_PUBKEY=...
MOOLRE_API_VASKEY=...
```

## Naming mismatches with the repo

The repo's specs use different names than Moolre. We're renaming the Moolre
side to the names below in our integration module; the repo specs can keep
their domain language ("Collections", "Bulk Disbursements") for context, but
the code should call them by Moolre's names.

| Repo says | Moolre's actual name |
|---|---|
| Collections API | **Payments API** |
| Bulk Disbursements API | **Transfers API** |
| USSD API | USSD API |
| SMS API | SMS API |
| WhatsApp API | WhatsApp API |

## Network codes (read this carefully)

Moolre uses **three different network code systems** depending on the endpoint.
This is a footgun. Centralise the mapping in one place
(`apps/api/src/lib/moolre/networks.ts`) and never pass raw integers around.

| Network | USSD callback | Payments API | Transfers API |
|---|---|---|---|
| MTN | `3` | `13` | `1` |
| Telecel | `6` | `6` | `6` |
| AirtelTigo (AT) | `5` | `7` | `7` |
| Instant Bank Transfer | — | — | `2` |

Wagr's domain model should store a single canonical network value (e.g. an
enum `"mtn" | "telecel" | "at"`) and translate at the API boundary.

---

## USSD API

Used for the worker USSD flow ([ussd-session-handler] and the step slugs).

### Callback (Moolre → us)

Moolre POSTs this to your configured callback URL whenever a user dials.

```json
{
  "sessionId": "3-17074657982460137",
  "new": true,
  "msisdn": "233241235993",
  "network": 3,
  "message": "",
  "extension": "109",
  "data": "11005"
}
```

| Field | Type | Meaning |
|---|---|---|
| `sessionId` | string | Unique session identifier from Moolre. **Use this as the Redis key**, not the phone number. |
| `new` | boolean | `true` on first hit of a session, `false` on subsequent hits |
| `msisdn` | string | Worker's mobile number (no `+`, includes country code, e.g. `233...`) |
| `network` | integer | Worker's network (USSD network codes — see table above) |
| `message` | string | What the user typed in this step |
| `extension` | string | Your assigned USSD extension code |
| `data` | string | Anything dialled in the initial code after the extension. E.g. `*203*109*11005#` → `data = "11005"`. Useful for deep-linking. |

### Response (us → Moolre)

```json
{
  "message": "Menu\n1) Balance\n2) Account Information",
  "reply": true
}
```

| Field | Type | Meaning |
|---|---|---|
| `message` | string | What the user sees |
| `reply` | boolean | `true` = keep the session open and wait for input. `false` = end the session. |

### Implementation notes

- The spec in [feature-ussd-flow.md](../specs/feature-ussd-flow.md) says to use
  the phone number as the Redis session key. Use `sessionId` instead — it's
  guaranteed unique per session and handles edge cases like a worker who hangs
  up and redials.
- The 5-second timeout still applies: pre-compute everything before responding.
- `data` can be used to deep-link straight to a balance check (e.g.
  `*203*<extension>*BALANCE#`) — worth considering for repeat users.

---

## Payments API

Used for [float-funding] and [payday-recovery] — pulling money in.

### Initiate Payment

```
POST https://sandbox.moolre.com/open/transact/payment
Headers: X-API-USER, X-API-PUBKEY
```

| Body field | Required | Notes |
|---|---|---|
| `type` | yes | Always `1` |
| `channel` | yes | Payments network code (13=MTN, 6=Telecel, 7=AT) |
| `currency` | yes | `GHS` or `NGN` |
| `payer` | yes | Mobile money number being debited |
| `amount` | yes | Amount to collect |
| `externalref` | yes | **Must be unique.** Use a UUID per attempt. |
| `accountnumber` | yes | Your Moolre account number (the wallet that gets credited) |
| `sessionid` | optional | **USSD session ID — passing this skips the OTP step.** |
| `otpcode` | optional | If OTP was sent, pass it here on retry |
| `reference` | optional | Human-readable memo |

### Response codes worth handling

| Code | Meaning | What to do |
|---|---|---|
| `200_PAYMENT_REQ` | Prompt sent, awaiting user PIN | Move advance to `pending`, poll status |
| `200_OTP_REQ` | OTP sent to user, retry with `otpcode` | Show OTP entry to user |
| `200_OTP_SUCCESS` | OTP verified, re-submit to trigger payment | Re-call this endpoint without OTP |
| `400_INVALID_OTP` | Wrong OTP | Ask user to retry |
| `400_NON_UNIQUE_REF` | `externalref` already used | Bug. Refs must be unique. |

### Critical insight for Wagr

When a worker authorises a Wagr advance via USSD, **pass the Moolre
`sessionid` to the Payments call to skip OTP**. The worker has already entered
their PIN in the USSD flow; they shouldn't see a second prompt. This is the
mechanism that makes the "PIN once, advance arrives" experience possible.

---

## Transfers API

Used for [moolre-disbursement] — pushing money out to worker MoMo wallets.

### Initiate Transfer

```
POST https://sandbox.moolre.com/open/transact/transfer
Headers: X-API-USER, X-API-KEY (private key required to actually move money)
```

| Body field | Required | Notes |
|---|---|---|
| `type` | yes | Always `1` |
| `channel` | yes | Transfers network code (1=MTN, 6=Telecel, 7=AT, 2=Bank) |
| `currency` | yes | `GHS` or `NGN` |
| `amount` | yes | Amount to send |
| `receiver` | yes | MoMo number or bank account number |
| `sublistid` | conditional | Bank ID, required when `channel=2` |
| `externalref` | yes | Unique per attempt |
| `accountnumber` | yes | Your Moolre account (debited) |
| `reference` | optional | Human-readable memo |

### Response — `txstatus`

The success response includes `data.txstatus`:

| Value | Meaning | What to do |
|---|---|---|
| `1` | Successful | Mark advance `disbursed` |
| `0` | Pending | **Do NOT mark as failed.** Poll via Transfer Status. |
| `2` | Failed | Mark advance `failed`, surface to user/employer |
| `3` | Unknown | Treat as pending. Poll. |

### Critical insight for Wagr

Moolre explicitly warns: **"Never assume a transfer has failed unless txstatus
is 2."** A `pending` or `unknown` status means the transfer might still
succeed.

Implementation rule: the route handler that triggers a disbursement must NOT
mark the advance `failed` on any error short of `txstatus=2`. Instead, it
queues a status check that polls every N seconds until terminal. The Express
spec currently in [feature-disbursements.md](../specs/feature-disbursements.md)
should be updated to reflect this.

### Validate before transfer

Use **POST /open/transact/validate-name** with the recipient's MoMo number
first. Confirms the account holder's name. Wagr should do this once on
employee onboarding (store the validated name) so we don't validate on every
advance.

---

## Webhooks (callbacks)

Moolre supports webhooks for **Payments only** (when a customer authorises or
rejects a Mobile Money payment prompt). Transfers and SMS rely on polling.

### Configuring the callback URL

The webhook URL is set per Moolre account via **POST /open/account/update**:

| Field | Notes |
|---|---|
| `callback` | Your public webhook URL, e.g. `https://api.wagr.app/webhooks/moolre` |

The response includes a `secret` string. Moolre signs each webhook payload
with this secret so you can verify the call really came from them.

### Pattern per API

| API | Status delivery | Wagr action |
|---|---|---|
| **Payments** (Collections) | Webhook | Configure `callback`, handle POST, verify `secret`, update advance/recovery record |
| **Transfers** (Disbursements) | Polling | Call Transfer Status by `externalref` until `txstatus` is 1 or 2 |
| **SMS** | Polling | Optional — call SMS Status by `ref` if delivery confirmation is needed |

### Webhook handler shape

When Moolre POSTs to your callback URL after a customer interacts with a
payment prompt, the body includes the standard envelope plus `txstatus`:

```json
{
  "status": 1,
  "code": "SUCCESS",
  "data": {
    "txstatus": 1,
    "externalref": "wagr-recover-2026-06-12-...",
    "secret": "your-account-secret",
    ...
  }
}
```

Your handler must:
1. Look up the advance/recovery record by `externalref`.
2. Verify `data.secret` matches the secret you stored when configuring the
   callback. Reject the webhook if it doesn't match.
3. Update the record's status based on `txstatus`:
   - `1` → success (advance recovered, float funded, etc.)
   - `2` → failed (surface to employer)
   - `0` or `3` → ignore (still in flight; another webhook will follow)
4. Return HTTP 200 so Moolre doesn't retry.

The route already exists in [file-tree.md](file-tree.md) at
`apps/api/src/routes/webhooks.ts`.

---

## SMS API

Used for [sms-advance-status].

### Send SMS

```
POST https://sandbox.moolre.com/open/sms/send
Headers: X-API-VASKEY
```

| Body field | Required | Notes |
|---|---|---|
| `type` | yes | Always `1` |
| `senderid` | yes | Your approved sender ID (max 11 chars). For Wagr: `Wagr` |
| `messages` | yes | Array of `{ recipient, message, ref? }` |

### Sandbox behaviour

- Sandbox sends **real SMS**, but using Moolre's sender ID instead of yours.
- 100 free sandbox SMS credits for testing.
- Approved sender IDs take time — register `Wagr` early ([moolre-sandbox-tested]
  is a good story to handle this).

---

## WhatsApp API

Used for [whatsapp-worker-payslip] and [whatsapp-employer-summary].
**Read this section before committing to a delivery date.**

### Send Message

```
POST https://sandbox.moolre.com/open/whatsapp/send
Headers: X-API-VASKEY
```

| Body field | Required | Notes |
|---|---|---|
| `template_name` | yes | Name of a Meta-approved template |
| `language` | yes | Language code, e.g. `en` |
| `messages` | yes | Array of `{ recipient, ref?, placeholders[] }` |
| `placeholders` | yes per message | Values that substitute into the template |

### Major constraint: templates only

WhatsApp Business does not allow freeform messages outside a 24-hour customer
service window. Wagr's payslip use case is outbound notification — it must use
a **pre-approved Meta template** with placeholder variables.

**This changes [payslip-gpt].** GPT-4o cannot generate the full payslip
message. It can only generate the *content for placeholder slots* within a
fixed template. Example template:

> Hi {{1}}, your {{2}} payslip from {{3}}.
> Gross: GHS {{4}}. Advances: GHS {{5}}. Net: GHS {{6}}.
> {{7}}
> — Wagr

GPT-4o's job is to produce `{{7}}` (the friendly closing line). The structured
fields are deterministic.

Update the [payslip-gpt] spec to reflect this. The "constrained prompt" should
output a single string for the closing line, not a multi-line message.

### Setup time

To send from Wagr's own number (not Moolre's sandbox), the process is:
1. Create a WhatsApp service in the Moolre portal
2. Verify with Meta (multi-step embedded signup)
3. Wait for Meta to approve the business name and display name (hours to days)
4. Submit templates for Meta approval (each template needs separate approval)

**Start this on day 1 of [moolre-sandbox-tested].** If Meta approval slips,
the sandbox can carry the demo, but only on Moolre's number, not Wagr's.

### Sandbox behaviour

- Sandbox sends **real WhatsApp messages** from Moolre's sandbox number.
- 100 free messages for testing.

---

## Account API

Useful for the dashboard ([dashboard-home]) to display the float balance.

### Account Status (balance check)

```
POST https://sandbox.moolre.com/open/account/status
Headers: X-API-USER, X-API-KEY
```

| Body field | Required | Notes |
|---|---|---|
| `type` | yes | Always `1` |
| `accountnumber` | yes | The Moolre account/wallet to check |

### Response

```json
{
  "data": {
    "balance": 1240.50,
    "accountname": "Accra Wellness Clinic",
    "callback": "https://api.wagr.app/webhooks/moolre"
  }
}
```

For [dashboard-home] this is the source of truth for the "Float balance" stat
card — don't try to derive it by summing disbursements minus collections.

---

## Pricing (snapshot, 2026-06-17)

Compiled from [moolre.com/pricing](https://moolre.com/pricing). This is reference
material for engineering decisions — never hardcoded into the application. Moolre
charges these fees on their side when each call settles; our code just initiates
the call and trusts the wallet ledger.

### Per-call fees

| Service | Moolre fee | Network fee | Effective per transaction |
|---|---|---|---|
| Transfers (money out to worker) | 1%, min GHS 0.50, **cap GHS 10** | 0% | 1% of net up to GHS 10 |
| Payments (money in from employer float) | 1%, min GHS 0.50, cap GHS 10 | 0.5–1%, capped GHS 20 | ~1.5–2%, capped ~GHS 30 |
| SMS | ~GHS 0.05 per message | — | flat |
| WhatsApp | ~GHS 0.05 per message | — | flat |
| USSD per session | GHS 0.014 | — | flat |

### Fixed costs

| Item | Cost | Notes |
|---|---|---|
| USSD shared code | **GHS 420 / month** | Use for the buildathon — affordable |
| USSD dedicated code | GHS 3,500 / network, or GHS 10,500 / all three | Out of reach pre-revenue |

### Open questions (not on the pricing page)

These need confirmation before [moolre-disbursement] can ship its accounting layer.

1. **How does Moolre collect their Transfers fee?**
   - **Assumption (Option A):** Moolre debits Wagr's wallet for the transfer
     amount AND their fee separately. Worker receives exactly what we promised
     on the USSD confirm screen. This is the industry standard.
   - Alternative (Option B): Moolre skims their cut from inside the transfer.
     Worker would receive less than promised. Would force a gross-up of the
     transfer amount or a smaller "you receive" number on the confirm screen.
   - **How to resolve:** trigger one real disbursement in the Moolre sandbox
     and compare the worker's wallet balance to what was promised on screen.
     Pending USSD code purchase.

2. **Settlement fees from Moolre wallet to a Ghanaian bank account.**
   - The pricing page is silent. Could be free, flat, or a percentage.
   - Affects Wagr's true per-advance margin (currently calculated as ~2% of
     advance net of Moolre's Transfers fee).
   - **How to resolve:** email Moolre support directly.

### Why this matters for the build

- **Wagr's 3% advance fee is tuned against Moolre's 1% Transfers cut.** Margin
  stays positive at every advance size we permit (GHS 50–1,000 cap). See the
  rationale in [fee.ts](../../apps/api/src/lib/wage-engine/fee.ts).
- **The GHS 420/month USSD subscription is a fixed cost** that has to be earned
  back across all advances. Rough breakeven sits around 105 advances/month at
  an average advance size of GHS 200.
- **The disbursement spec needs the gross/net split right.** Employer float must
  be debited by **gross requested amount** (worker net + Wagr fee), not by the
  net disbursed. Otherwise Wagr's 3% fee never lands in a Wagr-owned account.
  See [feature-disbursements.md](../specs/feature-disbursements.md) for the
  current spec — it currently says "net_disbursed" in three places and needs
  updating before [moolre-disbursement] is implemented.

---

## Last updated

Compiled from docs.moolre.com on 2026-06-06. Refresh by re-reading the source
pages whenever a Moolre integration call doesn't match what's here.

Source pages consulted:
- Quickstart, Authentication
- USSD (`#/ussd`)
- Payments — Get Started, Initiate Payment
- Transfers — Get Started, Initiate Transfer, Transfer Status
- SMS — Get Started, Send SMS, SMS & Notifications use case
- WhatsApp — Get Started, Send Message
- Account — Get Started, Update Account, Account Status
- Bulk Payouts use case, FAQ
