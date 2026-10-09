import type { Metadata } from "next";
import { Suspense } from "react";
import { KtvChatPage } from "@/features/mobile/chat";

export const metadata: Metadata = {
  title: "Chat với KTV Mộc Maria",
  robots: { index: false, follow: false },
};

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  const { provider } = await searchParams;
  return (
    <Suspense fallback={<p role="status">Đang tải tin nhắn...</p>}>
      <KtvChatPage provider={provider} />
    </Suspense>
  );
}
