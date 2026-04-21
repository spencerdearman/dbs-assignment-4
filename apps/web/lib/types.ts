export type TemperatureUnit = "fahrenheit" | "celsius";

export type CityRecord = {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  is_featured: boolean;
  created_at?: string;
};

export type WeatherSnapshotRecord = {
  city_id: string;
  temperature_c: number;
  apparent_temperature_c: number;
  relative_humidity: number;
  precipitation_mm: number;
  wind_speed_kph: number;
  weather_code: number;
  is_day: boolean;
  observed_at: string;
  updated_at: string;
};

export type UserProfileRecord = {
  user_id: string;
  preferred_unit: TemperatureUnit;
  created_at: string;
  updated_at: string;
};

export type WorkerStatusRecord = {
  id: string;
  source_name: string;
  poll_interval_minutes: number;
  last_run_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  updated_at: string;
};

