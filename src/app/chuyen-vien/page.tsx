import type { Metadata } from "next";
import { Suspense } from "react";
import { publicProviderDirectory } from "@/features/mobile/data";
import { KtvFirstHomepage } from "@/features/mobile/ktv-home";

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
        <main className="mx-auto max-w-4xl p-8" role="status">
          Đang tải danh sách kỹ thuật viên...
        </main>
      }
    >
      <ProviderList />
    </Suspense>
  );
}
