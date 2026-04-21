import { SiteShell } from "@/components/site-shell";
import { CityDetail } from "@/components/city-detail";

export default function CityPage({
  params,
}: {
  params: { cityId: string };
}) {
  return (
    <SiteShell>
      <CityDetail cityId={params.cityId} />
    </SiteShell>
  );
}
