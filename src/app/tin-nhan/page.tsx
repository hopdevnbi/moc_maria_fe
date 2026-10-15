import type { Metadata } from "next";
import { Suspense } from "react";
import { permanentRedirect } from "next/navigation";
import {
  cleanPublicQuery,
  internalProviderParam,
  internalServiceParam,
} from "@/features/mobile/public-route-ids";
import { KtvChatPage } from "@/features/mobile/chat";
import { PublicPageLoading } from "@/shared/loading/public-page-loading";

export const metadata: Metadata = {
  title: "Chat với KTV Mộc Maria",
  robots: { index: false, follow: false },
};

async function MessagesContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const clean = cleanPublicQuery(query);
  if (clean !== null) permanentRedirect("/tin-nhan?" + clean);
  const provider =
    typeof query.provider === "string" ? internalProviderParam(query.provider) : undefined;
  const service =
    typeof query.service === "string" ? internalServiceParam(query.service) : undefined;
  return <KtvChatPage provider={provider} service={service} />;
}
export default function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <PublicPageLoading
          page="chat"
          title="Đang mở không gian trò chuyện"
          description="Chuẩn bị hội thoại riêng giữa bạn và kỹ thuật viên."
        />
      }
    >
      <MessagesContent searchParams={searchParams} />
    </Suspense>
  );
}
