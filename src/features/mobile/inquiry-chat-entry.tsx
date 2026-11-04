"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { KtvChatPage } from "./chat";

export function InquiryChatEntry({ inquiryId }: { inquiryId: string }) {
  const { status, user, authFetch } = useAuth();
  const client = useQueryClient();
  const entry = useQuery({
    queryKey: ["ktv-inquiry-chat", user?.id, inquiryId],
    queryFn: async () => {
      const thread = await authFetch<{ id: string }>(`/ktv-chat/inquiries/${inquiryId}/thread`, {
        method: "POST",
        cache: "no-store",
      });
      await client.invalidateQueries({ queryKey: ["ktv-chat", user?.id, "threads"] });
      return thread;
    },
    enabled: status === "authenticated" && !!user,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (entry.data && status === "authenticated") return <KtvChatPage threadId={entry.data.id} />;
  const returnTo = "/tin-nhan?inquiry=" + encodeURIComponent(inquiryId);
  return (
    <main className="mobile-experience">
      <section className="ktv-chat-empty" aria-live="polite">
        <h1>Trò chuyện với khách đặt lịch</h1>
        {status === "anonymous" ? (
          <>
            <p>Đăng nhập bằng tài khoản KTV được đặt lịch để mở đúng cuộc trò chuyện.</p>
            <Link href={"/dang-nhap?returnTo=" + encodeURIComponent(returnTo)}>
              Đăng nhập để nhắn tin
            </Link>
          </>
        ) : entry.isError ? (
          <>
            <p>
              Chưa mở được cuộc trò chuyện. Hãy kiểm tra kết nối và dùng đúng tài khoản KTV được đặt
              lịch.
            </p>
            <button onClick={() => void entry.refetch()}>Thử lại</button>
            <Link href="/lich-hen">Xem lịch hẹn của tôi</Link>
          </>
        ) : (
          <p>Đang kiểm tra yêu cầu đặt lịch và mở cuộc trò chuyện…</p>
        )}
      </section>
    </main>
  );
}
