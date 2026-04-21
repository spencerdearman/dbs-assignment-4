# Project Notes

- The assignment requires a monorepo with `apps/web` and `apps/worker`.
- The frontend uses the Next.js App Router in `apps/web`.
- The worker is intentionally plain Node.js so Railway setup stays simple.
- Weather data comes from Open-Meteo, which avoids needing a third-party API key.
- Personalized user data lives in Supabase tables protected by RLS.
- Realtime subscriptions should listen to `weather_snapshots` and `worker_status`.

