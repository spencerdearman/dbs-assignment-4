"use client";

import Link from "next/link";
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { useAuth } from "@/components/auth-provider";
import type {
  CityRecord,
  UserProfileRecord,
  WeatherSnapshotRecord,
} from "@/lib/types";
import {
  describeWeatherCode,
  formatTemperature,
  formatWind,
  getCityLocalTime,
} from "@/lib/weather";
import { formatSupabaseRequestError } from "@/lib/supabase-browser";

type OpenMeteoDaily = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weather_code: number[];
  precipitation_probability_max?: number[];
};

type OpenMeteoCurrent = {
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  precipitation: number | null;
  wind_speed_10m: number;
  weather_code: number;
  is_day: number | boolean;
};

type OpenMeteoForecast = {
  current?: OpenMeteoCurrent;
  daily?: OpenMeteoDaily;
};

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function CityDetail({ cityId }: { cityId: string }) {
  const { hasEnv, isReady, isSignedIn, missingEnv, supabase, userId } =
    useAuth();
  const [city, setCity] = useState<CityRecord | null>(null);
  const [snapshot, setSnapshot] = useState<WeatherSnapshotRecord | null>(null);
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [forecast, setForecast] = useState<OpenMeteoForecast | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(supabase));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCity = useEffectEvent(async () => {
    if (!supabase) {
      return;
    }

    setLoading(true);
    setError(null);

    const [cityResult, snapshotResult] = await Promise.all([
      supabase.from("cities").select("*").eq("id", cityId).maybeSingle(),
      supabase
        .from("weather_snapshots")
        .select("*")
        .eq("city_id", cityId)
        .maybeSingle(),
    ]);

    if (cityResult.error || snapshotResult.error) {
      setError(
        formatSupabaseRequestError(
          cityResult.error?.message ||
            snapshotResult.error?.message ||
            "Failed to load this city.",
          "this city",
        ),
      );
      setLoading(false);
      return;
    }

    let nextFavorite = false;
    let nextProfile: UserProfileRecord | null = null;

    if (userId) {
      const [favoriteResult, profileResult] = await Promise.all([
        supabase
          .from("user_city_preferences")
          .select("city_id")
          .eq("city_id", cityId)
          .maybeSingle(),
        supabase.from("user_profiles").select("*").maybeSingle(),
      ]);

      if (favoriteResult.error || profileResult.error) {
        setError(
          formatSupabaseRequestError(
            favoriteResult.error?.message ||
              profileResult.error?.message ||
              "Failed to load your city preference.",
            "your city preference",
          ),
        );
        setLoading(false);
        return;
      }

      nextFavorite = Boolean(favoriteResult.data);
      nextProfile = profileResult.data ?? null;
    }

    const selectedCity = cityResult.data ?? null;

    if (!selectedCity) {
      setError("That city could not be found.");
      setLoading(false);
      return;
    }

    startTransition(() => {
      setCity(selectedCity);
      setSnapshot(snapshotResult.data ?? null);
      setProfile(nextProfile);
      setIsFavorite(nextFavorite);
    });

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(selectedCity.latitude));
    forecastUrl.searchParams.set("longitude", String(selectedCity.longitude));
    forecastUrl.searchParams.set(
      "current",
      [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "precipitation",
        "wind_speed_10m",
        "weather_code",
        "is_day",
      ].join(","),
    );
    forecastUrl.searchParams.set(
      "daily",
      [
        "temperature_2m_max",
        "temperature_2m_min",
        "weather_code",
        "precipitation_probability_max",
      ].join(","),
    );
    forecastUrl.searchParams.set("forecast_days", "5");
    forecastUrl.searchParams.set("timezone", "auto");

    const forecastResponse = await fetch(forecastUrl);

    if (!forecastResponse.ok) {
      setError(
        `Open-Meteo returned ${forecastResponse.status} for ${selectedCity.name}.`,
      );
      setLoading(false);
      return;
    }

    const forecastJson = (await forecastResponse.json()) as OpenMeteoForecast;

    startTransition(() => {
      setForecast(forecastJson);
      setLoading(false);
    });
  });

  useEffect(() => {
    if (!supabase) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCity();
  }, [supabase, userId, cityId]);

  async function toggleFavorite() {
    if (!supabase || !userId || !city) {
      return;
    }

    setSaving(true);
    setError(null);

    const result = isFavorite
      ? await supabase.from("user_city_preferences").delete().eq("city_id", city.id)
      : await supabase.from("user_city_preferences").insert({ city_id: city.id });

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setIsFavorite((current) => !current);
  }

  if (!hasEnv) {
    return (
      <section className="py-8">
        <p className="eyebrow">City detail</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">
          Setup required
        </h2>
        <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
          Missing: {missingEnv.join(", ")}
        </p>
      </section>
    );
  }

  if (!isReady || loading) {
    return (
      <section className="py-8">
        <p className="eyebrow">City detail</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">
          Loading forecast…
        </h2>
      </section>
    );
  }

  if (!city) {
    return (
      <section className="py-8">
        <p className="eyebrow">City detail</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">
          City not found
        </h2>
      </section>
    );
  }

  const currentWeatherCode = snapshot?.weather_code ?? forecast?.current?.weather_code;
  const currentCondition = currentWeatherCode != null
    ? describeWeatherCode(currentWeatherCode)
    : { label: "Awaiting sync", accent: "rgba(17, 17, 17, 0.22)" };
  const daily = forecast?.daily;
  const preferredUnit = profile?.preferred_unit ?? "fahrenheit";
  const currentTemperatureC =
    snapshot?.temperature_c ?? forecast?.current?.temperature_2m ?? null;
  const currentFeelsLikeC =
    snapshot?.apparent_temperature_c ??
    forecast?.current?.apparent_temperature ??
    null;
  const currentHumidity =
    snapshot?.relative_humidity ?? forecast?.current?.relative_humidity_2m ?? null;
  const currentWind =
    snapshot?.wind_speed_kph ?? forecast?.current?.wind_speed_10m ?? null;
  const currentPrecipitation =
    snapshot?.precipitation_mm ?? forecast?.current?.precipitation ?? 0;

  return (
    <section className="space-y-10 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">City detail</p>
          <h2 className="mt-3 text-4xl font-medium tracking-tight">{city.name}</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            {city.region}, {city.country} · {getCityLocalTime(city.timezone)}
          </p>
        </div>

        <div className="flex gap-3">
          <Link className="button-secondary" href="/my-cities">
            Back
          </Link>
          {isSignedIn ? (
            <button
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                isFavorite
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--ink)] bg-transparent text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white"
              }`}
              disabled={saving}
              onClick={() => void toggleFavorite()}
              type="button"
            >
              {saving ? "Saving…" : isFavorite ? "− Remove" : "+ Save"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="card-shell-strong px-6 py-4 text-sm text-[var(--ink)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="card-shell-strong p-6 sm:p-8">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <span className="pill-dot" style={{ backgroundColor: currentCondition.accent }} />
            {currentCondition.label}
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-6xl font-medium tracking-tight sm:text-7xl">
                  {currentTemperatureC != null
                    ? formatTemperature(currentTemperatureC, preferredUnit)
                    : "--"}
              </div>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                Feels like{" "}
                {currentFeelsLikeC != null
                  ? formatTemperature(currentFeelsLikeC, preferredUnit)
                  : "--"}
              </p>
            </div>

            <div className="text-sm text-[var(--ink-soft)]">
              <p>
                Humidity:{" "}
                {currentHumidity != null
                  ? `${Math.round(currentHumidity)}%`
                  : "--"}
              </p>
              <p>
                Wind:{" "}
                {currentWind != null
                  ? formatWind(currentWind)
                  : "--"}
              </p>
              <p>
                Precipitation:{" "}
                {currentPrecipitation != null
                  ? `${Number(currentPrecipitation).toFixed(1)} mm`
                  : "0.0 mm"}
              </p>
            </div>
          </div>
        </div>

        <div className="card-shell-strong p-6 sm:p-8">
          <p className="eyebrow mb-4">Conditions</p>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="text-[var(--ink-soft)]">Local time</span>
              <span className="font-medium text-[var(--ink)]">
                {getCityLocalTime(city.timezone)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="text-[var(--ink-soft)]">Saved</span>
              <span className="font-medium text-[var(--ink)]">
                {isSignedIn && isFavorite ? "Yes" : "No"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="text-[var(--ink-soft)]">Temperature unit</span>
              <span className="font-medium text-[var(--ink)]">
                {preferredUnit === "celsius" ? "Celsius" : "Fahrenheit"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--ink-soft)]">Location</span>
              <span className="font-medium text-[var(--ink)]">
                {city.latitude.toFixed(2)}, {city.longitude.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {daily ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Forecast</p>
              <h3 className="mt-3 text-2xl font-medium tracking-tight">
                Next 5 days
              </h3>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            {daily.time.map((day, index) => {
              const weather = describeWeatherCode(daily.weather_code[index]);
              return (
                <article
                  className="card-shell-strong flex flex-col gap-3 p-5"
                  key={day}
                >
                  <p className="text-sm text-[var(--ink-soft)]">
                    {formatDayLabel(day)}
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
                    <span
                      className="pill-dot"
                      style={{ backgroundColor: weather.accent }}
                    />
                    {weather.label}
                  </div>
                  <div className="text-2xl font-medium tracking-tight">
                    {formatTemperature(daily.temperature_2m_max[index], preferredUnit)}
                  </div>
                  <p className="text-sm text-[var(--ink-soft)]">
                    Low{" "}
                    {formatTemperature(daily.temperature_2m_min[index], preferredUnit)}
                  </p>
                  <p className="text-xs text-[var(--ink-soft)]">
                    Chance of rain:{" "}
                    {daily.precipitation_probability_max?.[index] ?? 0}%
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
}
