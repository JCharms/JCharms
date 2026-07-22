# J Charms — Developer Guide

A plain-English walkthrough of how this store is built: the mental model, how a
request flows end to end, every control in the admin panel, and step-by-step
setup for the external services (Supabase, Razorpay, Resend + custom email SMTP).

If you just want commands and conventions, see `CLAUDE.md`. This document is the
"why and how".

---

## 1. The 30-second mental model

There is **no custom backend server**. The app is a React single-page app that
talks directly to **Supabase** (a hosted Postgres + Auth + Storage + serverless
"Edge Functions" platform).

Two things make that safe and organised:

1. **Row Level Security (RLS).** Every database table has SQL rules attached that
   decide who can read/write which rows. The browser holds only the *public anon
   key* — it can't do anything the RLS rules don't allow. So even though the
   frontend "talks to the database directly", it can only ever see/do what the
   rules permit.

2. **Edge Functions for anything sensitive.** Money and email can't be trusted to
   the browser, so order creation, payment verification, guest order lookup, and
   transactional emails all run server-side in Edge Functions that use the
   powerful *service-role key* (which never leaves the server).

Everything else — browsing products, the cart, the admin panel — is the React app
reading and writing Supabase under RLS.

```
Browser (React SPA, anon key)
        │
        ├── reads/writes tables directly  ──►  Supabase Postgres (RLS enforced)
        │
        └── calls Edge Functions for money/email ──► Edge Function (service-role key)
                                                            │
                                                            ├── Razorpay (payments)
                                                            └── Resend (emails)
```

---

## 2. The layering (how code is organised)

Data never gets fetched "wherever". It flows through fixed layers so a change has
a small blast radius:

```
Component (.tsx)                     ← renders UI, no data logic
   │  calls
Feature hook (features/*/hooks.ts)   ← TanStack Query: caching, loading, refetch
   │  calls
Repository (src/data/*.ts)           ← the ONLY place supabase.from(...) is used
   │  uses
Supabase client (src/lib/supabaseClient.ts)
```

**The one rule:** components and hooks never call `supabase.from(...)` directly.
They call a function from `src/data/*`. That folder is the entire surface area
that touches the database — if you ever swapped Supabase for something else, this
is the only folder you'd rewrite.

### The pieces

- **`src/data/*`** — "repositories". One file per domain (`products.ts`,
  `orders.ts`, `reviews.ts`, `categories.ts`, `settings.ts`, `auth.ts`,
  `storage.ts`, `analytics.ts`). `_helpers.ts` has `unwrap`/`unwrapList` (turn a
  Supabase `{ data, error }` into a value or a readable thrown error) and the
  `BUCKET` names for Storage.
- **`src/features/*`** — one folder per feature (products, checkout, orders, auth,
  admin, reviews, cart). Each has its own `hooks.ts`, pages, and components. This
  is where almost all UI lives.
- **`src/lib/*`** — cross-cutting helpers: the Supabase client, the TanStack Query
  client + **central query keys**, env-var validation, formatting, the Razorpay
  loader, link builders.
- **`src/components/ui/*`** — the design system (Button, Input, Card, Modal, …).
  Everything visual pulls from here so styling stays consistent.
- **`src/store/*`** — Zustand stores for client-only state: the shopping `cart`
  and small `ui` state (toasts, cart drawer open/closed).
- **`src/types/database.ts`** — hand-owned type aliases (`Product`, `Order`, …)
  re-exported from `database.generated.ts` (auto-generated from the DB — never
  hand-edit it; regenerate with `npm run db:types` after a migration).

### Why TanStack Query (the hooks)

`useQuery`/`useMutation` give you caching, loading/error states, and automatic
refetching for free. Cache keys are **centralised in `src/lib/queryClient.ts`**
(`queryKeys`). When a mutation changes data, it "invalidates" the relevant keys so
the screens showing that data refetch. Example: adding a product invalidates
`['admin','products']` and `['products']`, so both the admin list and the
storefront update without a manual refresh.

---

## 3. How each major flow works

### a. Browsing the shop (pure RLS reads)
`HomePage`/`ShopPage` → `useProducts()` → `listProducts()` in `data/products.ts`
→ `supabase.from('products').select(...)`. RLS lets anyone read **active**
products, so no auth needed. Images come from the public `product-images`
Storage bucket via a public URL.

### b. The cart (client-only, no server)
`src/store/cart.ts` is a Zustand store persisted to `localStorage`. Adding to
cart never hits the server. `dm_only` products (custom work) aren't purchasable
on-site — they deep-link to Instagram DMs instead.

### c. Checkout + payment (Edge Functions — the important one)
This is deliberately **not** trusted to the browser:

