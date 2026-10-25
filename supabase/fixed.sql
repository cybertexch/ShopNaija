-- ==============================================================================
-- FIXED RLS POLICY FOR ORDERS (ShopNaija Cybersecurity Demo)
-- Fix: Enforce Broken Access Control prevention on orders table
-- Tag: -- FIX-1 (Remediates VULN-1)
-- ==============================================================================

-- Ensure RLS is active on orders table
alter table public.orders enable row level security;

-- Drop the vulnerable permissive policy
drop policy if exists "orders_select_policy" on public.orders;
drop policy if exists "Users can read own orders" on public.orders;
drop policy if exists "Allow logged in users to read orders" on public.orders;

-- FIX-1: SECURE RLS SELECT POLICY
-- A user can ONLY read an order if:
-- 1. They are the owner of the order (auth.uid() = user_id)
-- OR
-- 2. They possess the 'admin' role in the profiles table
create policy "orders_select_policy"
  on public.orders
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Ensure secure insert policy
drop policy if exists "orders_insert_policy" on public.orders;
create policy "orders_insert_policy"
  on public.orders
  for insert
  with check (auth.uid() = user_id);
