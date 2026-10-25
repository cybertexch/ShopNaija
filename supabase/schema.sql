-- ==============================================================================
-- ShopNaija Demo Database Schema (Supabase Postgres)
-- Purpose: Defensive cybersecurity educational demo app for TikTok LIVE training
-- ==============================================================================

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz default now() not null
);

-- 2. Products Table (12 fake Nigerian-themed products)
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric not null check (price >= 0),
  image_url text not null,
  created_at timestamptz default now() not null
);

-- 3. Orders Table
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity integer not null default 1 check (quantity > 0),
  total numeric not null check (total >= 0),
  delivery_name text not null,
  delivery_address text not null,
  delivery_phone text not null,
  status text not null default 'Processing' check (status in ('Processing', 'Shipped', 'Delivered', 'Cancelled')),
  created_at timestamptz default now() not null
);

-- 4. Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- 4b. Secure Orders Policy (FIX-1)
-- Users can only read their own orders unless they hold the admin role
drop policy if exists "orders_select_policy" on public.orders;
create policy "orders_select_policy"
  on public.orders for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

drop policy if exists "orders_insert_policy" on public.orders;
create policy "orders_insert_policy"
  on public.orders for insert
  with check (auth.uid() = user_id);

-- 5. Standard Public Policies for Products
drop policy if exists "Anyone can read products" on public.products;
create policy "Anyone can read products"
  on public.products for select
  using (true);

-- 6. Standard Policies for Profiles
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 7. Trigger to automatically create a profile entry upon user signup in auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Customer ' || substr(new.id::text, 1, 6)),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
