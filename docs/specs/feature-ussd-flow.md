# Spec: USSD Worker Flow

**Epic:** WAGR-E4 USSD Worker Flow
**Stories:** [ussd-session-handler], [ussd-balance-step], [ussd-amount-step], [ussd-confirm-step], [ussd-pin-step], [ussd-pin-setup]
**Sprint:** Week 3
**Status:** Not started

---

## Overview

The USSD flow is the worker-facing interface. It runs on any GSM phone with no internet connection. Workers dial the Wagr USSD code, navigate a short menu, and request advances. Moolre hosts the USSD session and sends HTTP callbacks to the Wagr backend at each step.

This is the highest-risk feature in the build. Two full evenings should be spent understanding the Moolre USSD callback model in the sandbox before writing application code.

---

## User Stories

**[ussd-session-handler]** — As the system, I want a USSD callback handler that manages session state.
**[ussd-balance-step]** — As a worker, I want to dial the USSD code and see my earned balance.
**[ussd-amount-step]** — As a worker, I want to request an advance amount via USSD.
**[ussd-confirm-step]** — As a worker, I want to see a confirmation screen before authorising.
**[ussd-pin-step]** — As a worker, I want to confirm my advance with my PIN.
**[ussd-pin-setup]** — As a worker, I want to set my USSD PIN on first use.

---

## How Moolre USSD Works

Moolre's USSD system is stateless. Every time a user presses a key on the USSD menu, Moolre sends an HTTP POST callback to your backend. Your backend must respond within 5 seconds with the next menu screen. Your backend is responsible for remembering where the user is in the flow.

Each callback contains:
- `sessionId` — unique identifier for this USSD session
- `phoneNumber` — the worker's phone number
- `text` — everything the user has typed so far, joined by asterisks (e.g. "1*200*1234")
- `serviceCode` — the USSD code dialed

Your response must contain:
- `response` — the text to display on the phone screen
- `action` — either `CON` (continue session) or `END` (close session)

```
CON Next menu text here    ← session continues, user can type more
END Thank you, goodbye.    ← session ends
```

---

## Acceptance Criteria

### Session Handler ([ussd-session-handler])
- [ ] POST /ussd route receives Moolre callbacks
- [ ] Session state stored in Redis: key = ussd:session:{sessionId}, TTL = 120 seconds. Use the `sessionId` Moolre provides on every callback as the key — not the phone number, which can collide when a worker hangs up and redials, or when two workers share a phone.
- [ ] All wage calculations pre-computed at session start and stored in session state
- [ ] Every response returned within 5 seconds
- [ ] Session cleared after END response sent
- [ ] Session cleared after 120 seconds of inactivity (handled by Redis TTL)

### Balance Display ([ussd-balance-step])
- [ ] Step 1: phone number used to look up employee record
- [ ] Employee not found: END session with clear message
- [ ] Employee is_active false: END session with message to contact employer
- [ ] Step 2: displays name, earned balance, maximum advance available
- [ ] All values pre-computed before session start

### Amount Request ([ussd-amount-step])
- [ ] Step 3: prompts for advance amount
- [ ] Amount below GHS 50: CON with error, prompt again. (Floor exists so
      the flat GHS 10 fee never exceeds 20% of what the worker requested.)
- [ ] Amount above maximum: CON with error showing maximum, prompt again
- [ ] Valid amount: store in session, proceed to confirmation

### Confirmation Screen ([ussd-confirm-step])
- [ ] Step 4: displays requested amount, fee, net amount, destination MoMo number
- [ ] User can type 1 to confirm or 2 to cancel
- [ ] Cancel: END session, no record created
- [ ] Confirm: proceed to PIN step

### PIN Confirmation ([ussd-pin-step])
- [ ] Step 5: prompts for 4-digit PIN
- [ ] Incorrect PIN: CON with error, increment attempt counter in session
- [ ] Third incorrect attempt: END session, no advance created
- [ ] Correct PIN: create advance_request record, trigger disbursement, END with confirmation

### First-Use PIN Setup ([ussd-pin-setup])
- [ ] Detected when employee.ussd_pin_hash is null
- [ ] Additional steps inserted before balance display: prompt for new PIN, prompt to confirm PIN
- [ ] PINs do not match: CON with error, prompt again
- [ ] PINs match: hash with bcrypt, save to employee record, proceed to normal flow

---

## Technical Notes

### Session State Structure

