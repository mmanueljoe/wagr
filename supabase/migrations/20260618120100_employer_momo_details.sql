-- Float funding pulls money from the employer's own MoMo wallet, so we need
-- to know which number and network to charge. Neither field was captured at
-- registration — adding both as nullable so existing rows don't break, and
-- the float-funding flow asks for them the first time an employer tops up.
--
-- The CHECK on momo_number mirrors what we enforce on employees.momo_number
-- (10-digit local Ghanaian format).

alter table employers
  add column momo_number text check (momo_number is null or momo_number ~ '^[0-9]{10}$'),
  add column network text check (network is null or network in ('mtn', 'telecel', 'at'));
