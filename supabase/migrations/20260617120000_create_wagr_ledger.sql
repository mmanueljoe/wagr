-- Wagr revenue ledger — one row per advance fee accrual. Total Wagr revenue
-- at any point is sum(fee_amount). Append-only: no updates, no deletes. This
-- is the source of truth for the slice of Wagr's Moolre wallet that belongs
-- to Wagr (not to any employer's float). See
-- docs/specs/feature-disbursements.md (Float accounting model).
--
-- fee_amount is numeric(12,2) cedis to match advance_requests.fee_amount.
-- The marshalling layer converts to integer pesewas at the application
-- boundary (see ADR 008).

create table wagr_ledger (
  id uuid primary key default gen_random_uuid(),
  advance_request_id uuid not null references advance_requests(id) on delete restrict,
  fee_amount numeric(12, 2) not null check (fee_amount > 0),
  accrued_at timestamptz not null default now()
);

-- One ledger row per advance — protects against double-accrual on retry.
create unique index wagr_ledger_advance_request_unique on wagr_ledger (advance_request_id);
create index wagr_ledger_accrued_at_idx on wagr_ledger (accrued_at desc);

alter table wagr_ledger enable row level security;
-- No policies — only the api (service-role key) reads or writes this table.
-- RLS stays on as defence-in-depth per CLAUDE.md.
