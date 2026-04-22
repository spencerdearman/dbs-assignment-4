import { createClient } from "@supabase/supabase-js";

const CITY_CATALOG = [
  {
    id: "chicago-il",
    name: "Chicago",
    region: "Illinois",
    country: "USA",
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: "America/Chicago",
    is_featured: true,
  },
  {
    id: "new-york-ny",
    name: "New York",
    region: "New York",
    country: "USA",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
    is_featured: true,
  },
  {
    id: "los-angeles-ca",
    name: "Los Angeles",
    region: "California",
    country: "USA",
    latitude: 34.0522,
    longitude: -118.2437,
    timezone: "America/Los_Angeles",
    is_featured: true,
  },
  {
    id: "seattle-wa",
    name: "Seattle",
    region: "Washington",
    country: "USA",
    latitude: 47.6062,
    longitude: -122.3321,
    timezone: "America/Los_Angeles",
    is_featured: true,
  },
  {
    id: "miami-fl",
    name: "Miami",
    region: "Florida",
    country: "USA",
    latitude: 25.7617,
    longitude: -80.1918,
    timezone: "America/New_York",
    is_featured: true,
  },
  {
    id: "denver-co",
    name: "Denver",
    region: "Colorado",
    country: "USA",
    latitude: 39.7392,
    longitude: -104.9903,
    timezone: "America/Denver",
    is_featured: true,
  },
  {
    id: "boston-ma",
    name: "Boston",
    region: "Massachusetts",
    country: "USA",
    latitude: 42.3601,
    longitude: -71.0589,
    timezone: "America/New_York",
    is_featured: true,
  },
  {
    id: "austin-tx",
    name: "Austin",
    region: "Texas",
    country: "USA",
    latitude: 30.2672,
    longitude: -97.7431,
    timezone: "America/Chicago",
    is_featured: true,
  },
  {
    id: "phoenix-az",
    name: "Phoenix",
    region: "Arizona",
    country: "USA",
    latitude: 33.4484,
    longitude: -112.074,
    timezone: "America/Phoenix",
    is_featured: true,
  },
  {
    id: "honolulu-hi",
    name: "Honolulu",
    region: "Hawaii",
    country: "USA",
    latitude: 21.3099,
    longitude: -157.8581,
    timezone: "Pacific/Honolulu",
    is_featured: true,
  },
  {
    id: "tokyo-jp",
    name: "Tokyo",
    region: "Tokyo",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
    is_featured: true,
  },
  {
    id: "seoul-kr",
    name: "Seoul",
    region: "Seoul",
    country: "South Korea",
    latitude: 37.5665,
    longitude: 126.978,
    timezone: "Asia/Seoul",
    is_featured: false,
  },
  {
    id: "singapore-sg",
    name: "Singapore",
    region: "Singapore",
    country: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: "Asia/Singapore",
    is_featured: false,
  },
  {
    id: "sydney-au",
    name: "Sydney",
    region: "New South Wales",
    country: "Australia",
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: "Australia/Sydney",
    is_featured: false,
  },
  {
    id: "london-uk",
    name: "London",
    region: "England",
    country: "United Kingdom",
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: "Europe/London",
    is_featured: true,
  },
  {
    id: "paris-fr",
    name: "Paris",
    region: "Ile-de-France",
    country: "France",
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: "Europe/Paris",
    is_featured: false,
  },
  {
    id: "berlin-de",
    name: "Berlin",
    region: "Berlin",
    country: "Germany",
    latitude: 52.52,
    longitude: 13.405,
    timezone: "Europe/Berlin",
    is_featured: false,
  },
  {
    id: "rome-it",
    name: "Rome",
    region: "Lazio",
    country: "Italy",
    latitude: 41.9028,
    longitude: 12.4964,
    timezone: "Europe/Rome",
    is_featured: false,
  },
  {
    id: "madrid-es",
    name: "Madrid",
    region: "Community of Madrid",
    country: "Spain",
    latitude: 40.4168,
    longitude: -3.7038,
    timezone: "Europe/Madrid",
    is_featured: false,
  },
  {
    id: "toronto-ca",
    name: "Toronto",
    region: "Ontario",
    country: "Canada",
    latitude: 43.6532,
    longitude: -79.3832,
    timezone: "America/Toronto",
    is_featured: false,
  },
  {
    id: "vancouver-ca",
    name: "Vancouver",
    region: "British Columbia",
    country: "Canada",
    latitude: 49.2827,
    longitude: -123.1207,
    timezone: "America/Vancouver",
    is_featured: false,
  },
  {
    id: "mexico-city-mx",
    name: "Mexico City",
    region: "Mexico City",
    country: "Mexico",
    latitude: 19.4326,
    longitude: -99.1332,
    timezone: "America/Mexico_City",
    is_featured: false,
  },
  {
    id: "sao-paulo-br",
    name: "Sao Paulo",
    region: "Sao Paulo",
    country: "Brazil",
    latitude: -23.5558,
    longitude: -46.6396,
    timezone: "America/Sao_Paulo",
    is_featured: false,
  },
  {
    id: "buenos-aires-ar",
    name: "Buenos Aires",
    region: "Buenos Aires",
    country: "Argentina",
    latitude: -34.6037,
    longitude: -58.3816,
    timezone: "America/Argentina/Buenos_Aires",
    is_featured: false,
  },
  {
    id: "dubai-ae",
    name: "Dubai",
    region: "Dubai",
    country: "United Arab Emirates",
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: "Asia/Dubai",
    is_featured: false,
  },
  {
    id: "mumbai-in",
    name: "Mumbai",
    region: "Maharashtra",
    country: "India",
    latitude: 19.076,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
    is_featured: false,
  },
  {
    id: "cape-town-za",
    name: "Cape Town",
    region: "Western Cape",
    country: "South Africa",
    latitude: -33.9249,
    longitude: 18.4241,
    timezone: "Africa/Johannesburg",
    is_featured: false,
  },
  {
    id: "auckland-nz",
    name: "Auckland",
    region: "Auckland",
    country: "New Zealand",
    latitude: -36.8509,
    longitude: 174.7645,
    timezone: "Pacific/Auckland",
    is_featured: false,
  },
];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POLL_INTERVAL_MINUTES = Number.parseInt(
  process.env.POLL_INTERVAL_MINUTES ?? "15",
  10,
);
const WORKER_ID = "open-meteo-worker";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the worker environment.",
  );
}

