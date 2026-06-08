-- Initial Wagr schema. See docs/specs/ for the spec sources behind each column.
-- Conventions:
--   * snake_case for all column names
--   * UUID primary keys, generated with gen_random_uuid()
--   * timestamptz with default now() for created_at / updated_at
--   * monetary amounts as numeric(12,2) — never float
--   * text + CHECK for constrained enums (easier to evolve than Postgres enums)

-- ============================================================================
-- Helpers
-- ============================================================================

create extension if not exists "pgcrypto";

-- Sets updated_at = now() on every UPDATE. Attached per-table below.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- employers
-- ============================================================================
-- One row per company on the platform. id == auth.users.id (Supabase Auth user).

create table employers (
  id uuid primary key references auth.users(id) on delete cascade,
  company_name text not null,
  email text not null unique,
  phone text not null,
  industry text not null check (industry in (
    'healthcare', 'education', 'retail', 'hospitality', 'manufacturing', 'other'
  )),
  pay_date smallint not null check (pay_date between 1 and 31),
  funding_model text not null check (funding_model in ('model1', 'model2')),
  float_balance numeric(12, 2) not null default 0 check (float_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employers_funding_model_idx on employers (funding_model);

create trigger employers_set_updated_at
  before update on employers
  for each row execute function set_updated_at();

-- ============================================================================
-- employees
-- ============================================================================
-- One row per worker on an employer's workforce.

create table employees (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  full_name text not null,
  momo_number text not null check (momo_number ~ '^[0-9]{10}$'),
  network text not null check (network in ('mtn', 'telecel', 'at')),
  monthly_salary numeric(12, 2) not null check (monthly_salary > 0),
  start_date date not null,
  is_active boolean not null default true,
  ussd_pin_hash text,
  credit_flag boolean not null default false,
  credit_flag_reason text,
  credit_flag_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (employer_id, momo_number)
);

create index employees_employer_id_idx on employees (employer_id);
create index employees_employer_active_idx on employees (employer_id) where is_active = true;
create index employees_momo_number_idx on employees (momo_number);
create index employees_credit_flag_idx on employees (employer_id) where credit_flag = true;

create trigger employees_set_updated_at
  before update on employees
  for each row execute function set_updated_at();

-- ============================================================================
-- advance_requests
-- ============================================================================
-- One row per advance attempt by a worker.

create table advance_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete restrict,
  employer_id uuid not null references employers(id) on delete restrict,
  requested_amount numeric(12, 2) not null check (requested_amount > 0),
  fee_amount numeric(12, 2) not null check (fee_amount >= 0),
  net_disbursed numeric(12, 2) not null check (net_disbursed > 0),
  status text not null check (status in ('pending', 'disbursed', 'failed', 'repaid')),
  moolre_external_ref text not null unique,
  moolre_transaction_id text,
  failure_reason text,
  requested_at timestamptz not null default now(),
  disbursed_at timestamptz,
  repaid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index advance_requests_employer_status_idx on advance_requests (employer_id, status);
create index advance_requests_employee_idx on advance_requests (employee_id);
create index advance_requests_requested_at_idx on advance_requests (requested_at desc);

create trigger advance_requests_set_updated_at
  before update on advance_requests
  for each row execute function set_updated_at();

-- ============================================================================
-- repayments
-- ============================================================================
-- One row per payday-recovery attempt (employer-level Collections call).
-- Multiple advance_requests roll up into one repayment.

create table repayments (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete restrict,
  total_amount numeric(12, 2) not null check (total_amount > 0),
  advance_request_ids uuid[] not null,
  status text not null check (status in ('pending', 'collected', 'failed')),
  moolre_external_ref text not null unique,
  failure_reason text,
  initiated_at timestamptz not null default now(),
  collected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index repayments_employer_idx on repayments (employer_id);
create index repayments_status_idx on repayments (status);

create trigger repayments_set_updated_at
  before update on repayments
  for each row execute function set_updated_at();

-- ============================================================================
-- audit_log
-- ============================================================================
-- Append-only event log. Inserts only — never UPDATE or DELETE.
-- Use jsonb `metadata` for variable per-action payload.

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor text not null check (actor in ('employer', 'worker', 'system')),
  employer_id uuid,
  employee_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_employer_idx on audit_log (employer_id, created_at desc);
create index audit_log_action_idx on audit_log (action, created_at desc);

-- ============================================================================
-- Row-Level Security
-- ============================================================================
-- The api uses the service-role key, which bypasses RLS. RLS is here to make
-- direct database access (or accidental anon-key use) safe by default.
--
-- Spec acceptance criteria requires RLS on employers, employees,
-- advance_requests. We RLS-enable the rest too with no policies, which means
-- the anon key cannot read them at all — defensive default.

alter table employers enable row level security;
alter table employees enable row level security;
alter table advance_requests enable row level security;
alter table repayments enable row level security;
alter table audit_log enable row level security;

-- Employer can read their own employer row.
create policy employers_select_own
  on employers for select
  using (auth.uid() = id);

-- Employer can update their own employer row (limited columns — we'll add column-level checks in app code).
create policy employers_update_own
  on employers for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Employer can read their own employees.
create policy employees_select_own
  on employees for select
  using (employer_id = auth.uid());

-- Employer can read their own advance_requests.
create policy advance_requests_select_own
  on advance_requests for select
  using (employer_id = auth.uid());
