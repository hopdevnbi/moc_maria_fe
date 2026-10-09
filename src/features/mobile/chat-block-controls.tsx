"use client";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

export type ChatBlockState = {
  id: string;
  blocked_by_me?: boolean;
  blocked_by_other?: boolean;
  my_block_expires_at?: string | null;
  can_send?: boolean;
};
export function ChatBlockControls({ thread, name }: { thread: ChatBlockState; name: string }) {
  const { authFetch, user } = useAuth();
  const client = useQueryClient();
  const dialog = useRef<HTMLDialogElement>(null);
  const [duration, setDuration] = useState("1440");
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState("");
  const action = useMutation({
    mutationFn: (unblock: boolean) =>
      authFetch<ChatBlockState>(`/ktv-chat/threads/${thread.id}/${unblock ? "unblock" : "block"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          unblock
            ? {}
            : {
                mode: duration === "permanent" ? "PERMANENT" : "TEMPORARY",
                ...(duration === "permanent"
                  ? {}
                  : { durationMinutes: duration === "custom" ? days * 1440 : Number(duration) }),
                ...(reason.trim() ? { reason: reason.trim() } : {}),
              },
        ),
      }),
    onSuccess: async (saved) => {
      client.setQueryData<ChatBlockState[]>(["ktv-chat", user?.id, "threads"], (old) =>
        old?.map((row) => (row.id === saved.id ? { ...row, ...saved } : row)),
      );
      dialog.current?.close();
      await client.invalidateQueries({ queryKey: ["ktv-chat", user?.id, "threads"] });
    },
  });
  return (
    <>
      <button
        type="button"
        className="ktv-chat-icon-button"
        aria-label={`Quản lý chặn ${name}`}
        onClick={() => {
          action.reset();
          dialog.current?.showModal();
        }}
      >
        <Ban size={20} />
      </button>
      <dialog
        ref={dialog}
        className="ktv-chat-block-modal"
        aria-label="Quản lý chặn hội thoại"
        onCancel={(event) => {
          if (action.isPending) event.preventDefault();
        }}
      >
        <header>
          <h2>{thread.blocked_by_me ? "Quản lý chặn" : "Chặn hội thoại"}</h2>
          <button
            type="button"
            aria-label="Đóng quản lý chặn"
            disabled={action.isPending}
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </header>
        <p>
          <strong>{name}</strong>
        </p>
        <p>
          Khi chặn, cả hai tạm ngừng gửi tin nhắn trong hội thoại này. Lịch sử vẫn được giữ lại.
        </p>
        {thread.blocked_by_other && (
          <p>Người kia cũng đang chặn hội thoại. Bạn chỉ có thể gỡ lệnh chặn của mình.</p>
        )}
        {thread.blocked_by_me ? (
          <>
            <p>
              {thread.my_block_expires_at
                ? `Tự mở lại lúc ${new Date(thread.my_block_expires_at).toLocaleString("vi-VN")}.`
                : "Bạn đã chặn vĩnh viễn; có thể mở lại bất cứ lúc nào."}
            </p>
            <button
              className="ktv-chat-primary"
              disabled={action.isPending}
              onClick={() => action.mutate(true)}
            >
              {action.isPending ? "Đang mở lại..." : "Mở lại hội thoại"}
            </button>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              action.mutate(false);
            }}
          >
            <label>
              Thời gian chặn
              <select
                value={duration}
                disabled={action.isPending}
                onChange={(event) => setDuration(event.target.value)}
              >
                <option value="60">1 giờ</option>
                <option value="1440">1 ngày</option>
                <option value="10080">7 ngày</option>
                <option value="43200">30 ngày</option>
                <option value="custom">Số ngày khác</option>
                <option value="permanent">Vĩnh viễn</option>
              </select>
            </label>
            {duration === "custom" && (
              <label>
                Số ngày (1–365)
                <input
                  type="number"
                  min={1}
                  max={365}
                  step={1}
                  required
                  value={days}
                  onChange={(event) => setDays(event.target.valueAsNumber)}
                  disabled={action.isPending}
                />
              </label>
            )}
            <label>
              Ghi chú riêng cho bạn (không bắt buộc)
              <textarea
                value={reason}
                maxLength={200}
                disabled={action.isPending}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <p>Chặn chat không xoá hoặc ngăn đánh giá dịch vụ hợp lệ.</p>
            <button className="ktv-chat-primary" disabled={action.isPending}>
              {action.isPending ? "Đang chặn..." : "Xác nhận chặn"}
            </button>
          </form>
        )}
        {action.isError && (
          <p role="alert">
            Chưa cập nhật được trạng thái chặn. Hãy đóng và tải lại hội thoại rồi thử lại.
          </p>
        )}
      </dialog>
    </>
  );
}
