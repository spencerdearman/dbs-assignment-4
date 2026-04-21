"use client";

import Link from "next/link";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { useAuth } from "@/components/auth-provider";
import type { CityRecord, TemperatureUnit } from "@/lib/types";

export function CityPreferences() {
  const { hasEnv, isReady, isSignedIn, supabase, userId } = useAuth();
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [preferredUnit, setPreferredUnit] =
    useState<TemperatureUnit>("fahrenheit");
  const [loading, setLoading] = useState(() => Boolean(supabase && userId));
  const [busyCityId, setBusyCityId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search);

  const loadPreferences = useEffectEvent(async () => {
    if (!supabase || !userId) {
      return;
    }

    setLoading(true);
    setFeedback(null);

    const [citiesResult, favoritesResult, profileResult] = await Promise.all([
      supabase.from("cities").select("*").order("name"),
      supabase.from("user_city_preferences").select("city_id"),
      supabase.from("user_profiles").select("preferred_unit").maybeSingle(),
    ]);

    if (citiesResult.error || favoritesResult.error || profileResult.error) {
      setFeedback(
        citiesResult.error?.message ||
          favoritesResult.error?.message ||
          profileResult.error?.message ||
          "Failed to load your city preferences.",
      );
      setLoading(false);
      return;
    }

    startTransition(() => {
      setCities(citiesResult.data ?? []);
      setFavoriteIds((favoritesResult.data ?? []).map((row) => row.city_id));
      setPreferredUnit(profileResult.data?.preferred_unit ?? "fahrenheit");
      setLoading(false);
    });
  });

  useEffect(() => {
    if (!supabase || !userId) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPreferences();
  }, [supabase, userId]);

  async function toggleFavorite(cityId: string) {
    if (!supabase || !userId) {
      return;
    }

    setBusyCityId(cityId);
    setFeedback(null);

    const isFavorite = favoriteIds.includes(cityId);
    const result = isFavorite
      ? await supabase.from("user_city_preferences").delete().eq("city_id", cityId)
      : await supabase.from("user_city_preferences").insert({ city_id: cityId });

    setBusyCityId(null);

    if (result.error) {
      setFeedback(result.error.message);
      return;
    }

    startTransition(() => {
      setFavoriteIds((current) =>
        isFavorite ? current.filter((id) => id !== cityId) : [...current, cityId],
      );
    });
  }

  async function updateUnit(unit: TemperatureUnit) {
    if (!supabase || !userId) {
      return;
    }

    setPreferredUnit(unit);
    setFeedback(null);

    const { error } = await supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        preferred_unit: unit,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      setFeedback(error.message);
    }
  }

  if (!hasEnv) {
    return (
      <section className="card-shell px-6 py-7 sm:px-8">
        <p className="eyebrow">My Cities</p>
        <h2 className="mt-3 text-2xl font-semibold">Add Supabase keys first</h2>
      </section>
    );
  }

  if (!isSignedIn) {
    return (
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card-shell px-6 py-7 sm:px-8">
          <p className="eyebrow">My Cities</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Sign in to save favorite cities.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            Favorites and unit preferences are stored per user, so this page only
            becomes interactive after auth through Clerk.
          </p>
          <div className="mt-6">
            <Link className="button-primary" href="/sign-in">
              Go to sign in
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!isReady || loading) {
    return (
      <section className="card-shell px-6 py-7 sm:px-8">
        <p className="eyebrow">My Cities</p>
        <h2 className="mt-3 text-2xl font-semibold">Loading your preferences…</h2>
      </section>
    );
  }

  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredCities = cities.filter((city) => {
    if (!normalizedSearch) {
      return true;
    }

    const haystack = `${city.name} ${city.region} ${city.country}`.toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card-shell px-6 py-7 sm:px-8">
          <p className="eyebrow">Personalization</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Build your custom weather feed.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
            Pick at least 3 cities to fully demonstrate the assignment’s
            favorites and preferences requirement.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="card-shell-strong px-5 py-5">
              <p className="eyebrow">Following</p>
              <p className="mt-3 text-3xl font-semibold">{favoriteIds.length}</p>
            </div>
            <div className="card-shell-strong px-5 py-5">
              <p className="eyebrow">Target</p>
              <p className="mt-3 text-3xl font-semibold">3+</p>
            </div>
            <div className="card-shell-strong px-5 py-5">
              <p className="eyebrow">Unit</p>
              <p className="mt-3 text-3xl font-semibold">
                {preferredUnit === "fahrenheit" ? "F" : "C"}
              </p>
            </div>
          </div>
        </div>

        <div className="card-shell px-6 py-7 sm:px-8">
          <p className="eyebrow">Unit preference</p>
          <h3 className="mt-3 text-xl font-semibold">Store how you read weather</h3>
          <div className="mt-6 inline-flex rounded-full border border-[rgba(76,100,122,0.18)] bg-white/75 p-1">
            {(["fahrenheit", "celsius"] as const).map((unit) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  preferredUnit === unit
                    ? "bg-[var(--ink)] text-white"
                    : "text-[var(--ink-soft)]"
                }`}
                key={unit}
                onClick={() => void updateUnit(unit)}
                type="button"
              >
                {unit === "fahrenheit" ? "Fahrenheit" : "Celsius"}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
            This is saved to `user_profiles`, so your dashboard can be tailored
            every time you sign back in.
          </p>
        </div>
      </div>

      <div className="card-shell px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">City catalog</p>
            <h3 className="mt-3 text-2xl font-semibold">Follow the places you care about</h3>
          </div>
          <div className="w-full max-w-md">
            <label className="eyebrow" htmlFor="city-search">
              Search cities
            </label>
            <input
              className="field mt-2"
              id="city-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Chicago, Seattle, Miami…"
              type="search"
              value={search}
            />
          </div>
        </div>

        {feedback ? (
          <div className="mt-6 rounded-[20px] border border-[rgba(255,143,90,0.18)] bg-white/80 px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
            {feedback}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCities.map((city) => {
            const isFavorite = favoriteIds.includes(city.id);

            return (
              <article className="card-shell-strong px-5 py-5" key={city.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">{city.region}</p>
                    <h4 className="mt-2 text-xl font-semibold">{city.name}</h4>
                    <p className="mt-2 text-sm text-[var(--ink-soft)]">
                      {city.country}
                    </p>
                  </div>
                  <button
                    className={isFavorite ? "button-primary" : "button-secondary"}
                    disabled={busyCityId === city.id}
                    onClick={() => void toggleFavorite(city.id)}
                    type="button"
                  >
                    {busyCityId === city.id
                      ? "Saving…"
                      : isFavorite
                        ? "Following"
                        : "Follow"}
                  </button>
                </div>
                <p className="mono mt-5 text-xs text-[var(--ink-soft)]">
                  {city.latitude.toFixed(4)}, {city.longitude.toFixed(4)} •{" "}
                  {city.timezone}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
