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
import {
  formatSupabaseRequestError,
} from "@/lib/supabase-browser";

function snapshotMapFromRows(rows: WeatherSnapshotRecord[]) {
  return Object.fromEntries(rows.map((row) => [row.city_id, row]));
}

export function WeatherDashboard() {
  const { hasEnv, isReady, isSignedIn, missingEnv, supabase, userId } =
    useAuth();
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

  async function loadFavoriteRows() {
    if (!supabase) {
      return { data: [], error: null };
    }

    const orderedResult = await supabase
      .from("user_city_preferences")
      .select("city_id, created_at")
      .order("created_at");

    return {
      data: orderedResult.data ?? [],
      error: orderedResult.error,
    };
  }

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
        formatSupabaseRequestError(
          citiesResult.error?.message ||
            snapshotsResult.error?.message ||
            workerResult.error?.message ||
            "Failed to load the weather dashboard.",
          "the dashboard",
        ),
      );
      setLoading(false);
      return;
    }

    let nextFavoriteIds: string[] = [];
    let nextProfile: UserProfileRecord | null = null;

    if (userId) {
      const [favoritesResult, profileResult] = await Promise.all([
        loadFavoriteRows(),
        supabase.from("user_profiles").select("*").maybeSingle(),
      ]);

      if (favoritesResult.error || profileResult.error) {
        setError(
          formatSupabaseRequestError(
            favoritesResult.error?.message ||
              profileResult.error?.message ||
              "Failed to load your saved preferences.",
            "your saved preferences",
          ),
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
  }, [supabase, userId]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel(`weather-dashboard-${userId ?? "guest"}`)
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
  }, [supabase, userId]);

  async function updatePreferredUnit(unit: TemperatureUnit) {
    setLocalUnit(unit);

    if (!supabase || !userId) {
      return;
    }

    const { error: updateError } = await supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        preferred_unit: unit,
      },
      { onConflict: "user_id" },
    );

    if (!updateError) {
      startTransition(() => {
        setProfile((current) => ({
          user_id: userId,
          preferred_unit: unit,
          created_at: current?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
      });
    }
  }

  if (!hasEnv) {
    return (
      <section className="py-8">
        <p className="eyebrow">Dashboard</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">
          Setup required
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
          Please provide keys to continue rendering data.
        </p>
        <p className="mt-4 mono text-xs tracking-widest text-[var(--ink)]">
          Missing: {missingEnv.join(", ")}
        </p>
      </section>
    );
  }

  if (!isReady || loading) {
    return (
      <section className="py-8">
        <p className="eyebrow">System</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">
          Initializing...
        </h2>
      </section>
    );
  }

  const preferredUnit = profile?.preferred_unit ?? localUnit;
  const sortedCities = [...cities].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const cityMap = new Map(cities.map((city) => [city.id, city]));
  const visibleCities = isSignedIn
    ? favoriteIds
        .map((cityId) => cityMap.get(cityId))
        .filter((city): city is CityRecord => Boolean(city))
    : sortedCities.filter((city) => city.is_featured);
  const hottestCity = visibleCities
    .filter((city) => snapshots[city.id])
    .sort(
      (left, right) =>
        snapshots[right.id].temperature_c - snapshots[left.id].temperature_c,
    )[0];
  const wettestCity = visibleCities
    .filter((city) => snapshots[city.id])
    .sort(
      (left, right) =>
        snapshots[right.id].precipitation_mm - snapshots[left.id].precipitation_mm,
    )[0];

  return (
    <section className="space-y-16">
      <div className="grid grid-cols-1 gap-4 border-b border-t border-[var(--border)] py-8 md:grid-cols-3">
        <div className="card-shell-strong p-5">
          <p className="eyebrow mb-2">Visible Cities</p>
          <p className="text-4xl font-semibold tracking-tighter">
            {visibleCities.length}
          </p>
        </div>
        <div className="card-shell-strong p-5">
          <p className="eyebrow mb-2">Warmest City</p>
          <p className="text-4xl font-semibold tracking-tighter">
            {hottestCity ? hottestCity.name : "N/A"}
          </p>
        </div>
        <div className="card-shell-strong p-5">
          <p className="eyebrow mb-2">Wettest Right Now</p>
          <p className="text-4xl font-semibold tracking-tighter">
            {wettestCity ? wettestCity.name : "N/A"}
          </p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            {wettestCity && snapshots[wettestCity.id]
              ? `${snapshots[wettestCity.id].precipitation_mm.toFixed(1)} mm precipitation`
              : "No measurable precipitation"}
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-6 pb-2 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-2">Realtime Data</p>
          <h2 className="text-2xl font-medium tracking-tight">
            {isSignedIn ? "Your Subscribed Locations" : "Featured Network Feed"}
          </h2>
          <p className="mt-2 mono text-[0.65rem] tracking-wider text-[var(--ink-soft)]">
            {workerStatus?.last_success_at
              ? `Background refresh ${formatRelativeTime(workerStatus.last_success_at)}`
              : "Background refresh status will appear after the next poll."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link className="button-secondary" href="/health">
            View worker health
          </Link>

          <div className="flex items-center gap-4 border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
            <p className="eyebrow">Unit</p>
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => void updatePreferredUnit("fahrenheit")}
                className={`rounded-full border px-3 py-1.5 transition-colors ${
                  preferredUnit === "fahrenheit"
                    ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                    : "border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                °F
              </button>
              <button
                onClick={() => void updatePreferredUnit("celsius")}
                className={`rounded-full border px-3 py-1.5 transition-colors ${
                  preferredUnit === "celsius"
                    ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                    : "border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                °C
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card-shell-strong px-6 py-4 text-sm text-[var(--ink)]">
          {error}
        </div>
      ) : null}

      {isSignedIn && visibleCities.length === 0 ? (
        <div className="border-t border-[var(--border)] py-8">
          <h3 className="text-xl uppercase tracking-widest font-medium">No locations selected</h3>
          <p className="mt-4 max-w-2xl font-mono text-xs uppercase tracking-wide text-[var(--ink-soft)]">
            Please select at least 3 cities in your preferences to initialize your data feed.
          </p>
          <div className="mt-6">
            <Link className="button-primary" href="/my-cities">
              Configure Favorites
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleCities.map((city) => {
            const snapshot = snapshots[city.id];
            const condition = snapshot
              ? describeWeatherCode(snapshot.weather_code)
              : { label: "Awaiting Sync", accent: "rgba(17, 17, 17, 0.22)" };

            return (
              <Link
                className="group block"
                href={`/cities/${city.id}`}
                key={city.id}
              >
                <article
                  className="card-shell dashboard-city-card h-full p-6 transition-transform duration-200 group-hover:-translate-y-0.5"
                >
                  <div
                    className="mb-5 h-1.5 w-16 rounded-full"
                    style={{ backgroundColor: condition.accent }}
                  />

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="eyebrow mb-3">Saved city</p>
                      <h3 className="text-2xl font-medium tracking-tight">
                        {city.name}
                      </h3>
                      <div className="mt-2 text-sm text-[var(--ink-soft)]">
                        {city.region} · {getCityLocalTime(city.timezone)}
                      </div>
                    </div>

                    {snapshot ? (
                      <div className="text-right">
                        <div className="text-5xl font-medium tracking-tight">
                          {formatTemperature(snapshot.temperature_c, preferredUnit)}
                        </div>
                        <div className="mt-2 mono text-[0.65rem] tracking-wider text-[var(--ink-soft)]">
                          Feels {formatTemperature(snapshot.apparent_temperature_c, preferredUnit)}
                        </div>
                      </div>
                    ) : (
                      <div className="mono text-xs tracking-widest text-[var(--ink-soft)]">
                        Sync pending
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
                    <span
                      className="pill-dot"
                      style={{ backgroundColor: condition.accent }}
                    />
                    {condition.label}
                  </div>

                  {snapshot ? (
                    <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-5">
                      <div>
                        <p className="eyebrow mb-2">Rain</p>
                        <p className="text-base font-medium">
                          {snapshot.precipitation_mm.toFixed(1)} mm
                        </p>
                      </div>
                      <div>
                        <p className="eyebrow mb-2">Humidity</p>
                        <p className="text-base font-medium">
                          {snapshot.relative_humidity}%
                        </p>
                      </div>
                      <div>
                        <p className="eyebrow mb-2">Wind</p>
                        <p className="text-base font-medium">
                          {formatWind(snapshot.wind_speed_kph)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 border-t border-[var(--border)] pt-5 mono text-xs tracking-widest text-[var(--ink-soft)]">
                      Awaiting the next worker refresh.
                    </div>
                  )}
                </article>
              </Link>
            );
          })}
        </div>
      )}

      {isSignedIn ? null : (
        <div className="flex flex-wrap gap-4 pt-4">
          <Link className="button-primary" href="/sign-up">
            Create Account
          </Link>
          <Link className="button-secondary" href="/my-cities">
            View Settings Preview
          </Link>
        </div>
      )}
    </section>
  );
}