1. The browser calls the **`create-razorpay-order`** Edge Function with only
   product/variant IDs + quantities — *never prices*.
2. The function recomputes every price, the shipping fee (from `site_settings`),
   and the total **from the live database**, inserts the order as
   `placed` / `payment: pending`, then creates a matching **Razorpay order** for
   that authoritative amount. It returns the Razorpay order id + key.
3. The browser opens Razorpay Checkout (the hosted payment popup). The customer
   pays. Razorpay hands back a signature.
4. The browser calls **`verify-razorpay-payment`** with that signature. The
   function verifies it cryptographically; **only a valid signature flips the
   order to `payment: paid`**. It then emails a confirmation (best-effort).
5. Separately, Razorpay also calls **`razorpay-webhook`** server-to-server as the
   source-of-truth reconciliation (in case the browser closed mid-flow). This one
   has JWT verification **off** because it's authenticated by an HMAC signature,
   not a user login.

Guests never touch the `orders` table directly — RLS denies anonymous access to
orders entirely.

### d. Order tracking for guests
`TrackOrderPage` → `trackOrder()` calls the **`track-order`** Edge Function with
an order number + the contact used. The function (service-role) looks it up and
returns it. Guests can't read `orders` any other way.

### e. Order status changes (admin) + the state machine
`src/data/orderStateMachine.ts` is the **single source of truth** for what status
transitions are legal (`placed → processing → shipped → delivered`, plus
`cancelled`). Both the admin data layer and the email Edge Function import it, so
an illegal jump (e.g. `placed → delivered`) is impossible to make. When an admin
advances a status, `adminUpdateOrderStatus()` validates the move, stamps
timestamps (`shipped_at`/`delivered_at`), and fires the customer email via the
**`send-order-status-email`** function (best-effort — email never blocks the
status change).

### f. Auth + email verification + welcome email (recently reworked)
- **Sign up** (`data/auth.signUp`) creates the account and, because email
  confirmation is on, returns **no session yet**. The user is sent to
  **`/verify-email`** ("Confirm your email"), which can resend the link.
- The confirmation email's link points back at the **landing page**
  (`emailRedirectTo`). Clicking it verifies the email and establishes a session.
- On that first confirmed session, `authStore.applySession` notices the email is
  confirmed and no `welcomed` flag is set, and calls the **`send-welcome-email`**
  Edge Function. That function is **idempotent**: it sets a `welcomed` flag in the
  user's `app_metadata` before sending, so reloads/token races can't double-send.
- **Sign in** routes admins to `/admin` and everyone else to `/account` (or back
  to wherever they were headed).
- **Password reset** uses Supabase's native flow: `requestPasswordReset` emails a
  link to `/account/reset` where `updatePassword` sets the new one.

> Locally, "sent" emails are caught by the test mailbox at
> **http://localhost:54324** — nothing actually leaves your machine until you
> configure real SMTP (see §6).

### g. Who is an admin?
There is one allow-list table, `admin_profiles`. The SQL function
`public.is_admin()` returns true if the current user's id is in it, and **every
privileged RLS policy gates on `is_admin()`**. The React admin routes are wrapped
in `<RequireAdmin>` for UX, but that's just a nicety — the database is the real
gate. Adding an admin = inserting a row into `admin_profiles` (see §6.1).

---

## 4. The database & security model

Migrations live in `supabase/migrations/` and run in filename order:

| Migration | What it sets up |
| --- | --- |
| `…0000_init_extensions_enums` | Extensions + enums (`purchase_mode`, `order_status`, `payment_status`, …) |
| `…0100_admin` | `admin_profiles` table + `is_admin()` function |
| `…0200_catalogue` | `categories`, `products`, `product_variants`, `product_images` |
| `…0300_settings` | `site_settings` key/value config (shipping, Instagram handle, banner…) |
| `…0400_orders` | `orders` + `order_items` (+ order-number generation) |
| `…0500_reviews` | `reviews` (curated testimonials, optional screenshot) |
| `…0600_storage` | `product-images` + `review-screenshots` buckets & their policies |
| `…0700_analytics_views` | Views the admin dashboard reads |
| `…0800_grants` | Table/column GRANTs to the anon/authenticated roles |

