# ShopNaija - Deliberately Vulnerable Demo E-Commerce App

A defensive cybersecurity training application built for community live events (e.g. TikTok LIVE sessions), modeled after OWASP Juice Shop and DVWA.

> ⚠️ **EDUCATIONAL DEMO ONLY**: All customer names, order tracking numbers, addresses, phone numbers, and API keys in this repository are fictitious. No real transactions or external services are connected.

---

## Tech Stack
* **Frontend**: Plain HTML5, Vanilla CSS (Design Tokens, responsive grid, mobile-first), Vanilla ES Modules (no build step). Supabase JS Client via CDN.
* **Backend**: Supabase (PostgreSQL with Row Level Security + Supabase Auth) & Vercel Serverless Functions (`/api`).
* **Hosting**: Vercel.

---

## Intentional Vulnerabilities Overview

| Tag | Vulnerability | Location | Remediation |
| :--- | :--- | :--- | :--- |
| **`VULN-1`** | **Broken Access Control (IDOR)** | `supabase/vulnerable.sql` | Replace permissive policy with ownership check (`auth.uid() = user_id`) in `supabase/fixed.sql`. |
| **`VULN-2`** | **Exposed Secret Key in Client JS** | `public/js/supabaseClient.js` | Remove key from frontend bundle; store in Vercel backend environment variables. |
| **`VULN-3`** | **Unprotected Admin API Endpoint** | `api/admin/orders.js` | Validate Supabase JWT Bearer token and require `profiles.role === 'admin'`. |

---

## Quick Setup & Local Running

### 1. Database Setup (Supabase)
1. Create a free project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase Dashboard:
   - Run `supabase/schema.sql` to create tables and triggers.
   - Run `supabase/seed.sql` to insert the 6 demo users, 12 products, and 20 sample orders.
   - For the **vulnerable state**, run `supabase/vulnerable.sql`.
   - For the **fixed state**, run `supabase/fixed.sql`.

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DEMO_THIRD_PARTY_KEY=sk_demo_not_real_123
```

### 3. Run Locally
Because the frontend uses plain static files and ES modules, you can serve it with any local HTTP server:

```bash
# Option A: Using Vercel CLI (recommended to run serverless functions in /api)
npx vercel dev

# Option B: Plain static server (for frontend testing)
npx serve public
# or
python -m http.server 3000 -d public
```
Open `http://localhost:3000` in your browser.

---

## Deploying to Vercel

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Environment Variables in Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DEMO_THIRD_PARTY_KEY`
4. **Safety requirement for `vulnerable` branch**:
   - Go to your Vercel Project Settings -> **Deployment Protection**.
   - Enable **Password Protection** so the intentionally vulnerable build is never accessible to unauthorized scanners on the open internet.
5. Deploy!

---

## Switching Between Branches

The project is structured with two branches:
* **`vulnerable`**: Contains the flawed version with all 3 vulnerabilities active.
* **`fixed`**: Contains the clean, remediated version with the 3 security fixes applied as separate commits.

To switch branches locally:
```bash
# Checkout vulnerable version
git checkout vulnerable

# Checkout fixed version
git checkout fixed
```

---

## Educational Documentation
* [Architecture & Flow Diagrams](docs/ARCHITECTURE.md): Detailed Mermaid system diagrams and sequence flows.
* [Flaws and Fixes Catalog](docs/FLAWS_AND_FIXES.md): In-depth breakdown of danger and business impact.
* [Manual Test Script](docs/TEST_SCRIPT.md): Step-by-step speaker guide for live demonstrations.
