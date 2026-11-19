import { Suspense } from "react";
import { publicProviderDirectory } from "@/features/mobile/data";
import { KtvFirstHomepage } from "@/features/mobile/ktv-home";
import { PublicPageLoading } from "@/shared/loading/public-page-loading";
import { FirstVisitPromotionDialog } from "@/shared/seasonal/first-visit-promotion";

async function HomeContent() {
  const data = await publicProviderDirectory();
  return (
    <>
      <KtvFirstHomepage {...data} />
      <FirstVisitPromotionDialog />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={<PublicPageLoading titleKey="loading.home" descriptionKey="loading.homeDesc" />}
    >
      <HomeContent />
    </Suspense>
  );
}