Two-layer permissions:
1. **GRANTs** (migration 0800) decide which roles can touch a table *at all*.
2. **RLS policies** (in each table's migration) decide *which rows*. Broad
   `authenticated` grants are safe because writes are gated by `is_admin()`.

Key facts to keep in mind:
- **`orders` has no anonymous access.** All guest order interaction goes through
  Edge Functions.
- **Storage buckets are public-read, admin-write.** Anyone can view product/review
  images (they're on the storefront); only admins can upload/delete. That's why
  review images can be uploaded from the admin panel with the normal anon key —
  the admin is authenticated and RLS allows it.
- After changing any migration, run `npm run db:reset` (rebuilds local DB + seed),
  then `npm run db:types` (regenerates TypeScript types).

`site_settings` is worth knowing: it's an admin-editable key/value store so things
like the shipping fee, free-shipping threshold, Instagram handle, support email,
the announcement banner, and the "store open" switch can change **without a code
deploy**. `src/data/settings.ts` reads it into a typed `SiteConfig`.

---

## 5. The Admin panel — every control

Reach it at **`/admin`** (must be signed in as an admin). Sidebar sections:

### Dashboard (`/admin`)
Read-only overview from the analytics views: revenue, order counts, recent
orders, low-stock/summary stats. No inputs — just at-a-glance numbers.

### Orders (`/admin/orders`, detail at `/admin/orders/:id`)
- **Filter** by fulfillment status and payment status; **search** by order
  number, customer name, or email.
- On an order's detail page you can:
  - **Advance fulfillment status** — only legal next steps are offered (the state
    machine). Moving to *shipped*/*delivered* auto-stamps the timestamp and emails
    the customer.
  - **Add tracking number + courier** (defaults to India Post) — saving this also
    advances the order to *shipped* and sends the "on its way" email.
  - **Override payment status** (e.g. mark *refunded*).
  - **Add an internal admin note** (private, not shown to the customer).

### Catalogue (`/admin/catalogue`, editor at `/admin/catalogue/new` and `/:id`)
- **Products list** with quick toggles for **Active** (visible in shop) and
  **Featured** (shown on the homepage).
- **Create/Edit a product**: name, slug, descriptions, base price, compare-at
  price, purchase mode (`direct` on-site checkout vs `dm_only` custom/Instagram),
  stock type (`ready_stock` vs `made_to_order`), stock quantity, "customizable"
  flag, processing time (min/max days), category.
- **Photos** (per product): **upload** straight from the panel (multi-file),
  **drag to reorder** (first photo = primary shown on cards), and **delete**. No
  bucket fiddling required.
- **Variants** (e.g. colours): add/edit/delete named variants, each with an
  optional price override.
- **Categories manager**: add/edit/delete categories and subcategories (nested
  one level), set sort order.

### Reviews (`/admin/reviews`)
- **Add a testimonial**: author name, star rating, the text, and **optionally an
  image/screenshot** uploaded right here (no storage bucket needed — this was
  added so a non-technical owner never touches Storage).
- Per existing review: **edit text inline**, **add/replace/remove its photo**,
  **publish/hide** (eye toggle), **reorder**, and **delete**. Only published
  reviews appear on the homepage "Little love notes" section, where the photo (if
  any) now renders under the quote.

### Settings (`/admin/settings`)
Edits `site_settings` live (no deploy):
- Flat **shipping fee** and **free-shipping-over** threshold.
- **Instagram handle** (no `@`) — drives the footer link and DM deep-links.
- **Support email** and optional **support phone**.
- **Announcement banner** — enable/disable + text (top-of-site strip).
- **Store open** master switch — turn off to pause on-site checkout.

### Sidebar footer
"View store" (opens the storefront) and "Sign out".

---

## 6. Setting up the external services

You need three accounts: **Supabase**, **Razorpay**, **Resend**. Local
development only strictly needs Docker + Supabase CLI; the others are for
production (and for testing real payments/emails).

### 6.0 Local development (no external accounts)
```bash
# one-time
cp .env.example .env                     # fill VITE_SUPABASE_URL / ANON_KEY from `supabase status`
npm install

# each session (Docker Desktop must be running)
npm run db:start                         # boots local Supabase in Docker
npm run db:reset                         # applies migrations + seed
npm run db:types                         # regenerate DB types
npm run dev                              # http://localhost:5173
```
- Local Supabase Studio: **http://localhost:54323**
- Local test mailbox (all auth/order emails land here): **http://localhost:54324**
- Windows note: `supabase functions serve` can crash with `ENAMETOOLONG`. If so,
  don't serve functions locally — deploy them to a real project to test (§6.1).

### 6.1 Supabase (production project)
1. Create a project at **app.supabase.com**. Note the **Project URL**, **anon
   public key**, and **service_role key** (Settings → API).
2. Link the CLI and push the schema:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push            # applies migrations to the cloud DB
   ```
3. Deploy the Edge Functions:
   ```bash
   supabase functions deploy
   ```
4. Set the server-side secrets (never in `.env`, never `VITE_*`):
   ```bash
   supabase secrets set \
     RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... RAZORPAY_WEBHOOK_SECRET=... \
     RESEND_API_KEY=re_... \
     ORDER_EMAIL_FROM="J Charms <orders@yourdomain.com>" \
     ORDER_NOTIFY_TO="owner@yourdomain.com" \
     SITE_URL="https://your-store.example" \
     INSTAGRAM_URL="https://instagram.com/j_.charms"
   ```
   **`ORDER_NOTIFY_TO` is where the shop owner's "new order" alert goes** — set it
   before taking real payments, or nobody is told an order came in. The customer
   still gets their receipt; the omission only shows up as a warning in the
   function logs. Comma-separate to alert more than one person.

   (`SITE_URL`/`INSTAGRAM_URL` are optional — they point the welcome email's
   button and the owner alert's "Open in dashboard" button at your real site.)
5. **Create your admin user:**
   ```bash
   # create the auth user with the service_role key
   curl -X POST "https://<ref>.supabase.co/auth/v1/admin/users" \
     -H "apikey: <SERVICE_ROLE_KEY>" -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"email":"you@example.com","password":"choose-one","email_confirm":true}'
   ```
   Then in Studio → SQL editor, add them to the allow-list:
   ```sql
   insert into admin_profiles (user_id, full_name)
   values ('<the-returned-user-id>', 'Owner');
   ```
   Sign in at `/login` → you land in `/admin`.
6. **Auth email redirects — do not skip this.** A fresh Supabase project ships
   with **Site URL = `http://localhost:3000`**, so *every* confirmation and
   password-reset email from your live site links to localhost until you change
   it. `supabase/config.toml` does **not** help here: it configures the local
   stack only.

   **Why it ignores the URL the app asks for:** the app already passes an
   explicit `redirectTo` on every auth email (see `src/lib/siteUrl.ts`). But
   Supabase only honours a `redirectTo` that matches the **Redirect URLs**
   allow-list — anything else is silently dropped and replaced with the **Site
   URL**. So both fields below have to be set; one alone won't do it.

   Dashboard → Authentication → **URL Configuration**:

   | Field | Value |
   | --- | --- |
   | **Site URL** | `https://your-store.example` (canonical, no trailing slash) |
   | **Redirect URLs** | `https://your-store.example/**`<br>`http://localhost:5173/**` (local dev)<br>`https://*--your-site.netlify.app/**` (deploy previews, optional) |

   Then set **`VITE_SITE_URL=https://your-store.example`** in Netlify → Site
   settings → Environment variables, and redeploy. That pins every emailed link
   to the canonical domain regardless of which origin generated it.

   **Verify:** sign up with a real address, open the email, hover the button —
   the link should read `https://<ref>.supabase.co/auth/v1/verify?...&redirect_to=https%3A%2F%2Fyour-store.example%2F`.
   If `redirect_to` says `localhost:3000`, the allow-list doesn't match the URL
   the app asked for; re-check for a typo or a trailing-slash mismatch.

   Where each link lands: confirm-signup → `/` (establishes the session and
   fires the welcome email); password reset → `/account/reset`.

### 6.2 Razorpay (payments, INR)
1. Sign up at **razorpay.com**, complete KYC for live mode (test mode works
   immediately).
2. Settings → API Keys → **Generate** → copy **Key ID** and **Key Secret**.
   - `Key ID` goes to the browser as `VITE_RAZORPAY_KEY_ID` (safe — it's public).
   - `Key ID` + `Key Secret` also go to the Edge Function secrets
     (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
3. **Webhook:** Settings → Webhooks → Add. Point it at:
   ```
   https://<ref>.supabase.co/functions/v1/razorpay-webhook
   ```
   Subscribe to `payment.captured`, `order.paid`, `payment.failed`. Set a
   **webhook secret** and store it as `RAZORPAY_WEBHOOK_SECRET` (the function
   verifies the HMAC signature with it).
4. Use `rzp_test_…` keys while developing, `rzp_live_…` in production.

### 6.3 Resend (transactional email)
Two independent uses of Resend — don't confuse them:

**(A) Order/welcome emails sent from Edge Functions** (order confirmation, shipped
notice, status updates, welcome). These call the Resend API directly using
`RESEND_API_KEY` + `ORDER_EMAIL_FROM` (see `_shared/services/email.ts`).

**(B) Supabase Auth emails** (confirm signup, password reset). These are sent by
Supabase itself, not your functions. By default Supabase uses its own limited
mailer — you should point it at Resend via **custom SMTP** so branded auth mail is
reliable (see §6.4).

Resend setup:
1. Sign up at **resend.com**.
2. **Add & verify your domain** (Domains → Add Domain → add the DNS records they
   give you). You can only send "from" a verified domain in production.
3. API Keys → **Create API Key** → copy `re_…`. Use it for both `RESEND_API_KEY`
   (Edge Function secret) and as the SMTP password below.

> ⚠️ `supabase/functions/.env.example` currently contains a real-looking Resend
> key. Treat it as compromised — rotate it in the Resend dashboard and replace it
> with a placeholder. Never commit live keys.

### 6.4 Custom SMTP for Supabase Auth emails (Resend) — manual steps

This makes the "Confirm your email" and "Reset password" emails send through your
Resend domain, branded with the templates in `supabase/templates/`.

**Manual steps in the Supabase Dashboard (production project):**

1. **Authentication → Emails → SMTP Settings → Enable custom SMTP.** Enter:

   | Field | Value |
   | --- | --- |
   | Host | `smtp.resend.com` |
   | Port | `465` (SSL) — or `587` for TLS |
   | Username | `resend` |
   | Password | your Resend API key (`re_…`) |
   | Sender email | `orders@yourdomain.com` *(must be on a verified Resend domain)* |
   | Sender name | `J Charms` |

2. **Authentication → Emails → Templates.** For **Confirm signup** and **Reset
   password**, set the subject and paste the matching HTML:
   - Confirm signup → subject `Confirm your email · J Charms 🧶`, body =
     `supabase/templates/confirm-signup.html`
   - Reset password → subject `Reset your J Charms password`, body =
     `supabase/templates/reset-password.html`

   These use Supabase's `{{ .ConfirmationURL }}` variable for the action link.

3. **Authentication → Providers → Email:** make sure **Confirm email** is enabled
   (this is what forces the verification step the whole flow relies on).

4. **Rate limits:** Dashboard's default auth email rate limit is low. Raise it
   under Authentication → Rate Limits once real SMTP is on, or signups will be
   throttled.

**As-code equivalent (already done for local dev):** `supabase/config.toml`
wires the same two templates via `[auth.email.template.confirmation]` /
`[auth.email.template.recovery]` and turns on `enable_confirmations`. To also send
through Resend locally (usually unnecessary — use the test mailbox at :54324),
uncomment and fill the `[auth.email.smtp]` block:
```toml
[auth.email.smtp]
enabled = true
host = "smtp.resend.com"
port = 587
user = "resend"
pass = "env(RESEND_API_KEY)"
admin_email = "orders@yourdomain.com"
sender_name = "J Charms"
```

---

## 7. Environment variables reference

**`.env` (browser — only `VITE_*` is exposed; never put secrets here):**
| Var | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (safe — RLS protects data) |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key id for the checkout popup |

**Edge Function secrets (server-only, via `supabase secrets set`):**
| Var | Purpose |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Full DB access inside functions (auto-injected) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Create + verify payments |
| `RAZORPAY_WEBHOOK_SECRET` | Verify the Razorpay webhook HMAC |
| `RESEND_API_KEY` | Send order/welcome emails via Resend API |
| `ORDER_EMAIL_FROM` | "From" address (verified Resend domain) |
| `ORDER_NOTIFY_TO` | Owner's new-order alert address (comma-separate for several) |
| `SITE_URL` / `INSTAGRAM_URL` | *(optional)* links in welcome + owner-alert emails |

---

## 8. Deploying the frontend (Netlify)

The frontend is a static Vite build. On Netlify: build command `npm run build`,
publish directory `dist`. Add the three `VITE_*` env vars in Netlify's settings.
Add an SPA redirect (all routes → `index.html`) so deep links like
`/order-confirmed/JC123` work — a `public/_redirects` file with `/*  /index.html
200` does it. Supabase, Razorpay, and Resend are configured on their own
dashboards as above; Netlify only serves the static app.

---

## 9. Where to look when…

| You want to… | Start in |
| --- | --- |
| Change what a page shows | `src/features/<feature>/pages/*` |
| Change how data is fetched/shaped | `src/data/<domain>.ts` |
| Add/adjust a cached query | the feature's `hooks.ts` + `src/lib/queryClient.ts` |
| Change money/email/payment logic | `supabase/functions/*` |
| Change the DB shape or rules | `supabase/migrations/*` then `db:reset` + `db:types` |
| Restyle a button/input/card | `src/components/ui/*` |
| Change store config (shipping, banner…) | Admin → Settings (or `site_settings` seed) |
| Change auth/order email wording | `supabase/functions/_shared/emailTemplates.ts` |
| Change auth (confirm/reset) email wording | `supabase/templates/*.html` |
