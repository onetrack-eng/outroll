# Outroll

A two-sided marketplace connecting artists with independent music curators. See `CLAUDE.md`
for the full product spec, architecture, and a punch list of what's left to build.

**This scaffold was written without a working npm registry connection, so nothing here has
been installed or built yet.** Everything below assumes you're running it in an environment
with normal internet access (i.e. Claude Code on your machine, not the sandbox that generated
this repo).

## Prerequisites

- Node.js 20+
- Docker (for local Postgres), or a hosted Postgres instance
- A Stripe account with Connect enabled (test mode is fine to start)
- A Resend account (optional to start — emails just log a warning and no-op without a key)

## Setup

```bash
npm install
cp .env.example .env
# fill in .env — at minimum AUTH_SECRET, DATABASE_URL, ADMIN_SEED_USERNAME/PASSWORD

docker compose up -d          # starts local Postgres on 5432
npx prisma migrate dev --name init
npm run db:seed               # creates your first admin login

npm run dev                   # http://localhost:3000
```

Generate `AUTH_SECRET` and `CRON_SECRET` with `openssl rand -base64 32`.

## Stripe setup

1. In the Stripe dashboard (test mode), enable Connect and turn on Express accounts.
2. Copy your test **secret** and **publishable** keys into `.env`.
3. Run the Stripe CLI to forward webhooks locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — it prints a `whsec_...` value for `STRIPE_WEBHOOK_SECRET`.
4. Curator payouts require the curator to complete Express onboarding from `/curator/dashboard/onboarding`. In test mode, Stripe's onboarding flow accepts fake test data end to end.

## Cron / scheduled jobs

Three time-based transitions (auto-decline, auto-refund, auto-payout — see `CLAUDE.md`) run
via `/api/cron/deadlines`, gated by `CRON_SECRET`. On Vercel, `vercel.json` already wires this
up hourly via Vercel Cron. Locally, or on any other host, run it manually:

```bash
npm run cron:deadlines
```

## Project structure

```
prisma/schema.prisma       All data models
src/app/                   Routes (App Router) — public site, curator area, admin area, API
src/components/            UI components (ui/ = generic primitives)
src/lib/                   Business logic: auth, Stripe, email, business-day math, validation
scripts/                   Standalone scripts (deadline sweep runner)
```

## Deploying

Built for Vercel (per spec section 8): connect the repo, set the env vars from `.env.example`
in the Vercel project, point `DATABASE_URL` at a hosted Postgres (Neon/Supabase/RDS all work),
and add the Stripe webhook endpoint (`https://yourdomain/api/webhooks/stripe`) in the Stripe
dashboard once deployed.
