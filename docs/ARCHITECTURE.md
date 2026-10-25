# ShopNaija Architecture Specification

This document details the defensive security architecture for **ShopNaija**, a purposefully vulnerable e-commerce training application built for TikTok LIVE cybersecurity sessions.

---

## 1. System Architecture

```mermaid
graph TD
    subgraph Client ["Client Layer (Browser)"]
        UI["Vanilla HTML5 / CSS / ES Modules<br/>(No Build Step)"]
        ClientAuth["Supabase JS Client (CDN)<br/>Handles Auth JWTs & RLS Requests"]
    end

    subgraph Vercel ["Hosting & Compute (Vercel)"]
        StaticCDN["Edge CDN<br/>Static Assets: /public/*<br/>(HTML, CSS, JS, Images)"]
        ServerlessFunc["Serverless API<br/>/api/admin/orders.js<br/>(Node.js Runtime)"]
    end

    subgraph Supabase ["Backend as a Service (Supabase)"]
        SupaAuth["Supabase Auth (GoTrue)<br/>auth.users & JWT Tokens"]
        Postgres["PostgreSQL Database<br/>profiles, products, orders"]
        RLS["Row Level Security (RLS) Engine<br/>Enforces Row-Level Access Policies"]
    end

    UI -->|"Fetches HTML/CSS/JS"| StaticCDN
    UI -->|"Direct DB Queries (with JWT)"| RLS
    UI -->|"Invokes Admin API"| ServerlessFunc
    ServerlessFunc -->|"Queries Orders via Service Key"| Postgres
    RLS -->|"Filters rows based on auth.uid()"| Postgres
    ClientAuth -->|"Login / Sign Up / Token Refresh"| SupaAuth
```

---

## 2. Request Flow: Viewing an Order (Vulnerable vs. Fixed)

### A. Vulnerable Request Flow (VULN-1 IDOR)
An attacker (authenticated as Customer A) changes the order ID parameter to request Customer B's order.

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Customer A (Chidi)
    participant Browser as Browser (order.html?id=CustomerB_Order)
    participant SupaRLS as Supabase RLS Engine
    participant DB as Postgres (orders table)

    Attacker->>Browser: Enters URL with Customer B's Order UUID
    Browser->>SupaRLS: SELECT * FROM orders WHERE id = CustomerB_Order<br/>(Bearer Token: Customer A)
    Note over SupaRLS: Check Policy: auth.role() = 'authenticated'<br/>⚠️ FLAW: Does NOT check auth.uid() = user_id!
    SupaRLS->>DB: Query allowed! Fetch order row
    DB-->>SupaRLS: Returns Customer B's Order Data
    SupaRLS-->>Browser: HTTP 200 OK (Exposes Address, Phone, Items)
    Browser-->>Attacker: Displays Customer B's Private Delivery Information
```

### B. Fixed Request Flow (Remediated Access Control)
The secure policy verifies that the authenticated user either owns the row or holds the `admin` role.

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Customer A (Chidi)
    participant Browser as Browser (order.html?id=CustomerB_Order)
    participant SupaRLS as Supabase RLS Engine
    participant DB as Postgres (orders table)

    Attacker->>Browser: Enters URL with Customer B's Order UUID
    Browser->>SupaRLS: SELECT * FROM orders WHERE id = CustomerB_Order<br/>(Bearer Token: Customer A)
    Note over SupaRLS: Check Policy: auth.uid() = user_id OR role = 'admin'<br/>🔒 Customer A UID != Customer B UID
    SupaRLS-->>Browser: HTTP 404 / 403 (Zero rows returned)
    Browser-->>Attacker: Access Denied: You cannot view another customer's order
```

---

## 3. Request Flow: Admin Orders Endpoint (Vulnerable vs. Fixed)

### A. Vulnerable Admin Endpoint (VULN-3 Unprotected API)

```mermaid
sequenceDiagram
    autonumber
    actor Unauth as Anonymous Caller / Browser
    participant API as /api/admin/orders.js
    participant DB as Postgres Database

    Unauth->>API: GET /api/admin/orders (No Auth Header)
    Note over API: ⚠️ FLAW: Zero authentication or role checks performed!
    API->>DB: Query all rows using service key
    DB-->>API: Returns 20 customer orders
    API-->>Unauth: HTTP 200 OK (Full database dump returned to public)
```

### B. Fixed Admin Endpoint (Server-Side JWT & Role Verification)

```mermaid
sequenceDiagram
    autonumber
    actor Unauth as Anonymous Caller
    participant API as /api/admin/orders.js
    participant SupaAuth as Supabase Auth & Profiles

    Unauth->>API: GET /api/admin/orders (No token or Non-Admin token)
    API->>SupaAuth: Validate Bearer token & verify profile role = 'admin'
    alt Missing Token or Invalid JWT
        SupaAuth-->>API: Invalid or missing token
        API-->>Unauth: HTTP 401 Unauthorized
    else Valid Token but role == 'customer'
        SupaAuth-->>API: User is verified customer, not admin
        API-->>Unauth: HTTP 403 Forbidden
    else Valid Token and role == 'admin'
        SupaAuth-->>API: User is confirmed Administrator
        API->>DB: Fetch all orders
        DB-->>API: Return order rows
        API-->>Unauth: HTTP 200 OK (Orders returned to Admin only)
    end
```

---

## 4. Branch & Deployment Workflow

```mermaid
gitGraph
    commit id: "Initial Commit (Base Architecture)"
    branch vulnerable
    checkout vulnerable
    commit id: "Add VULN-1 (Permissive RLS in vulnerable.sql)"
    commit id: "Add VULN-2 (Exposed API Key in frontend)"
    commit id: "Add VULN-3 (Unprotected /api/admin/orders)"
    checkout master
    branch fixed
    checkout fixed
    merge vulnerable
    commit id: "FIX-1: Replace RLS policy (supabase/fixed.sql)"
    commit id: "FIX-2: Move secret key to Vercel backend env var"
    commit id: "FIX-3: Add JWT & Admin role verification to /api/admin/orders"
```

### Deployment Guidelines:
* **`vulnerable` branch**:
  - Run locally (`npx serve public` or `vercel dev`) OR
  - Deploy to Vercel with **Deployment Protection** (Password Protection enabled in Vercel Project Settings) so it is never publicly exposed on the open internet.
* **`fixed` branch**:
  - Can be deployed as standard production to show the remediated state.
