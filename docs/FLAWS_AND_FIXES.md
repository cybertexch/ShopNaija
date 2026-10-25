# ShopNaija: Flaws and Fixes Catalog

This document provides a comprehensive analysis of the 3 intentional security vulnerabilities embedded in **ShopNaija**, explaining where they exist, why they are dangerous, their real-world business impact, and how each is remediated.

---

## Flaw 1: Broken Access Control (Insecure Direct Object Reference - IDOR)

### 1. Tag & Location
* **Tag**: `-- VULN-1`
* **File**: `supabase/vulnerable.sql` and `public/js/orders.js`
* **Vulnerable Code**:
  ```sql
  create policy "orders_select_policy"
    on public.orders for select
    using (auth.role() = 'authenticated'); -- VULN-1
  ```

### 2. Why It Is Dangerous
Row Level Security (RLS) is intended to restrict which specific rows an authenticated user can read. The vulnerable policy checks only if a user is logged in (`auth.role() = 'authenticated'`), completely neglecting to verify if `auth.uid() = user_id`. Because order UUIDs are exposed in the URL (`/order.html?id=<order_id>`), any authenticated customer can swap the ID to view any other customer's order.

### 3. Business Impact
> **Customer data exposure & privacy violations:** Attackers harvest customer full names, physical home/work delivery addresses, and phone numbers across Nigeria, leading to stalker risks, social engineering scams, and severe NDPR/GDPR regulatory penalties.

### 4. The Fix (FIX-1)
* **File**: `supabase/fixed.sql`
* **Remediation**:
  ```sql
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
  ```
  Now, standard customers can only read rows that belong to them (`auth.uid() = user_id`), while administrators retain read access across all orders.

---

## Flaw 2: Exposed Third-Party Secret Key in Frontend Code

### 1. Tag & Location
* **Tag**: `// VULN-2`
* **File**: `public/js/supabaseClient.js`
* **Vulnerable Code**:
  ```javascript
  const DEMO_THIRD_PARTY_KEY = 'sk_demo_not_real_123'; // VULN-2: Exposed secret key in frontend bundle!
  ```

### 2. Why It Is Dangerous
Any code transmitted to a web browser (HTML, CSS, JavaScript) is fully accessible to anyone via DevTools (Sources tab, Network tab, or Console). Secret keys (payment gateways like Paystack/Flutterwave/Stripe, SMS providers, or internal service keys) must never be embedded in client-side code. While public keys (like the Supabase `anon` key) are designed for public distribution alongside strict RLS, private API keys grant elevated service rights.

### 3. Business Impact
> **Financial fraud risk & account takeover:** Threat actors extract the private key to trigger unauthorized transactions, drain merchant balances, send spam SMS at the company's expense, or abuse third-party API quotas.

### 4. The Fix (FIX-2)
* **Remediation**:
  1. Remove `DEMO_THIRD_PARTY_KEY` entirely from frontend JavaScript.
  2. Store the key as an encrypted environment variable in Vercel (`DEMO_THIRD_PARTY_KEY`).
  3. Reference the secret exclusively inside serverless functions (`process.env.DEMO_THIRD_PARTY_KEY`) running on the server.

---

## Flaw 3: Unprotected Serverless Admin Endpoint

### 1. Tag & Location
* **Tag**: `// VULN-3`
* **File**: `api/admin/orders.js`
* **Vulnerable Code**:
  ```javascript
  // api/admin/orders.js executes query and returns all orders without verifying JWT or user role
  const { data: orders } = await supabase.from('orders').select('*');
  return res.status(200).json({ orders });
  ```

### 2. Why It Is Dangerous
The backend route relies on "security through obscurity" (assuming that because `/admin.html` is linked in the navbar, only administrators will know about it). The API endpoint `/api/admin/orders` performs zero authentication and zero role authorization. An attacker does not even need an account; they can send an unauthenticated HTTP GET request from curl or a browser to dump the entire database of orders.

### 3. Business Impact
> **Catastrophic loss of customer trust & total database exfiltration:** Enables competitors or extortionists to scrape the platform's complete sales volume, pricing history, and full customer directory with a single HTTP request.

### 4. The Fix (FIX-3)
* **Remediation**:
  1. Extract the `Bearer <token>` from the HTTP `Authorization` header.
  2. Validate the JWT using Supabase Auth: `const { data: { user } } = await supabase.auth.getUser(token)`. If invalid, return `401 Unauthorized`.
  3. Query `public.profiles` for `user.id` and confirm `profile.role === 'admin'`. If role is not admin, return `403 Forbidden`.
  4. Only return orders once the caller is cryptographically proven to be an active administrator.
