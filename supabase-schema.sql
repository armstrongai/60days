-- 45Days licenses — run in Supabase SQL Editor (all at once).
-- Student data never touches this table; license status only.

create table if not exists public.licenses (
  email text primary key,
  status text not null default 'trial',
  trial_start date not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh on UPDATE (trigger).
create or replace function public.licenses_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists licenses_updated_at on public.licenses;
create trigger licenses_updated_at
  before update on public.licenses
  for each row
  execute function public.licenses_set_updated_at();

-- Single-row lookup for the anon client (no direct table SELECT for anon).
-- Returns updated_at so the app can apply a grace period when status is past_due.
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

revoke all on public.licenses from public;
revoke all on public.licenses from anon;
revoke all on public.licenses from authenticated;

grant usage on schema public to anon, authenticated;

-- Anon may only execute the RPC (one email per call); not bulk reads.
grant execute on function public.get_license_status(text) to anon, authenticated;

-- RLS: block direct table access for anon/authenticated; service_role bypasses RLS for webhooks.
alter table public.licenses enable row level security;

-- Optional explicit deny patterns are unnecessary when no SELECT/INSERT policies exist for anon;
-- service_role still has full access for the Netlify function.

comment on table public.licenses is '45Days license rows; updated by Stripe webhook (service role) only.';

-- RLS summary (enforced above):
-- • anon / authenticated: no direct SELECT/INSERT/UPDATE/DELETE on public.licenses (RLS enabled, no permissive policies).
-- • anon may call public.get_license_status(email) only — returns at most one row; no bulk table reads.
-- • Service role (Netlify function): bypasses RLS — full insert/update for Stripe webhooks.
