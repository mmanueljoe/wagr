-- Supabase's API roles still need table privileges before RLS policies or
-- service-role bypass can take effect. Local `supabase start` does not infer
-- these grants from table ownership, so keep the grants explicit.

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;

alter default privileges in schema public
  grant all privileges on sequences to service_role;

alter default privileges in schema public
  grant all privileges on functions to service_role;
