# ShopNaija: Live Speaker Manual Test Script

This script provides step-by-step instructions for the security speaker during the TikTok LIVE session. All tests use only the browser and Chrome/Edge DevTools (no automated attack tools, scripts, or scanners).

---

## Pre-Test Setup
1. Open the application in your browser (e.g. `http://localhost:3000` or your Vercel deployment URL).
2. Ensure you have the Chrome/Edge DevTools open (`F12` or `Ctrl + Shift + I` / `Cmd + Option + I`).

---

## Test 1: Broken Access Control / IDOR (VULN-1)

### Business Impact (One-Line)
> **Customer data exposure:** An attacker reads personal delivery addresses, full names, and phone numbers belonging to other users.

### Step-by-Step Instructions
1. Navigate to `login.html`.
2. Click the quick-fill chip **Customer 1 (Chidi)** (or enter `chidi@shopnaija.demo` / `password123`) and click **Sign In**.
3. You will be redirected to `orders.html`. Click **View Details →** on Chidi's top order.
4. Look at your browser address bar. The URL will look like:
   `http://.../order.html?id=d0000000-0000-0000-0000-000000000001`
5. In the address bar, replace the ID with Customer 2 (Amina Bello)'s order UUID:
   `http://.../order.html?id=d0000000-0000-0000-0000-000000000005`
6. Press **Enter** to navigate.

### Expected Result on `vulnerable` Branch
* The page displays Customer 2's order!
* You see **Amina Bello (Confidential Customer)**, her Maitama Abuja address, and her private phone number, along with the warning banner:
  `🚨 VULN-1 IDOR ACTIVE: You are viewing another customer's order!`

### Expected Result on `fixed` Branch
* The page blocks access and displays:
  `🛡️ Access Denied: Order could not be loaded or does not belong to you.`
* The underlying Supabase RLS engine returns zero rows because `auth.uid() != user_id`.

---

## Test 2: Exposed Third-Party Secret Key (VULN-2)

### Business Impact (One-Line)
> **Financial fraud risk:** Anyone can steal private merchant API keys to initiate unauthorized transactions or drain account credit.

### Step-by-Step Instructions
1. Open any page of ShopNaija (e.g. `index.html` or `login.html`).
2. Open DevTools and switch to the **Console** tab.
3. Observe the startup logs.
4. Alternatively, switch to the **Sources** tab (or **Debugger** in Firefox), press `Ctrl + P` (or `Cmd + P`), search for `supabaseClient.js`, and inspect lines 10–18.

### Expected Result on `vulnerable` Branch
* The secret key is clearly visible in plain text:
  `sk_demo_not_real_123`
* A console warning explicitly announces the exposed key in the frontend bundle.

### Expected Result on `fixed` Branch
* `DEMO_THIRD_PARTY_KEY` is completely removed from all client-side JavaScript files.
* Searching the Sources or Network tabs for `sk_demo` yields zero results. The key is securely stored in Vercel backend environment variables.

---

## Test 3: Unprotected Admin Endpoint (VULN-3)

### Business Impact (One-Line)
> **Loss of customer trust & total database compromise:** Any anonymous stranger on the internet can exfiltrate your entire sales history and customer roster.

### Step-by-Step Instructions
1. Open a **New Incognito / Private Window** (so that you are completely logged out).
2. Directly navigate to:
   `http://.../api/admin/orders`
3. Alternatively, open DevTools -> Console and paste:
   ```javascript
   fetch('/api/admin/orders').then(r => r.json()).then(console.log);
   ```
4. Or open `admin.html` while logged in as a normal customer (Chidi).

### Expected Result on `vulnerable` Branch
* The server responds with `HTTP 200 OK`.
* The browser displays raw JSON containing all 20 customer orders, including customer names, phone numbers, addresses, and purchase amounts.
* If viewed via `admin.html`, the banner displays:
  `🚨 VULN-3 UNPROTECTED ADMIN ENDPOINT DETECTED!`

### Expected Result on `fixed` Branch
* The server responds with `HTTP 401 Unauthorized` (if unauthenticated) or `HTTP 403 Forbidden` (if authenticated as a customer).
* Response JSON:
  ```json
  { "error": "Unauthorized: Missing or invalid token" }
  ```
  or
  ```json
  { "error": "Forbidden: User does not hold the admin role" }
  ```
* Only logging in as **Captain Admin** (`admin@shopnaija.demo`) grants access.
