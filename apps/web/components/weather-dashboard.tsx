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
  const { hasEnv, isReady, isSignedIn, supabase, userId } = useAuth();
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

    if (userId) {
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
        <p className="eyebrow">Dashboard Exception</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">Setup Required</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
          Please provide keys to continue rendering data.
        </p>
      </section>
    );
  }

  if (!isReady || loading) {
    return (
      <section className="py-8">
        <p className="eyebrow">System</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">Initializing...</h2>
      </section>
    );
  }

  const preferredUnit = profile?.preferred_unit ?? localUnit;
  const sortedCities = [...cities].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const visibleCities = isSignedIn
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
    <section className="space-y-16">
      {/* Top Overview Bar */}
      <div className="grid grid-cols-2 gap-8 border-b border-t border-[var(--border)] py-8 md:grid-cols-4">
        <div>
          <p className="eyebrow mb-2">Visible Cities</p>
          <p className="text-4xl font-semibold tracking-tighter">{visibleCities.length}</p>
        </div>
        <div>
          <p className="eyebrow mb-2">Live Rows</p>
          <p className="text-4xl font-semibold tracking-tighter">{activeCitiesCount}</p>
        </div>
        <div>
          <p className="eyebrow mb-2">Warmest City</p>
          <p className="text-4xl font-semibold tracking-tighter">
            {hottestCity ? hottestCity.name : "N/A"}
          </p>
        </div>
        <div>
          <p className="eyebrow mb-2">Worker Status</p>
          <p className="text-xl font-medium uppercase tracking-tight">
            {workerStatus?.last_success_at ? "Healthy" : "Waiting"}
          </p>
          <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-wider text-[var(--ink-soft)]">
            {workerStatus?.last_success_at
              ? formatRelativeTime(workerStatus.last_success_at)
              : "No polls"}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <p className="eyebrow mb-2">Realtime Data</p>
          <h2 className="text-2xl uppercase tracking-widest font-medium">
            {isSignedIn ? "Your Subscribed Locations" : "Featured Network Feed"}
          </h2>
        </div>
        
        <div className="flex items-center gap-4 border-b border-[var(--border)] pb-2">
          <p className="eyebrow">Unit</p>
          <div className="flex gap-4 font-mono text-xs uppercase tracking-widest">
            <button
              onClick={() => void updatePreferredUnit("fahrenheit")}
              className={`transition-colors ${preferredUnit === "fahrenheit" ? "text-[var(--ink)] font-bold" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"}`}
            >
              °F
            </button>
            <button
              onClick={() => void updatePreferredUnit("celsius")}
              className={`transition-colors ${preferredUnit === "celsius" ? "text-[var(--ink)] font-bold" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"}`}
            >
              °C
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="border border-[var(--ink)] bg-[var(--surface-strong)] px-6 py-4 font-mono text-sm uppercase tracking-wide">
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
        <div className="flex flex-col divide-y divide-[var(--border)] border-b border-t border-[var(--border)]">
          {visibleCities.map((city) => {
            const snapshot = snapshots[city.id];
            const condition = snapshot
              ? describeWeatherCode(snapshot.weather_code)
              : { label: "Awaiting Sync" };

            return (
              <article key={city.id} className="flex flex-col md:flex-row md:items-center justify-between py-6 gap-4">
                <div className="w-full md:w-1/3">
                  <h3 className="text-xl font-medium uppercase tracking-widest">{city.name}</h3>
                  <div className="mt-2 text-xs font-mono tracking-wider uppercase text-[var(--ink-soft)]">
                    {city.region} • {getCityLocalTime(city.timezone)}
                  </div>
                </div>

                {snapshot ? (
                  <div className="flex w-full md:w-2/3 items-end md:items-center justify-between gap-6">
                    <div className="flex flex-col gap-2">
                       <span className="font-mono text-xs uppercase tracking-widest font-medium">
                         {condition.label}
                       </span>
                       <span className="font-mono text-[0.65rem] uppercase tracking-wider text-[var(--ink-soft)]">
                         Drop: {snapshot.precipitation_mm.toFixed(1)}mm • Hum: {snapshot.relative_humidity}% • Wnd: {formatWind(snapshot.wind_speed_kph)}
                       </span>
                    </div>
                    
                    <div className="text-right">
                       <div className="text-4xl sm:text-5xl font-mono font-medium tracking-tighter">
                          {formatTemperature(snapshot.temperature_c, preferredUnit)}
                       </div>
                       <div className="mt-1 font-mono text-[0.65rem] uppercase tracking-wider text-[var(--ink-soft)]">
                          Feels {formatTemperature(snapshot.apparent_temperature_c, preferredUnit)}
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full md:w-2/3 font-mono text-xs uppercase tracking-widest text-[var(--ink-soft)] text-right">
                    Sync pending...
                  </div>
                )}
              </article>
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
