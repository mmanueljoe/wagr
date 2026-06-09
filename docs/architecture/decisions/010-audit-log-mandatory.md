# 010. Append-only audit log on every state change

Date: 2026-06-09
Status: Accepted

## Context

When something goes wrong — a worker reports they didn't receive an
advance, an employer reports an employee was deactivated by mistake, a
disbursement amount looks off — we need to reconstruct exactly what
happened and who triggered it. `console.log` is not enough; logs rotate
and don't survive incident response. We need a durable record.

## Decision

Every state change that affects money or identity writes one row to the
`audit_log` table.

The table is **append-only** — never UPDATE, never DELETE. The triggering
event is captured with enough context to replay reasoning:

- `action` — short snake_case verb (`employer_register`,
  `advance_requested`, `disbursement_succeeded`, `pin_failed`,
  `employee_deactivated`).
- `actor` — `employer`, `worker`, or `system`.
- `employer_id` / `employee_id` — set whichever applies.
- `metadata` — jsonb with the event-specific payload (amount, request
  body summary, Moolre transaction id, etc.). PII is redacted (no full
  names, no salary in plain text — use ids).
- `created_at` — UTC timestamptz.

A small shared helper (`audit({ action, actor, ...ids, metadata })`)
hides the insert boilerplate.

## Consequences

**Accepted:**

- Every employer write endpoint and every USSD step calls `audit(...)`.
  Forgetting is a code-review smell — adding a lint rule or a route-level
  wrapper enforces it later.
- The table grows monotonically. Plan storage and a retention policy
  (we'll move rows older than 2 years to cold storage, but not for V1).

**Gained:**

- Incident response is "query the audit log" instead of "grep the logs
  and hope they weren't rotated."
- Auditors and partners (Moolre, future bank partners) can see a clear
  trail of every money operation.
- Disputes resolve faster — we can prove what the user did and when.

## What goes in, what stays out

In:
- Auth events: register, login, logout, failed login.
- Money events: advance requested, disbursement succeeded/failed,
  repayment initiated, repayment completed.
- Identity events: employee added, employee deactivated, PIN set, PIN
  failed, employer settings changed.
- External callbacks: Moolre webhook received (with code only, not body).

Out:
- Read-only operations (GET /employees, GET /advances). They generate
  too much noise and don't need replay.
- Health checks, internal cron heartbeats.

## References

- [OWASP ASVS V7 — Logging and Error Handling](https://github.com/OWASP/ASVS/blob/master/4.0/en/0x15-V7-Error-Logging.md)
