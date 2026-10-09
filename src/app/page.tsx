import { Suspense } from "react";
import { publicProviderDirectory } from "@/features/mobile/data";
import { KtvFirstHomepage } from "@/features/mobile/ktv-home";

async function HomeContent() {
  const data = await publicProviderDirectory();
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
