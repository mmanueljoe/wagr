-- Make employers.funding_model nullable + drop the default. We need a NULL
-- state to mean "employer hasn't picked yet" so the onboarding screen has
-- something to gate on. Once they pick (Model 1 or Model 2) the column is set.
-- Per [funding-model-select].

alter table employers
  alter column funding_model drop default,
  alter column funding_model drop not null;
