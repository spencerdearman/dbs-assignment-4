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
  sunrise?: string[];
  sunset?: string[];
  uv_index_max?: number[];
};

type OpenMeteoCurrent = {
  temperature_2m: number;
  apparent_temperature: number;
  dew_point_2m?: number;
  relative_humidity_2m: number;
  precipitation: number | null;
  wind_speed_10m: number;
  weather_code: number;
  is_day: number | boolean;
  cloud_cover?: number;
  surface_pressure?: number;
  uv_index?: number;
  visibility?: number;
};

type OpenMeteoHourly = {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  wind_speed_10m: number[];
  weather_code: number[];
};

type OpenMeteoForecast = {
  current?: OpenMeteoCurrent;
  daily?: OpenMeteoDaily;
  hourly?: OpenMeteoHourly;
};

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatHourLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
  }).format(new Date(value));
}

function formatShortTime(value?: string) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatVisibility(valueMeters?: number | null) {
  if (valueMeters == null) {
    return "--";
  }

  return `${(valueMeters / 1000).toFixed(1)} km`;
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
        "dew_point_2m",
        "relative_humidity_2m",
        "precipitation",
        "wind_speed_10m",
        "weather_code",
        "is_day",
        "cloud_cover",
        "surface_pressure",
        "uv_index",
        "visibility",
      ].join(","),
    );
    forecastUrl.searchParams.set(
      "hourly",
      [
        "temperature_2m",
        "apparent_temperature",
        "precipitation_probability",
        "wind_speed_10m",
        "weather_code",
      ].join(","),
    );
    forecastUrl.searchParams.set(
      "daily",
      [
        "temperature_2m_max",
        "temperature_2m_min",
        "weather_code",
        "precipitation_probability_max",
        "sunrise",
        "sunset",
        "uv_index_max",
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
  const currentCloudCover = forecast?.current?.cloud_cover ?? null;
  const currentPressure = forecast?.current?.surface_pressure ?? null;
  const currentVisibility = forecast?.current?.visibility ?? null;
  const currentUv = forecast?.current?.uv_index ?? null;
  const currentDewPoint = forecast?.current?.dew_point_2m ?? null;
  const hourly = forecast?.hourly;
  const nextHourlyRows =
    hourly?.time.slice(0, 8).map((time, index) => ({
      time,
      temperatureC: hourly.temperature_2m[index],
      apparentTemperatureC: hourly.apparent_temperature[index],
      precipitationProbability: hourly.precipitation_probability[index],
      windSpeed: hourly.wind_speed_10m[index],
      weatherCode: hourly.weather_code[index],
    })) ?? [];
  const todayHigh = daily?.temperature_2m_max[0] ?? null;
  const todayLow = daily?.temperature_2m_min[0] ?? null;
  const todayRainChance = daily?.precipitation_probability_max?.[0] ?? null;
  const sunrise = daily?.sunrise?.[0];
  const sunset = daily?.sunset?.[0];
  const maxUv = daily?.uv_index_max?.[0] ?? null;

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

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Highlights</p>
          <h3 className="mt-3 text-2xl font-medium tracking-tight">
            Today at a glance
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="card-shell-strong p-5">
            <p className="eyebrow mb-3">High / Low</p>
            <div className="text-3xl font-medium tracking-tight">
              {todayHigh != null ? formatTemperature(todayHigh, preferredUnit) : "--"}
            </div>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Low {todayLow != null ? formatTemperature(todayLow, preferredUnit) : "--"}
            </p>
          </article>
          <article className="card-shell-strong p-5">
            <p className="eyebrow mb-3">Sun</p>
            <div className="text-3xl font-medium tracking-tight">
              {formatShortTime(sunrise)}
            </div>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Sunset {formatShortTime(sunset)}
            </p>
          </article>
          <article className="card-shell-strong p-5">
            <p className="eyebrow mb-3">Air + Sky</p>
            <div className="text-3xl font-medium tracking-tight">
              {currentCloudCover != null ? `${Math.round(currentCloudCover)}%` : "--"}
            </div>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Cloud cover
            </p>
          </article>
          <article className="card-shell-strong p-5">
            <p className="eyebrow mb-3">UV + Rain</p>
            <div className="text-3xl font-medium tracking-tight">
              {maxUv != null ? Math.round(maxUv).toString() : "--"}
            </div>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              Rain chance {todayRainChance != null ? `${todayRainChance}%` : "--"}
            </p>
          </article>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Hourly</p>
          <h3 className="mt-3 text-2xl font-medium tracking-tight">
            Next 8 hours
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
          {nextHourlyRows.map((row) => {
            const hourlyCondition = describeWeatherCode(row.weatherCode);
            return (
              <article className="card-shell-strong flex flex-col gap-3 p-4" key={row.time}>
                <p className="text-sm text-[var(--ink-soft)]">{formatHourLabel(row.time)}</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className="pill-dot"
                    style={{ backgroundColor: hourlyCondition.accent }}
                  />
                  <span className="truncate">{hourlyCondition.label}</span>
                </div>
                <div className="text-2xl font-medium tracking-tight">
                  {formatTemperature(row.temperatureC, preferredUnit)}
                </div>
                <div className="space-y-1 text-xs text-[var(--ink-soft)]">
                  <p>Feels {formatTemperature(row.apparentTemperatureC, preferredUnit)}</p>
                  <p>Rain {row.precipitationProbability}%</p>
                  <p>Wind {formatWind(row.windSpeed)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow">Metrics</p>
          <h3 className="mt-3 text-2xl font-medium tracking-tight">
            Additional details
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Humidity",
              value: currentHumidity != null ? `${Math.round(currentHumidity)}%` : "--",
            },
            {
              label: "Wind",
              value: currentWind != null ? formatWind(currentWind) : "--",
            },
            {
              label: "Visibility",
              value: formatVisibility(currentVisibility),
            },
            {
              label: "Pressure",
              value: currentPressure != null ? `${Math.round(currentPressure)} hPa` : "--",
            },
            {
              label: "UV Index",
              value: currentUv != null ? currentUv.toFixed(1) : "--",
            },
            {
              label: "Dew Point",
              value: currentDewPoint != null ? formatTemperature(currentDewPoint, preferredUnit) : "--",
            },
            {
              label: "Precipitation",
              value: `${Number(currentPrecipitation).toFixed(1)} mm`,
            },
            {
              label: "Coordinates",
              value: `${city.latitude.toFixed(2)}, ${city.longitude.toFixed(2)}`,
            },
          ].map((metric) => (
            <article className="card-shell-strong p-5" key={metric.label}>
              <p className="eyebrow mb-3">{metric.label}</p>
              <div className="text-2xl font-medium tracking-tight">{metric.value}</div>
            </article>
          ))}
        </div>
      </section>

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
