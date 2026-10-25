-- ==============================================================================
-- VULNERABLE RLS POLICY FOR ORDERS (ShopNaija Cybersecurity Demo)
-- Flaw: IDOR (Insecure Direct Object Reference) / Broken Access Control
-- Tag: -- VULN-1
-- ==============================================================================

-- Ensure RLS is active on orders table
alter table public.orders enable row level security;

-- Drop any previous select policy
drop policy if exists "orders_select_policy" on public.orders;
drop policy if exists "Users can read own orders" on public.orders;
drop policy if exists "Allow logged in users to read orders" on public.orders;

-- VULN-1: OVERLY PERMISSIVE RLS POLICY
-- This policy only verifies that the user is authenticated (auth.role() = 'authenticated'),
-- but does NOT check if auth.uid() == user_id!
-- Consequently, any logged-in user can query ANY order in the database by changing
-- the order UUID in the URL parameter (?id=...) or direct API call.
create policy "orders_select_policy"
  on public.orders
  for select
  using (auth.role() = 'authenticated'); -- VULN-1

-- Allow logged in users to insert orders
drop policy if exists "orders_insert_policy" on public.orders;
create policy "orders_insert_policy"
  on public.orders
  for insert
  with check (auth.uid() = user_id);