if (Number.isNaN(POLL_INTERVAL_MINUTES) || POLL_INTERVAL_MINUTES <= 0) {
  throw new Error("POLL_INTERVAL_MINUTES must be a positive integer.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function buildWeatherUrl(city) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set(
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
  url.searchParams.set("wind_speed_unit", "kmh");
  return url;
}

async function syncCityCatalog() {
  const { error } = await supabase.from("cities").upsert(CITY_CATALOG, {
    onConflict: "id",
  });

  if (error) {
    throw error;
  }
}

async function fetchSnapshot(city) {
  const response = await fetch(buildWeatherUrl(city), {
    headers: {
      "User-Agent": "citycast-live-worker/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo returned ${response.status} for ${city.name}.`);
  }

  const payload = await response.json();
  const current = payload.current;

  if (!current) {
    throw new Error(`Open-Meteo returned no current payload for ${city.name}.`);
  }

  const observedAt = new Date().toISOString();

  return {
    city_id: city.id,
    temperature_c: current.temperature_2m,
    apparent_temperature_c: current.apparent_temperature,
    relative_humidity: current.relative_humidity_2m,
    precipitation_mm: current.precipitation ?? 0,
    wind_speed_kph: current.wind_speed_10m,
    weather_code: current.weather_code,
    is_day: Boolean(current.is_day),
    observed_at: observedAt,
    updated_at: observedAt,
  };
}

async function updateWorkerStatus(patch) {
  const { error } = await supabase.from("worker_status").upsert(
    {
      id: WORKER_ID,
      source_name: "open-meteo",
      poll_interval_minutes: POLL_INTERVAL_MINUTES,
      ...patch,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}

async function pollOnce() {
  const startedAt = new Date().toISOString();
  await updateWorkerStatus({
    last_run_at: startedAt,
    last_error: null,
  });

  const results = await Promise.allSettled(CITY_CATALOG.map(fetchSnapshot));
  const successfulSnapshots = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  const failedCount = results.length - successfulSnapshots.length;

  if (successfulSnapshots.length === 0) {
    throw new Error("Every Open-Meteo request failed during this poll.");
  }

  const { error } = await supabase.from("weather_snapshots").upsert(
    successfulSnapshots,
    {
      onConflict: "city_id",
    },
  );

  if (error) {
    throw error;
  }

  await updateWorkerStatus({
    last_run_at: startedAt,
    last_success_at: new Date().toISOString(),
    last_error:
      failedCount > 0
        ? `${failedCount} city requests failed during the latest poll.`
        : null,
  });

  console.log(
    `[worker] synced ${successfulSnapshots.length} cities at ${new Date().toISOString()}`,
  );
}

async function run() {
  await syncCityCatalog();
  await updateWorkerStatus({
    poll_interval_minutes: POLL_INTERVAL_MINUTES,
    last_error: "Worker initialized and waiting for first successful poll.",
  });

  await pollOnce();

  setInterval(async () => {
    try {
      await pollOnce();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown worker error";

      console.error("[worker] poll failed:", message);

      await updateWorkerStatus({
        last_run_at: new Date().toISOString(),
        last_error: message,
      });
    }
  }, POLL_INTERVAL_MINUTES * 60 * 1000);
}

run().catch(async (error) => {
  const message =
    error instanceof Error ? error.message : "Unknown worker startup error";

  console.error("[worker] startup failed:", message);

  try {
    await updateWorkerStatus({
      last_run_at: new Date().toISOString(),
      last_error: message,
    });
  } catch (statusError) {
    console.error("[worker] failed to update worker status:", statusError);
  }

  process.exitCode = 1;
});
