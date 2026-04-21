# Cloud Architecture

## Goal

Build and deploy a multi-service weather system that matches the Week 4 assignment pattern:

External API -> background worker -> Supabase -> Next.js frontend

## Services

### `apps/web`

- Next.js App Router frontend
- Deployed to Vercel
- Handles Clerk authentication
- Reads weather data from Supabase
- Subscribes to `weather_snapshots` and `worker_status` through Supabase Realtime
- Lets each user manage favorite cities and a preferred temperature unit

### `apps/worker`

- Plain Node.js service
- Deployed to Railway
- Polls Open-Meteo on an interval
- Seeds and maintains the supported city catalog
- Upserts the newest weather state into Supabase
- Updates a `worker_status` row so the frontend can show worker health

### Supabase

- Works with Clerk-issued JWTs for authenticated database access
- Stores city catalog, user preferences, and latest weather records
- Enforces RLS for user-owned rows
- Publishes realtime changes to the frontend

## Data model

### `cities`

Static-ish catalog of supported cities:

- `id`
- `name`
- `region`
- `country`
- `latitude`
- `longitude`
- `timezone`
- `is_featured`

### `weather_snapshots`

Latest weather record per city:

- `city_id`
- `temperature_c`
- `apparent_temperature_c`
- `relative_humidity`
- `precipitation_mm`
- `wind_speed_kph`
- `weather_code`
- `is_day`
- `observed_at`
- `updated_at`

### `user_profiles`

Per-user personalization:

- `user_id` (Clerk user id)
- `preferred_unit`

### `user_city_preferences`

Favorite city join table:

- `id`
- `user_id` (Clerk user id)
- `city_id`

### `worker_status`

Single-row operational status for the polling service:

- `id`
- `source_name`
- `poll_interval_minutes`
- `last_run_at`
- `last_success_at`
- `last_error`
- `updated_at`

## Data flow

1. Railway runs the worker on a timer.
2. The worker fetches current conditions from Open-Meteo for each supported city.
3. The worker upserts rows in `weather_snapshots`.
4. Supabase Realtime broadcasts row changes.
5. The Vercel-hosted frontend receives the changes and updates the dashboard without a refresh.
6. Authenticated users only mutate their own favorites and profile rows through RLS-protected tables.

## Auth and authorization

- Clerk handles sign up, sign in, sign out, and Google sign in
- Public weather data is readable by everyone
- `user_profiles` and `user_city_preferences` are only readable and writable by the row owner
- Supabase RLS reads the Clerk user id from `auth.jwt()->>'sub'`
- The worker uses the service role key because it is trusted infrastructure, not a browser client

## Environment variables

### Frontend

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### Worker

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POLL_INTERVAL_MINUTES`

## Deployment plan

### Vercel

- Root directory: `apps/web`
- Add frontend env vars
- Set Clerk allowed origins / redirect behavior to the deployed frontend domain as needed

### Railway

- Root directory: `apps/worker`
- Add worker env vars
- Verify logs show successful polls and upserts

## Failure points to watch

- Missing Realtime publication on `weather_snapshots`
- Missing or incorrect RLS policies on user-owned tables
- Wrong site URL causing awkward auth confirmation redirects
- Missing service role key in Railway
- Worker running but frontend pointed at the wrong Supabase project
