-- ==============================================================================
-- ShopNaija Demo Seed Data (Supabase Postgres)
-- 6 Fake Users (1 Admin, 5 Customers) - Default Password: password123
-- 12 Products (Prices in ₦)
-- 20 Fake Orders
-- ALL DATA IS DELIBERATELY FAKE FOR DEFENSIVE SECURITY EDUCATION
-- ==============================================================================

-- 1. Seed Fake Users into auth.users (if pgcrypto is available, using crypt for password123)
-- If running via Supabase Dashboard SQL Editor:
create extension if not exists pgcrypto;

do $$
declare
  admin_id uuid := 'a0000000-0000-0000-0000-000000000001';
  c1_id uuid := 'c0000000-0000-0000-0000-000000000001';
  c2_id uuid := 'c0000000-0000-0000-0000-000000000002';
  c3_id uuid := 'c0000000-0000-0000-0000-000000000003';
  c4_id uuid := 'c0000000-0000-0000-0000-000000000004';
  c5_id uuid := 'c0000000-0000-0000-0000-000000000005';
  pwd_hash text := crypt('password123', gen_salt('bf'));
begin
  -- Insert Auth Users
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    ('00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated', 'admin@shopnaija.demo', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Captain Admin (Demo)", "role":"admin"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', c1_id, 'authenticated', 'authenticated', 'chidi@shopnaija.demo', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Chidi Okafor (Fake)", "role":"customer"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', c2_id, 'authenticated', 'authenticated', 'amina@shopnaija.demo', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Amina Bello (Fake)", "role":"customer"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', c3_id, 'authenticated', 'authenticated', 'emeka@shopnaija.demo', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Emeka Nwosu (Fake)", "role":"customer"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', c4_id, 'authenticated', 'authenticated', 'folake@shopnaija.demo', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Folake Adeyemi (Fake)", "role":"customer"}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', c5_id, 'authenticated', 'authenticated', 'tunde@shopnaija.demo', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tunde Bakare (Fake)", "role":"customer"}', now(), now())
  on conflict (id) do nothing;

  -- Insert/Ensure Profiles exist
  insert into public.profiles (id, full_name, role) values
    (admin_id, 'Captain Admin (Demo)', 'admin'),
    (c1_id, 'Chidi Okafor (Fake)', 'customer'),
    (c2_id, 'Amina Bello (Fake)', 'customer'),
    (c3_id, 'Emeka Nwosu (Fake)', 'customer'),
    (c4_id, 'Folake Adeyemi (Fake)', 'customer'),
    (c5_id, 'Tunde Bakare (Fake)', 'customer')
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role;
end $$;

-- 2. Seed 12 Fake Nigerian-Themed Products
insert into public.products (id, name, price, image_url) values
  ('b0000000-0000-0000-0000-000000000001', 'Handwoven Aso-Oke Agbada Set', 45000, 'images/products/aso-oke.svg'),
  ('b0000000-0000-0000-0000-000000000002', 'Benin Bronze Replica Mask', 18500, 'images/products/benin-mask.svg'),
  ('b0000000-0000-0000-0000-000000000003', 'Organic Adire Indigo Silk Scarf', 12000, 'images/products/adire-scarf.svg'),
  ('b0000000-0000-0000-0000-000000000004', 'Jos Plateau Arabica Coffee (500g)', 8500, 'images/products/jos-coffee.svg'),
  ('b0000000-0000-0000-0000-000000000005', 'Calabar Chili Crisp Oil (250ml)', 4200, 'images/products/calabar-chili.svg'),
  ('b0000000-0000-0000-0000-000000000006', 'Handcrafted Kano Leather Slippers', 32000, 'images/products/kano-leather.svg'),
  ('b0000000-0000-0000-0000-000000000007', 'Gourmet Smokey Jollof Spice Jar', 3500, 'images/products/jollof-spice.svg'),
  ('b0000000-0000-0000-0000-000000000008', 'Pure Nilotica Shea Butter Cream', 6000, 'images/products/shea-butter.svg'),
  ('b0000000-0000-0000-0000-000000000009', 'Ankara Print Laptop Sleeve 15"', 9500, 'images/products/ankara-sleeve.svg'),
  ('b0000000-0000-0000-0000-000000000010', 'Beaded Coral Choker Necklace', 24000, 'images/products/coral-necklace.svg'),
  ('b0000000-0000-0000-0000-000000000011', 'Smoked Dried Catfish Fillet Pack', 15000, 'images/products/smoked-catfish.svg'),
  ('b0000000-0000-0000-0000-000000000012', 'Hand-Carved Talking Drum (Gangan)', 28000, 'images/products/talking-drum.svg')
on conflict (id) do nothing;

