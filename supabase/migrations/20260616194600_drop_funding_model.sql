-- Descope Model 2 — every employer pre-funds a float. The funding_model
-- column (and its index) no longer have a job; drop both.
--
-- Historical audit_log rows with action = 'employer_funding_model_set' stay
-- as-is — audit_log is append-only by design.

drop index if exists employers_funding_model_idx;

alter table employers
  drop column if exists funding_model;
