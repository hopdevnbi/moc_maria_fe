"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { KtvChatPage } from "./chat";

export function InquiryChatEntry({
  inquiryId,
  threadId,
  support = false,
}: {
  inquiryId?: string;
  threadId?: string;
  support?: boolean;
}) {
  const { status, user, authFetch } = useAuth();
  const client = useQueryClient();
  const entry = useQuery({
    queryKey: ["ktv-inquiry-chat", user?.id, inquiryId, threadId, support],
    queryFn: async () => {
      const endpoint = support
        ? threadId
          ? `/ktv-chat/inquiries/support/threads/${threadId}`
          : `/ktv-chat/inquiries/${inquiryId}/support-thread`
        : `/ktv-chat/inquiries/${inquiryId}/thread`;
      const thread = await authFetch<{ id: string }>(endpoint, {
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
  const returnTo =
    "/tin-nhan?" +
    (threadId
      ? "thread=" + encodeURIComponent(threadId)
      : "inquiry=" + encodeURIComponent(inquiryId || "")) +
    (support ? "&support=1" : "");
  return (
    <main className="mobile-experience">
      <section className="ktv-chat-empty" aria-live="polite">
        <h1>{support ? "Hỗ trợ khách và KTV" : "Trò chuyện với khách đặt lịch"}</h1>
        {status === "anonymous" ? (
          <>
            <p>
              {support
                ? "Đăng nhập tài khoản super admin để hỗ trợ đúng cuộc trò chuyện."
                : "Đăng nhập bằng tài khoản KTV được đặt lịch để mở đúng cuộc trò chuyện."}
            </p>
            <Link href={"/dang-nhap?returnTo=" + encodeURIComponent(returnTo)}>
              Đăng nhập để nhắn tin
            </Link>
          </>
        ) : entry.isError ? (
          <>
            <p>
              {support
                ? "Chưa mở được hỗ trợ. Hãy dùng tài khoản super admin. Hội thoại có mật khẩu riêng không mở hỗ trợ quản trị."
                : "Chưa mở được cuộc trò chuyện. Hãy kiểm tra kết nối và dùng đúng tài khoản KTV được đặt lịch."}
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
