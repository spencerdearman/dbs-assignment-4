import { SiteShell } from "@/components/site-shell";
import { WeatherDashboard } from "@/components/weather-dashboard";

export default function Home() {
  return (
    <SiteShell>
      <WeatherDashboard />
    </SiteShell>
  );
}
