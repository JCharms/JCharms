# J Charms — Handmade Crochet & Hair-Accessory Store

A production-grade, custom e-commerce platform for **J Charms**, a handmade
crochet and hair-accessory brand. Guest-first checkout, Razorpay payments,
manual pan-India shipping, and a single-operator admin panel.

Built to last and grow: feature-folder architecture, a repository data layer, an
order state machine, and RLS on every table from day one.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS |
| Routing | React Router v6 (lazy routes) |
| Server state | TanStack Query |
| Client state | Zustand (persisted cart) |
| Forms | React Hook Form + Zod |
| Backend | Supabase (Postgres · Auth · Storage · Edge Functions) |
| Payments | Razorpay |
| Email | Resend |
| Charts | Recharts |
| Hosting | Netlify |

---

## Quick start

### Prerequisites
- Node 20+ (tested on 22) and npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) + Docker Desktop (for the
  local stack)

### 1. Install
```bash
npm install
```

### 2. Start the local Supabase stack
Applies all migrations and seed data, and prints your local keys.
```bash
supabase start
```

### 3. Configure env
```bash
cp .env.example .env
```
For **local** dev, use the values `supabase start` printed:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key from `supabase status`>
VITE_RAZORPAY_KEY_ID=rzp_test_xxxx   # optional until you test payments
```

### 4. Generate DB types (after any migration)
```bash
npm run db:types    # writes src/types/database.generated.ts
```

### 5. Run
```bash
npm run dev         # http://localhost:5173
```

### 6. Create an admin
Admins are auth users listed in `admin_profiles`. To make one locally:
```bash
# create the auth user (use the SERVICE_ROLE_KEY from `supabase status`)
curl -X POST "http://127.0.0.1:54321/auth/v1/admin/users" \
  -H "apikey: <SERVICE_ROLE_KEY>" -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"choose-one","email_confirm":true}'

# then add the returned id to admin_profiles (Supabase Studio → SQL, or psql):
insert into admin_profiles (user_id, full_name) values ('<user-id>', 'Owner');
```
Sign in at `/login` → you'll land in `/admin`.

> A ready-made local admin is seeded by the setup steps above as
> `admin@jcharms.local` / `jcharms123` if you followed the scaffold — change or
> remove it before production.

---

## Edge Functions

Business logic lives in `supabase/functions/` (never a custom Node server).

| Function | Purpose | JWT |
| --- | --- | --- |
| `create-razorpay-order` | Server-prices the cart, creates order + Razorpay order | yes |
| `verify-razorpay-payment` | Verifies signature → marks order paid → emails receipt | yes |
| `razorpay-webhook` | Source-of-truth payment reconciliation | **no** (HMAC) |
| `track-order` | Guest lookup by order # + contact | yes (anon ok) |
| `send-order-status-email` | Status/shipped emails (admin-only) | yes |

Payment (Razorpay) and email (Resend) are wrapped behind provider interfaces in
`supabase/functions/_shared/services/` — swap providers by editing one file.

### Local function secrets
```bash
cp supabase/functions/.env.example supabase/functions/.env   # fill in
supabase functions serve --env-file ./supabase/functions/.env
```
> On Windows, `functions serve` can hit a Deno spawn error (`ENAMETOOLONG`);
> deploy to a Supabase project to exercise functions if so.

### Production secrets
```bash
supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... \
  RAZORPAY_WEBHOOK_SECRET=... RESEND_API_KEY=... \
  ORDER_EMAIL_FROM="J Charms <orders@yourdomain>"
supabase functions deploy
```
Point the Razorpay webhook at `.../functions/v1/razorpay-webhook` for
`payment.captured`, `order.paid`, `payment.failed`.

---

## Architecture

```
src/
├─ lib/          supabase client, query client, razorpay loader, formatters
├─ data/         repository layer — ALL Supabase queries live here
├─ store/        zustand stores (cart, ui)
├─ hooks/        cross-feature hooks (site config)
├─ features/
│  ├─ products/  storefront listing + detail
│  ├─ cart/      persisted cart + drawer
│  ├─ checkout/  checkout flow + Razorpay orchestration
│  ├─ orders/    tracking + shared order components
│  ├─ reviews/   testimonials
│  ├─ auth/      optional customer accounts + guards
│  └─ admin/     dashboard · catalogue · orders · reviews · settings
├─ components/   ui/ design-system primitives + layout
├─ types/        generated DB types (+ barrel) + domain types
└─ styles/       Tailwind tokens + running-stitch motif
supabase/
├─ migrations/   versioned schema, RLS, views, grants
└─ functions/    edge functions + shared services
```

**Principles enforced**
- **No component touches Supabase directly** — everything goes through `data/*`.
- **Config over hardcoding** — shipping, handle, banner, etc. live in
  `site_settings`, editable from admin without a redeploy.
- **Order state machine** — `data/orderStateMachine.ts` makes illegal status
  jumps impossible (`placed → delivered` can't skip `shipped`).
- **RLS on every table** + explicit grants. Orders have *no* anon access; guest
  reads go through an Edge Function with the service role.
- **Generated DB types** are the single source of truth (`npm run db:types`).

---

## Deploy (Netlify)

`netlify.toml` is preconfigured (build `npm run build`, publish `dist`, SPA
redirect, security headers). Set the `VITE_*` env vars in the Netlify UI, point
it at your **hosted** Supabase project, and deploy.

---

## Scripts
```bash
npm run dev        # dev server
npm run build      # typecheck + production build
npm run preview    # preview the build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run db:types   # regenerate DB types from local stack
npm run db:reset   # reapply migrations + seed
```

---

## Content TODOs before launch
- Replace placeholder product images (admin → product → Photos; flips
  `is_placeholder`). Search the code for `TODO: replace placeholder image`.
- Self-host fonts (currently Google Fonts) — see `index.html`.
- Set real Razorpay + Resend keys and a verified sending domain.
- Remove the local `admin@jcharms.local` account.
