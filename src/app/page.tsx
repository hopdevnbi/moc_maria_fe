import { Suspense } from "react";
import { publicMarketplace } from "@/features/mobile/data";
import { KtvFirstHomepage } from "@/features/mobile/ktv-home";
import demoProviders from "@/features/mobile/demo-ktvs.json";
import type { Provider } from "@/features/marketplace/types";

async function HomeContent() {
  const data = await publicMarketplace();
  const demos = demoProviders as Provider[];
  return <KtvFirstHomepage {...data} providers={[...data.providers, ...demos]} />;
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
