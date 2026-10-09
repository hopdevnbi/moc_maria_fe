import { Suspense } from "react";
import { publicMarketplace } from "@/features/mobile/data";
import { MobileExperience } from "@/features/mobile/experience";

async function HomeContent() {
  const data = await publicMarketplace();
  return <MobileExperience {...data} page="home" />;
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
