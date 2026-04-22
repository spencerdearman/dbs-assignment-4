# Cloud

Cloud is a weather app built as a small multi-service system:

- `apps/web` is the Next.js frontend
- `apps/worker` is the background polling worker
- Supabase stores app data and powers realtime updates
- Clerk handles authentication

The worker pulls weather data from Open-Meteo, writes the latest conditions into Supabase, and the frontend reads from Supabase and updates live through Realtime.

## Stack

- Next.js App Router
- Tailwind CSS
- Supabase
- Clerk
- Railway
- Vercel
- Open-Meteo

## Repo layout

```text
apps/
  web/       Next.js frontend
  worker/    Node.js polling worker
supabase/
  schema.sql
  clerk-migration.sql
  reorder-migration.sql
  worker-health-migration.sql
CLAUDE.md    Architecture notes
```

## Features

- Email/password or Google sign-in through Clerk
- Saved cities per user
- Temperature unit preference
- Live dashboard updates through Supabase Realtime
- City detail pages with current conditions, forecast, radar, and sun timing
- Worker health page with poll status, timestamps, and latest worker message

## Local setup

### 1. Create the Supabase schema

Run:

- [supabase/schema.sql](/Users/spencerdearman/dbs-assignment-4/supabase/schema.sql:1)

If you are updating an older version of the project, these migrations may also apply:

- [supabase/clerk-migration.sql](/Users/spencerdearman/dbs-assignment-4/supabase/clerk-migration.sql:1)
- [supabase/reorder-migration.sql](/Users/spencerdearman/dbs-assignment-4/supabase/reorder-migration.sql:1)
- [supabase/worker-health-migration.sql](/Users/spencerdearman/dbs-assignment-4/supabase/worker-health-migration.sql:1)

### 2. Add environment variables

Frontend:

- copy [apps/web/.env.example](/Users/spencerdearman/dbs-assignment-4/apps/web/.env.example:1) to `apps/web/.env.local`

Worker:

- copy [apps/worker/.env.example](/Users/spencerdearman/dbs-assignment-4/apps/worker/.env.example:1) to `apps/worker/.env`

Required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POLL_INTERVAL_MINUTES`

Open-Meteo does not require an API key.

### 3. Run the app

From the repo root:

```bash
npm run dev:web
```

In a second terminal:

```bash
npm run dev:worker
```

## Useful scripts

From the repo root:

```bash
npm run dev:web
npm run build:web
npm run lint:web
npm run dev:worker
npm run start:worker
```

## Deployment

### Frontend

Deploy `apps/web` to Vercel.

Make sure Vercel has the frontend env vars from `apps/web/.env.local`.

### Worker

Deploy `apps/worker` to Railway.

Make sure Railway has:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POLL_INTERVAL_MINUTES`

## Notes

- The frontend expects `NEXT_PUBLIC_SUPABASE_URL` to point to your Supabase project, not your Vercel domain.
- The worker is responsible for keeping `weather_snapshots` and `worker_status` fresh.
- Realtime subscriptions listen to `weather_snapshots` and `worker_status`.
- Project structure and architecture notes are documented in [CLAUDE.md](/Users/spencerdearman/dbs-assignment-4/CLAUDE.md:1).

## Supabase MCP

If you need the Supabase MCP server for the assignment, configure it separately in your local Claude/Codex setup. That is an account-level tool setup, not something this repo installs by itself.
