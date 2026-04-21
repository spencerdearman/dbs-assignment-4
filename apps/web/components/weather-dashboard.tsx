"use client";

import Link from "next/link";
import { startTransition, useEffect, useEffectEvent, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import type {
  CityRecord,
  TemperatureUnit,
  UserProfileRecord,
  WeatherSnapshotRecord,
  WorkerStatusRecord,
} from "@/lib/types";
import {
  describeWeatherCode,
  formatRelativeTime,
  formatTemperature,
  formatWind,
  getCityLocalTime,
} from "@/lib/weather";

function snapshotMapFromRows(rows: WeatherSnapshotRecord[]) {
  return Object.fromEntries(rows.map((row) => [row.city_id, row]));
}

export function WeatherDashboard() {
  const { hasEnv, isReady, supabase, user } = useAuth();
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, WeatherSnapshotRecord>>(
    {},
  );
  const [workerStatus, setWorkerStatus] = useState<WorkerStatusRecord | null>(null);
  const [localUnit, setLocalUnit] = useState<TemperatureUnit>("fahrenheit");
  const [loading, setLoading] = useState(() => Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useEffectEvent(async () => {
    if (!supabase) {
      return;
    }

    setLoading(true);
    setError(null);

    const [citiesResult, snapshotsResult, workerResult] = await Promise.all([
      supabase
        .from("cities")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("name"),
      supabase.from("weather_snapshots").select("*"),
      supabase
        .from("worker_status")
        .select("*")
        .eq("id", "open-meteo-worker")
        .maybeSingle(),
    ]);

    if (citiesResult.error || snapshotsResult.error || workerResult.error) {
      setError(
        citiesResult.error?.message ||
          snapshotsResult.error?.message ||
          workerResult.error?.message ||
          "Failed to load the weather dashboard.",
      );
      setLoading(false);
      return;
    }

    let nextFavoriteIds: string[] = [];
    let nextProfile: UserProfileRecord | null = null;

    if (user) {
      const [favoritesResult, profileResult] = await Promise.all([
        supabase.from("user_city_preferences").select("city_id"),
        supabase.from("user_profiles").select("*").maybeSingle(),
      ]);

      if (favoritesResult.error || profileResult.error) {
        setError(
          favoritesResult.error?.message ||
            profileResult.error?.message ||
            "Failed to load your saved preferences.",
        );
        setLoading(false);
        return;
      }

      nextFavoriteIds = (favoritesResult.data ?? []).map((row) => row.city_id);
      nextProfile = profileResult.data ?? null;
    }

    startTransition(() => {
      setCities(citiesResult.data ?? []);
      setSnapshots(snapshotMapFromRows(snapshotsResult.data ?? []));
      setWorkerStatus(workerResult.data ?? null);
      setFavoriteIds(nextFavoriteIds);
      setProfile(nextProfile);
      setLoading(false);
    });
  });

  useEffect(() => {
    if (!supabase) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard();
  }, [supabase, user]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel(`weather-dashboard-${user?.id ?? "guest"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "weather_snapshots" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedSnapshot = payload.old as WeatherSnapshotRecord;

            startTransition(() => {
              setSnapshots((current) => {
                const next = { ...current };
                delete next[deletedSnapshot.city_id];
                return next;
              });
            });

            return;
          }

          const nextSnapshot = payload.new as WeatherSnapshotRecord;

          startTransition(() => {
            setSnapshots((current) => ({
              ...current,
              [nextSnapshot.city_id]: nextSnapshot,
            }));
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "worker_status",
          filter: "id=eq.open-meteo-worker",
        },
        (payload) => {
          startTransition(() => {
            setWorkerStatus(payload.new as WorkerStatusRecord);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  async function updatePreferredUnit(unit: TemperatureUnit) {
    setLocalUnit(unit);

    if (!supabase || !user) {
      return;
    }

    const { error: updateError } = await supabase.from("user_profiles").upsert(
      {
        user_id: user.id,
        preferred_unit: unit,
      },
      { onConflict: "user_id" },
    );

    if (!updateError) {
      startTransition(() => {
        setProfile((current) => ({
          user_id: user.id,
          preferred_unit: unit,
          created_at: current?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      });
    }
  }

  if (!hasEnv) {
    return (
      <section className="card-shell px-6 py-7 sm:px-8">
        <p className="eyebrow">Dashboard</p>
        <h2 className="mt-3 text-2xl font-semibold">Supabase env vars are required</h2>
        <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
          Once the frontend keys are added, the dashboard will connect to public
          weather rows and realtime updates.
        </p>
      </section>
    );
  }

  if (!isReady || loading) {
    return (
      <section className="card-shell px-6 py-7 sm:px-8">
        <p className="eyebrow">Dashboard</p>
        <h2 className="mt-3 text-2xl font-semibold">Loading live weather…</h2>
      </section>
    );
  }

  const preferredUnit = profile?.preferred_unit ?? localUnit;
  const sortedCities = [...cities].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const visibleCities = user
    ? sortedCities.filter((city) => favoriteIds.includes(city.id))
    : sortedCities.filter((city) => city.is_featured);
  const hottestCity = visibleCities
    .filter((city) => snapshots[city.id])
    .sort(
      (left, right) =>
        snapshots[right.id].temperature_c - snapshots[left.id].temperature_c,
    )[0];
  const activeCitiesCount = visibleCities.filter((city) => snapshots[city.id]).length;

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card-shell px-6 py-7 sm:px-8">
          <p className="eyebrow">Realtime feed</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {user ? "Your cities, updating live." : "Featured city weather, streaming live."}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            The worker polls Open-Meteo, writes to Supabase, and this page listens
            for realtime database changes without refreshing.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="card-shell-strong px-5 py-5">
              <p className="eyebrow">Visible cities</p>
              <p className="mt-3 text-3xl font-semibold">{visibleCities.length}</p>
            </div>
            <div className="card-shell-strong px-5 py-5">
              <p className="eyebrow">Live rows</p>
              <p className="mt-3 text-3xl font-semibold">{activeCitiesCount}</p>
            </div>
            <div className="card-shell-strong px-5 py-5">
              <p className="eyebrow">Warmest city</p>
              <p className="mt-3 text-xl font-semibold">
                {hottestCity ? hottestCity.name : "Waiting"}
              </p>
            </div>
          </div>

          {user ? null : (
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="button-primary" href="/auth">
                Sign up for personalization
              </Link>
              <Link className="button-secondary" href="/my-cities">
                Preview favorites page
              </Link>
            </div>
          )}
        </div>

        <div className="card-shell px-6 py-7 sm:px-8">
          <p className="eyebrow">System status</p>
          <h3 className="mt-3 text-xl font-semibold">Worker and display settings</h3>

          <div className="mt-6 space-y-4">
            <div className="card-shell-strong px-5 py-5">
              <p className="eyebrow">Worker</p>
              <p className="mt-2 text-base font-semibold">
                {workerStatus?.last_success_at ? "Healthy" : "Waiting for first poll"}
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                Last success:{" "}
                {workerStatus?.last_success_at
                  ? formatRelativeTime(workerStatus.last_success_at)
                  : "No successful poll yet"}
              </p>
              <p className="mt-1 text-sm leading-7 text-[var(--ink-soft)]">
                Poll interval: {workerStatus?.poll_interval_minutes ?? 15} minutes
              </p>
              <p className="mt-1 text-sm leading-7 text-[var(--ink-soft)]">
                {workerStatus?.last_error ?? "No reported worker errors."}
              </p>
            </div>

            <div className="card-shell-strong px-5 py-5">
              <p className="eyebrow">Temperature unit</p>
              <div className="mt-4 inline-flex rounded-full border border-[rgba(76,100,122,0.18)] bg-white/75 p-1">
                {(["fahrenheit", "celsius"] as const).map((unit) => (
                  <button
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      preferredUnit === unit
                        ? "bg-[var(--ink)] text-white"
                        : "text-[var(--ink-soft)]"
                    }`}
                    key={unit}
                    onClick={() => void updatePreferredUnit(unit)}
                    type="button"
                  >
                    {unit === "fahrenheit" ? "Fahrenheit" : "Celsius"}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
                {user
                  ? "Saved to your user profile."
                  : "Guests can toggle locally. Sign in to save it."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card-shell-strong border border-[rgba(255,143,90,0.18)] px-6 py-4 text-sm leading-7 text-[var(--ink-soft)]">
          {error}
        </div>
      ) : null}

      {user && visibleCities.length === 0 ? (
        <div className="card-shell px-6 py-7 sm:px-8">
          <p className="eyebrow">Your feed</p>
          <h3 className="mt-3 text-2xl font-semibold">Choose cities to start your dashboard.</h3>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            You are signed in, but you have not saved any favorites yet. Pick at
            least 3 cities on the preferences page to fully satisfy the
            personalization requirement.
          </p>
          <div className="mt-6">
            <Link className="button-primary" href="/my-cities">
              Choose favorite cities
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleCities.map((city) => {
            const snapshot = snapshots[city.id];
            const condition = snapshot
              ? describeWeatherCode(snapshot.weather_code)
              : {
                  label: "Waiting for worker",
                  accent: "rgba(49, 140, 207, 0.12)",
                };

            return (
              <article
                className="card-shell city-card px-5 py-5 sm:px-6 sm:py-6"
                key={city.id}
                style={{
                  background: `linear-gradient(180deg, rgba(255,255,255,0.82), ${condition.accent})`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">{city.region}</p>
                    <h3 className="mt-2 text-2xl font-semibold">{city.name}</h3>
                    <p className="mt-2 text-sm text-[var(--ink-soft)]">
                      Local time: {getCityLocalTime(city.timezone)}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/70 bg-white/75 px-3 py-2 text-sm font-medium">
                    {condition.label}
                  </div>
                </div>

                {snapshot ? (
                  <>
                    <div className="mt-8 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-5xl font-semibold tracking-tight sm:text-6xl">
                          {formatTemperature(snapshot.temperature_c, preferredUnit)}
                        </p>
                        <p className="mt-3 text-sm text-[var(--ink-soft)]">
                          Feels like{" "}
                          {formatTemperature(
                            snapshot.apparent_temperature_c,
                            preferredUnit,
                          )}
                        </p>
                      </div>
                      <div className="card-shell-strong px-4 py-4 text-sm leading-7">
                        <p>
                          Humidity <strong>{snapshot.relative_humidity}%</strong>
                        </p>
                        <p>
                          Wind <strong>{formatWind(snapshot.wind_speed_kph)}</strong>
                        </p>
                        <p>
                          Precip <strong>{snapshot.precipitation_mm.toFixed(1)} mm</strong>
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/60 pt-5 text-sm text-[var(--ink-soft)]">
                      <span>Updated {formatRelativeTime(snapshot.updated_at)}</span>
                      <span className="mono">{city.timezone}</span>
                    </div>
                  </>
                ) : (
                  <div className="mt-8 rounded-[24px] border border-white/60 bg-white/72 px-5 py-5 text-sm leading-7 text-[var(--ink-soft)]">
                    The worker has not written a weather row for this city yet.
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
