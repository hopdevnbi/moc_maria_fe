import type { Metadata } from "next";
import { Suspense } from "react";
import { publicMarketplace } from "@/features/mobile/data";
import { BookingWizard } from "@/features/mobile/booking";

export const metadata: Metadata = {
  title: "Đặt lịch massage và chăm sóc",
  description:
    "Chọn kỹ thuật viên hoặc dịch vụ, kiểm tra giờ trống và gửi yêu cầu đặt lịch tại Mộc Maria.",
  alternates: { canonical: "/dat-lich" },
};

async function BookingContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [data, query] = await Promise.all([publicMarketplace(), searchParams]);
  const value = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : undefined;
  return (
    <BookingWizard
      providers={data.providers}
      services={data.services}
      branches={data.branches}
      initial={{
        provider: value("provider"),
        service: value("service"),
        variant: value("variant"),
      }}
      unavailable={data.catalogUnavailable || data.providersUnavailable}
    />
  );
}

export default function BookingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl p-8" role="status">
          Đang mở lịch đặt hẹn...
        </main>
      }
    >
      <BookingContent searchParams={searchParams} />
    </Suspense>
  );
}
