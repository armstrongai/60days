-- Run in Supabase SQL editor if you already applied supabase-schema.sql (v1 RPC).
-- Replaces get_license_status to return updated_at for past_due grace handling in the app.

drop function if exists public.get_license_status(text);

create or replace function public.get_license_status(check_email text)
returns table (status text, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select l.status, l.updated_at
  from public.licenses l
  where l.email = lower(trim(check_email))
  limit 1;
$$;

grant execute on function public.get_license_status(text) to anon, authenticated;
