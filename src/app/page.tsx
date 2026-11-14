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
      fallback={
        <PublicPageLoading
          title="Một chút an yên, đang đến"
          description="Mộc đang chuẩn bị danh sách KTV và dịch vụ dành cho bạn."
        />
      }
    >
      <HomeContent />
    </Suspense>
  );
}
