import type { Metadata } from "next";
import { Suspense } from "react";
import { publicProviderDirectory } from "@/features/mobile/data";
import { KtvFirstHomepage } from "@/features/mobile/ktv-home";
import { PublicPageLoading } from "@/shared/loading/public-page-loading";

export const metadata: Metadata = {
  title: "Danh sách Kỹ thuật viên",
  description:
    "Khám phá KTV Mộc Maria đã được phê duyệt, xem kinh nghiệm và chọn dịch vụ để đặt lịch.",
  alternates: { canonical: "/chuyen-vien" },
};

async function ProviderList() {
  const data = await publicProviderDirectory();
  return <KtvFirstHomepage {...data} />;
}

export default function ProvidersPage() {
  return (
    <Suspense
      fallback={
        <PublicPageLoading
          page="providers"
          titleKey="loading.directory"
          descriptionKey="loading.directoryDesc"
        />
      }
    >
      <ProviderList />
    </Suspense>
  );
}
