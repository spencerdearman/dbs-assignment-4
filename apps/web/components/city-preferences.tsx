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
import { formatSupabaseRequestError } from "@/lib/supabase-browser";

export function CityPreferences() {
  const { hasEnv, isReady, isSignedIn, missingEnv, supabase, userId } =
    useAuth();
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
        formatSupabaseRequestError(
          citiesResult.error?.message ||
            favoritesResult.error?.message ||
            profileResult.error?.message ||
          "Failed to load your city preferences.",
          "your city preferences",
        ),
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
      <section className="py-8">
        <p className="eyebrow">My Cities</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">
          Setup required
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
          Please provide the missing keys to continue rendering data.
        </p>
        <p className="mt-4 mono text-xs tracking-widest text-[var(--ink)]">
          Missing: {missingEnv.join(", ")}
        </p>
      </section>
    );
  }

  if (!isSignedIn) {
    return (
      <section className="border-b border-[var(--border)] py-8">
        <p className="eyebrow">Authentication Required</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">
          Sign in to save favorite cities.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
          Favorites and unit preferences are stored per user, so this page only
          becomes interactive after auth through Clerk.
        </p>
        <div className="mt-6 flex">
          <Link className="button-primary" href="/sign-in">
            Go to sign in
          </Link>
        </div>
      </section>
    );
  }

  if (!isReady || loading) {
    return (
      <section className="py-8">
        <p className="eyebrow">System</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">
          Loading preferences…
        </h2>
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
  const savedCities = filteredCities.filter((city) => favoriteIds.includes(city.id));
  const availableCities = filteredCities.filter(
    (city) => !favoriteIds.includes(city.id),
  );

  function renderCityRow(city: CityRecord, isFavorite: boolean) {
    return (
      <article
        className="flex flex-col justify-between gap-4 py-6 transition-colors md:flex-row md:items-center hover:bg-[var(--surface-strong)]"
        key={city.id}
      >
        <div className="w-full md:w-2/3">
          <h4 className="text-xl font-medium tracking-tight">
            <Link className="transition-colors hover:opacity-60" href={`/cities/${city.id}`}>
              {city.name}
            </Link>
          </h4>
          <div className="mt-2 text-sm text-[var(--ink-soft)]">
            {city.region}, {city.country} · {city.latitude.toFixed(4)},{" "}
            {city.longitude.toFixed(4)}
          </div>
        </div>
        <div className="flex md:justify-end w-full md:w-1/3">
          <button
            className={`rounded-full border px-5 py-2 text-sm transition-colors ${
              isFavorite
                ? "bg-[var(--ink)] border-[var(--ink)] text-white hover:opacity-80"
                : "bg-transparent border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white"
            }`}
            disabled={busyCityId === city.id}
            onClick={() => void toggleFavorite(city.id)}
            type="button"
          >
            {busyCityId === city.id
              ? "Saving..."
              : isFavorite
                ? "- Remove"
                : "+ Save"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <section className="space-y-16">
      <div className="grid grid-cols-2 gap-4 border-b border-t border-[var(--border)] py-8 md:grid-cols-4">
        <div className="card-shell-strong p-5">
          <p className="eyebrow mb-2">Saved cities</p>
          <p className="text-4xl font-semibold tracking-tighter">
            {favoriteIds.length}
          </p>
        </div>
        <div className="card-shell-strong p-5">
          <p className="eyebrow mb-2">Available</p>
          <p className="text-4xl font-semibold tracking-tighter">
            {cities.length - favoriteIds.length}
          </p>
        </div>
        <div className="card-shell-strong col-span-2 p-5">
          <p className="eyebrow mb-2">Unit Preference</p>
          <div className="mt-2 flex gap-3 text-sm">
            <button
              onClick={() => void updateUnit("fahrenheit")}
              className={`transition-colors rounded-full border px-4 py-2 ${
                preferredUnit === "fahrenheit"
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white font-bold"
                  : "border-[var(--border)] text-[var(--ink-soft)] hover:border-[var(--ink-soft)]"
              }`}
            >
              Fahrenheit
            </button>
            <button
              onClick={() => void updateUnit("celsius")}
              className={`transition-colors rounded-full border px-4 py-2 ${
                preferredUnit === "celsius"
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white font-bold"
                  : "border-[var(--border)] text-[var(--ink-soft)] hover:border-[var(--ink-soft)]"
              }`}
            >
              Celsius
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-[var(--border)]">
        <div>
          <p className="eyebrow mb-2">City Catalog</p>
          <h2 className="text-2xl font-medium tracking-tight">Registry</h2>
        </div>

        <div className="w-full max-w-sm">
          <input
            className="field w-full"
            id="city-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search city or region"
            type="search"
            value={search}
          />
        </div>
      </div>

      {feedback ? (
        <div className="card-shell-strong px-6 py-4 text-sm text-[var(--ink)]">
          {feedback}
        </div>
      ) : null}

      <section className="space-y-8">
        <div>
          <p className="eyebrow mb-3">Saved</p>
          <div className="flex flex-col divide-y divide-[var(--border)] border-b border-t border-[var(--border)]">
            {savedCities.length > 0 ? (
              savedCities.map((city) => renderCityRow(city, true))
            ) : (
              <div className="py-10 text-sm text-[var(--ink-soft)]">
                No saved cities yet. Add a few below to personalize your dashboard.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-3">Add More</p>
              <p className="text-sm text-[var(--ink-soft)]">
                Browse the remaining cities and add them to your dashboard.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col divide-y divide-[var(--border)] border-b border-t border-[var(--border)]">
            {availableCities.length > 0 ? (
              availableCities.map((city) => renderCityRow(city, false))
            ) : (
              <div className="py-10 text-sm text-[var(--ink-soft)]">
                No additional cities match your current search.
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