```typescript
interface UssdSession {
  step: number                    // Current step 1-6
  employee_id: string             // Resolved employee UUID
  employer_id: string
  earned_wage: number             // Pre-computed
  max_advance: number             // Pre-computed
  requested_amount?: number       // Set at step 3
  fee_amount?: number             // Set at step 3
  net_disbursement?: number       // Set at step 3
  pin_attempts: number            // Incremented on wrong PIN
  is_first_use: boolean           // True if no PIN set
  new_pin_hash?: string           // Temporary during PIN setup
}
```

### USSD Flow Map

```
Dial *XXX#
    │
    ▼
Step 1: Enter phone number or staff ID
    │
    ├─ Not found ──────────────────────────► END: "Number not registered. Contact your employer."
    │
    ▼
[Pre-compute: earned_wage, max_advance]
    │
    ├─ First use? ─► Step 1a: Enter new PIN
    │                    │
    │                Step 1b: Confirm new PIN
    │                    │
    │                [Save PIN hash]
    │
    ▼
Step 2: "Hi [Name]. Earned: GHS [X]. Max advance: GHS [Y]. Press 1 to continue."
    │
    ▼
Step 3: "Enter amount (max GHS [Y]):"
    │
    ├─ Invalid ────────────────────────────► CON: Error message, repeat step 3
    │
    ▼
Step 4: "Confirm: GHS [requested] → GHS [net] to [MoMo]. Fee: GHS [fee]. 1=Confirm 2=Cancel"
    │
    ├─ Cancel ─────────────────────────────► END: "Cancelled. No advance created."
    │
    ▼
Step 5: "Enter your 4-digit PIN:"
    │
    ├─ Wrong PIN (attempt 1-2) ────────────► CON: "Wrong PIN. [X] attempts remaining."
    ├─ Wrong PIN (attempt 3) ──────────────► END: "Too many attempts. Try again later."
    │
    ▼
[Create advance_request, trigger disbursement async]
    │
    ▼
END: "Request submitted. GHS [net] will arrive on your MoMo shortly."
```

### Response Timing

The 5-second response window is strict. The flow must never do slow operations during a session:

| Operation | When to do it | Where |
|---|---|---|
| Database employee lookup | Before session starts (step 1 response time) | DB query |
| Wage calculation | Before session starts | wage-engine.ts |
| Maximum advance calculation | Before session starts | wage-engine.ts |
| Redis session write | During each step | Fast — under 10ms |
| PIN bcrypt validation | During step 5 | Use bcrypt.compare — under 100ms |
| Advance record creation | After END response is sent | Async, does not block response |
| Moolre Transfers API call | After END response is sent | Async, does not block response |

The disbursement and record creation happen after the USSD session ends. The session returns END with a success message, then the server triggers the disbursement asynchronously.

### Implementation Pattern

```typescript
// apps/api/src/routes/ussd.ts
// Moolre callback payload: { sessionId, new, msisdn, network, message, extension, data }
router.post('/ussd', async (req, res) => {
  const { sessionId, msisdn, message, new: isNew } = req.body

  // Use Moolre's sessionId as the Redis key — guaranteed unique per session
  const sessionKey = `ussd:session:${sessionId}`
  let session = await redis.get(sessionKey)

  if (isNew || !session) {
    // New session — pre-compute everything
    const employee = await getEmployeeByPhone(msisdn)
    if (!employee) {
      return res.json({ message: 'Number not registered on Wagr. Contact your employer.', reply: false })
    }
    session = await initSession(employee)
    await redis.setex(sessionKey, 120, JSON.stringify(session))
  }

  const response = await handleStep(session, message)
  await redis.setex(sessionKey, 120, JSON.stringify(response.session))

  if (response.action === 'END') {
    await redis.del(sessionKey)
    if (response.triggerDisbursement) {
      triggerDisbursementAsync(response.advanceRequestId)  // Fire and forget
    }
  }

  res.send(formatResponse(response.action, response.message))
})

function formatResponse(action: 'CON' | 'END', message: string) {
  return `${action}\n${message}`
}
```

---

## Dependencies

| Story | Depends On |
|---|---|
| [ussd-session-handler] | [redis-setup] (Redis), [moolre-sandbox-tested] (Moolre sandbox tested) |
| [ussd-balance-step] | [ussd-session-handler], [earned-wage-calc], [max-advance-calc] (wage engine) |
| [ussd-amount-step] | [ussd-balance-step] |
| [ussd-confirm-step] | [ussd-amount-step] |
| [ussd-pin-step] | [ussd-confirm-step], [db-schema] (database) |
| [ussd-pin-setup] | [ussd-session-handler] |

---

## Files to Create

```
apps/api/src/routes/
└── ussd.ts

apps/api/src/lib/
├── ussd-session.ts       # Session read/write helpers
├── ussd-flow.ts          # Step handler logic
└── ussd-flow.test.ts     # Unit tests for each step
```
