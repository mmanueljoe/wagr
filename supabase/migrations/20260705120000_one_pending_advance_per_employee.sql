-- CLAUDE.md promises "a worker can have at most one pending advance at a
-- time, enforced by a unique partial Postgres index" — but the initial
-- schema never created it. Without it, a duplicate USSD session (two dials
-- racing, or Moolre re-firing a callback) can insert two pending rows and
-- double-disburse. Race conditions die at the DB layer, not in app code.
create unique index advance_requests_one_pending_per_employee_idx
  on advance_requests (employee_id)
  where status = 'pending';
