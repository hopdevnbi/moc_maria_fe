import { Suspense } from "react";
import { publicMarketplace } from "@/features/mobile/data";
import { KtvFirstHomepage } from "@/features/mobile/ktv-home";

async function HomeContent() {
  const data = await publicMarketplace();
  return <KtvFirstHomepage {...data} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl p-8" role="status">
          Đang chuẩn bị trải nghiệm Mộc Maria...
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
