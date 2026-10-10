import type { Metadata } from "next";
import { Suspense } from "react";
import { permanentRedirect } from "next/navigation";
import {
  cleanPublicQuery,
  internalProviderParam,
  internalServiceParam,
  internalVariantParam,
} from "@/features/mobile/public-route-ids";
import { publicProviderDirectory } from "@/features/mobile/data";
import { BookingWizard } from "@/features/mobile/booking";
import { AppointmentRequest } from "@/features/mobile/appointment-request";
import demoServices from "@/features/mobile/demo-services.json";
import type { ServiceItem } from "@/features/marketplace/types";

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
  const [data, query] = await Promise.all([publicProviderDirectory(), searchParams]);
  const clean = cleanPublicQuery(query);
  if (clean !== null) permanentRedirect("/dat-lich?" + clean);
  const value = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : undefined;
  if (value("flow") !== "verified")
    return (
      <AppointmentRequest
        key={JSON.stringify([value("provider"), value("service")])}
        providers={data.providers}
        services={[...data.services, ...(demoServices as ServiceItem[])]}
        initial={{
          provider: internalProviderParam(value("provider")),
          service: internalServiceParam(value("service")),
        }}
        verifiedAvailable={data.providers.some(
          (p) => !p.isDemo && p.eligibleServices?.some((s) => s.mode === "ON_SITE"),
        )}
      />
    );
  return (
    <BookingWizard
      providers={data.providers}
      services={data.services}
      branches={data.branches}
      initial={{
        provider: internalProviderParam(value("provider")),
        service: internalServiceParam(value("service")),
        variant: internalVariantParam(value("variant")),
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
