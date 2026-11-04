import type { Metadata } from "next";
import { Suspense } from "react";
import { permanentRedirect } from "next/navigation";
import {
  cleanPublicQuery,
  internalProviderParam,
  internalServiceParam,
} from "@/features/mobile/public-route-ids";
import { KtvChatPage } from "@/features/mobile/chat";
import { InquiryChatEntry } from "@/features/mobile/inquiry-chat-entry";
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
  if (typeof query.inquiry === "string" && /^[a-f0-9]{64}$/.test(query.inquiry))
    return <InquiryChatEntry inquiryId={query.inquiry} />;
  const provider =
    typeof query.provider === "string" ? internalProviderParam(query.provider) : undefined;
  const service =
    typeof query.service === "string" ? internalServiceParam(query.service) : undefined;
  const threadId =
    typeof query.thread === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.thread)
      ? query.thread
      : undefined;
  return <KtvChatPage provider={provider} service={service} threadId={threadId} />;
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
