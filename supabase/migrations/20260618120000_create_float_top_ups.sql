-- One row per Moolre Payments call initiated to top up an employer's float.
-- Acts as the source of truth for top-up history + idempotency (the
-- moolre_external_ref is the Moolre idempotency key).
--
-- amount is numeric(12,2) cedis to stay consistent with advance_requests
-- and the rest of the money columns. The marshalling layer converts to
-- integer pesewas at the application boundary (ADR 008).

create table float_top_ups (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  moolre_external_ref text not null unique,
  moolre_transaction_id text,
  failure_reason text,
  initiated_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index float_top_ups_employer_status_idx on float_top_ups (employer_id, status);
create index float_top_ups_initiated_at_idx on float_top_ups (initiated_at desc);

create trigger float_top_ups_set_updated_at
  before update on float_top_ups
  for each row execute function set_updated_at();

alter table float_top_ups enable row level security;

-- Employer can read their own top-up history. Defence in depth; the api uses
-- the service-role key and is authoritative for business rules.
create policy float_top_ups_select_own
  on float_top_ups for select
  using (employer_id = auth.uid());