-- 3. Seed 20 Fake Orders Across Customers
-- Notice: Customers 1-5 have orders. When demonstrating IDOR, Customer 1 can change order ID to view Customer 2's or Customer 3's order.
insert into public.orders (
  id, user_id, product_id, quantity, total, delivery_name, delivery_address, delivery_phone, status, created_at
) values
  -- Orders for Chidi Okafor (Customer 1)
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, 45000, 'Chidi Okafor', '12 Fake Marina Street, Lagos Island, Lagos', '+234 800 000 0001', 'Processing', now() - interval '2 days'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 2, 17000, 'Chidi Okafor', '12 Fake Marina Street, Lagos Island, Lagos', '+234 800 000 0001', 'Shipped', now() - interval '5 days'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', 3, 10500, 'Chidi Okafor', '12 Fake Marina Street, Lagos Island, Lagos', '+234 800 000 0001', 'Delivered', now() - interval '10 days'),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000009', 1, 9500, 'Chidi Okafor', '12 Fake Marina Street, Lagos Island, Lagos', '+234 800 000 0001', 'Processing', now() - interval '1 hour'),

  -- Orders for Amina Bello (Customer 2) - PRIMARY IDOR TARGET IN DEMO
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000010', 1, 24000, 'Amina Bello (Confidential Customer)', 'Plot 404 Nowhere Close, Maitama, Abuja FCT', '+234 800 111 2222', 'Shipped', now() - interval '1 day'),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 1, 18500, 'Amina Bello', 'Plot 404 Nowhere Close, Maitama, Abuja FCT', '+234 800 111 2222', 'Delivered', now() - interval '8 days'),
  ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 2, 24000, 'Amina Bello', 'Plot 404 Nowhere Close, Maitama, Abuja FCT', '+234 800 111 2222', 'Processing', now() - interval '3 hours'),
  ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000008', 2, 12000, 'Amina Bello', 'Plot 404 Nowhere Close, Maitama, Abuja FCT', '+234 800 111 2222', 'Delivered', now() - interval '14 days'),

  -- Orders for Emeka Nwosu (Customer 3)
  ('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000006', 1, 32000, 'Emeka Nwosu', '77 NotReal Expressway, Independence Layout, Enugu', '+234 800 333 4444', 'Shipped', now() - interval '3 days'),
  ('d0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000012', 1, 28000, 'Emeka Nwosu', '77 NotReal Expressway, Independence Layout, Enugu', '+234 800 333 4444', 'Processing', now() - interval '4 hours'),
  ('d0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000011', 2, 30000, 'Emeka Nwosu', '77 NotReal Expressway, Independence Layout, Enugu', '+234 800 333 4444', 'Delivered', now() - interval '12 days'),
  ('d0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005', 4, 16800, 'Emeka Nwosu', '77 NotReal Expressway, Independence Layout, Enugu', '+234 800 333 4444', 'Processing', now() - interval '6 hours'),

  -- Orders for Folake Adeyemi (Customer 4)
  ('d0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 1, 45000, 'Folake Adeyemi', '5 Fake Secretariat Road, Bodija, Ibadan, Oyo', '+234 800 555 6666', 'Processing', now() - interval '1 day'),
  ('d0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 1, 12000, 'Folake Adeyemi', '5 Fake Secretariat Road, Bodija, Ibadan, Oyo', '+234 800 555 6666', 'Shipped', now() - interval '4 days'),
  ('d0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000010', 1, 24000, 'Folake Adeyemi', '5 Fake Secretariat Road, Bodija, Ibadan, Oyo', '+234 800 555 6666', 'Delivered', now() - interval '9 days'),
  ('d0000000-0000-0000-0000-000000000016', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000007', 2, 7000, 'Folake Adeyemi', '5 Fake Secretariat Road, Bodija, Ibadan, Oyo', '+234 800 555 6666', 'Cancelled', now() - interval '15 days'),

  -- Orders for Tunde Bakare (Customer 5)
  ('d0000000-0000-0000-0000-000000000017', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000006', 1, 32000, 'Tunde Bakare', '8 Fake Trans-Amadi Crescent, Port Harcourt, Rivers', '+234 800 777 8888', 'Processing', now() - interval '5 hours'),
  ('d0000000-0000-0000-0000-000000000018', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000008', 3, 18000, 'Tunde Bakare', '8 Fake Trans-Amadi Crescent, Port Harcourt, Rivers', '+234 800 777 8888', 'Shipped', now() - interval '6 days'),
  ('d0000000-0000-0000-0000-000000000019', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', 1, 8500, 'Tunde Bakare', '8 Fake Trans-Amadi Crescent, Port Harcourt, Rivers', '+234 800 777 8888', 'Delivered', now() - interval '11 days'),
  ('d0000000-0000-0000-0000-000000000020', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 2, 8400, 'Tunde Bakare', '8 Fake Trans-Amadi Crescent, Port Harcourt, Rivers', '+234 800 777 8888', 'Delivered', now() - interval '20 days')
on conflict (id) do nothing;
