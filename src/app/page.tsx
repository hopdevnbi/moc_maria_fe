import { Suspense } from "react";
import { io } from "next/cache";
import { publicProviderDirectory } from "@/features/mobile/data";
import { KtvFirstHomepage } from "@/features/mobile/ktv-home";
import { PublicPageLoading } from "@/shared/loading/public-page-loading";
import { getNoelPromotion } from "@/shared/seasonal/noel-promotion-data";
import { NoelPromotionDialog } from "@/shared/seasonal/noel-promotion";

async function HomePromotion() {
  // Keep the live read outside the static shell and outside API failure handling.
  await io();
  const promotion = await getNoelPromotion();
  return promotion ? <NoelPromotionDialog promotion={promotion} /> : null;
}

async function HomeContent() {
  const data = await publicProviderDirectory();
  return (
    <>
      <KtvFirstHomepage {...data} />
      <Suspense fallback={null}>
        <HomePromotion />
      </Suspense>
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
