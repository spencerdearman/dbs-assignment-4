# Cloud

A weather-focused version of the Week 4 "build a system" assignment:

Open-Meteo -> Railway worker -> Supabase -> Next.js frontend on Vercel

The repo follows the class monorepo structure:

- `apps/web` - Next.js + Tailwind frontend
- `apps/worker` - Node.js polling worker for Open-Meteo
- `supabase/schema.sql` - tables, RLS policies, and Realtime setup
- `supabase/clerk-migration.sql` - migration from Supabase Auth-style user ids to Clerk user ids
- `CLAUDE.md` - architecture blueprint for the whole system

## What the app does

- Uses Clerk for sign up / sign in, including Google sign in when enabled
- Lets each user choose favorite cities
- Stores a preferred temperature unit per user
- Polls Open-Meteo on a background interval
- Upserts live conditions into Supabase
- Streams updates into the frontend with Supabase Realtime

## Local setup

1. In Supabase, create a new project.
2. If you are setting up from scratch, run [supabase/schema.sql](/Users/spencerdearman/dbs-assignment-4/supabase/schema.sql:1).
3. If you already ran the earlier Supabase Auth version, run [supabase/clerk-migration.sql](/Users/spencerdearman/dbs-assignment-4/supabase/clerk-migration.sql:1).
4. Add frontend env vars to `apps/web/.env.local` using [apps/web/.env.example](/Users/spencerdearman/dbs-assignment-4/apps/web/.env.example:1).
5. Add worker env vars to `apps/worker/.env` using [apps/worker/.env.example](/Users/spencerdearman/dbs-assignment-4/apps/worker/.env.example:1).
6. Start the frontend with `npm run dev:web`.
7. Start the worker with `npm run dev:worker`.

## Required keys

Open-Meteo is free and does not require an API key.

You only need:

- Supabase project URL
- Supabase publishable key
- Supabase service role key
- Clerk publishable key
- Clerk secret key
- Your deployed Vercel URL for `NEXT_PUBLIC_SITE_URL`

## Deployment

### Vercel

- Import the repo
- Set the root directory to `apps/web`
- Add the same frontend env vars from `apps/web/.env.local`

### Railway

- Create a new service from this repo
- Set the root directory to `apps/worker`
- Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `POLL_INTERVAL_MINUTES`

## Supabase MCP

The assignment asks for Supabase MCP to be configured. The classroom command from the assignment is:

```bash
claude mcp add --transport http supabase https://mcp.supabase.com/mcp
```

Codex does not configure that MCP server from inside this repo, so that is one of the small account-level steps you will do yourself.
