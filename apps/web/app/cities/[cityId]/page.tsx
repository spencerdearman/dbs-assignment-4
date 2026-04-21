import { SiteShell } from "@/components/site-shell";
import { CityDetail } from "@/components/city-detail";

export default async function CityPage({
  params,
}: {
  params: Promise<{ cityId: string }>;
}) {
  const { cityId } = await params;

  return (
    <SiteShell>
      <CityDetail cityId={cityId} />
    </SiteShell>
  );
}
