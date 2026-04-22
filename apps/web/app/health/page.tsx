import { WorkerHealthDashboard } from "@/components/worker-health-dashboard";
import { SiteShell } from "@/components/site-shell";

export default function HealthPage() {
  return (
    <SiteShell>
      <WorkerHealthDashboard />
    </SiteShell>
  );
}
