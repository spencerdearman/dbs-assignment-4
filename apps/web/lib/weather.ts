import type { TemperatureUnit } from "@/lib/types";

export function describeWeatherCode(code: number) {
  return WEATHER_CODE_DESCRIPTIONS[code] ?? WEATHER_CODE_DESCRIPTIONS.default;
}

export function formatTemperature(valueC: number, unit: TemperatureUnit) {
  if (unit === "celsius") {
    return `${Math.round(valueC)}°C`;
  }

  return `${Math.round((valueC * 9) / 5 + 32)}°F`;
}

export function formatWind(windSpeedKph: number) {
  return `${Math.round(windSpeedKph)} km/h`;
}

export function formatRelativeTime(timestamp: string) {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const differenceInMinutes = Math.max(0, Math.round((now - then) / 60000));

  if (differenceInMinutes < 1) {
    return "just now";
  }

  if (differenceInMinutes === 1) {
    return "1 minute ago";
  }

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes} minutes ago`;
  }

  const differenceInHours = Math.round(differenceInMinutes / 60);

  if (differenceInHours === 1) {
    return "1 hour ago";
  }

  return `${differenceInHours} hours ago`;
}

export function getCityLocalTime(timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date());
}

const WEATHER_CODE_DESCRIPTIONS: Record<
  number | "default",
  { accent: string; label: string }
> = {
  0: { label: "Clear sky", accent: "rgba(255, 220, 117, 0.24)" },
  1: { label: "Mostly clear", accent: "rgba(255, 232, 167, 0.24)" },
  2: { label: "Partly cloudy", accent: "rgba(178, 209, 237, 0.26)" },
  3: { label: "Overcast", accent: "rgba(184, 194, 204, 0.24)" },
  45: { label: "Fog", accent: "rgba(205, 214, 224, 0.26)" },
  48: { label: "Rime fog", accent: "rgba(205, 214, 224, 0.26)" },
  51: { label: "Light drizzle", accent: "rgba(157, 211, 245, 0.24)" },
  53: { label: "Drizzle", accent: "rgba(127, 198, 244, 0.24)" },
  55: { label: "Dense drizzle", accent: "rgba(89, 179, 239, 0.26)" },
  61: { label: "Light rain", accent: "rgba(123, 191, 244, 0.26)" },
  63: { label: "Rain", accent: "rgba(87, 175, 241, 0.26)" },
  65: { label: "Heavy rain", accent: "rgba(60, 150, 230, 0.28)" },
  71: { label: "Light snow", accent: "rgba(218, 236, 248, 0.32)" },
  73: { label: "Snow", accent: "rgba(210, 229, 248, 0.34)" },
  75: { label: "Heavy snow", accent: "rgba(199, 224, 248, 0.34)" },
  80: { label: "Rain showers", accent: "rgba(103, 182, 241, 0.26)" },
  81: { label: "Showers", accent: "rgba(89, 173, 236, 0.28)" },
  82: { label: "Heavy showers", accent: "rgba(70, 159, 228, 0.3)" },
  95: { label: "Thunderstorm", accent: "rgba(152, 109, 212, 0.24)" },
  96: { label: "Storm with hail", accent: "rgba(136, 89, 201, 0.26)" },
  99: { label: "Severe storm", accent: "rgba(123, 69, 194, 0.28)" },
  default: { label: "Weather update", accent: "rgba(255, 255, 255, 0.2)" },
};
