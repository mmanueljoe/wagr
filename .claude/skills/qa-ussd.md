---
description: Run a Wagr USSD scenario against the local api by simulating Moolre USSD callbacks. Use scenarios like "balance", "low-amount-reject", "pin-fail", "advance-success".
---

You are driving the USSD test simulator against the local api.

Steps:

1. Confirm the api is running on `http://localhost:3001`. If not, ask the user to start it with `pnpm --filter api dev`.
2. Ask which scenario to run if not specified. Available scenarios:
   - `balance` — worker dials, gets earned balance display
   - `advance-success` — full flow: balance → amount → confirm → PIN → disbursement triggered
   - `low-amount-reject` — worker tries to request below GHS 10 minimum
   - `over-max-reject` — worker tries to request above max advance
   - `pin-fail` — worker enters wrong PIN three times
   - `new-pin-setup` — new worker sets PIN for the first time
3. Run `pnpm test:ussd-sim --scenario=<name>`. The simulator POSTs Moolre-shaped callbacks at the api's `/ussd` endpoint and asserts the response shape.
4. Report each step's request and response. Highlight anything that didn't match expectations.
5. If the test fails, suggest where to look first based on the failure mode (e.g. "Step 3 returned `reply: false` but expected `true` — check the session state at `apps/api/src/lib/ussd-session.ts`").

## Rules

- Always test against the local api, never the deployed one.
- The simulator uses Moolre's sandbox network codes (3=MTN, 5=AT, 6=Telecel for USSD). See `docs/architecture/moolre-api-reference.md` if confused about codes.
- If the user wants to test against a real phone, point them at the `[moolre-sandbox-tested]` spec — that requires ngrok and is out of scope for this skill.
