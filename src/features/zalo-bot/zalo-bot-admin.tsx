"use client";
import Link from "next/link";
import { useState } from "react";
import {
  mutationMessage,
  usePrivateData,
  usePrivateMutation,
} from "@/features/marketplace/private-api";

type Status = {
  botConfigured: boolean;
  webhookConfigured: boolean;
  recipientCount: number;
  lastWebhookAt: string | null;
  deliveries: {
    key: string;
    status: string;
    attempts: string;
    errorCode: string | null;
    updatedAt: string;
  }[];
};
type Pairing = { command: string; expiresAt: string };
const date = (value: string) =>
  new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export function ZaloBotAdmin() {
  const status = usePrivateData<Status>("/admin/zalo-bot");
  const mutation = usePrivateMutation<Pairing>();
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [notice, setNotice] = useState("");
  async function connect() {
    try {
      setPairing(await mutation.mutateAsync({ path: "/admin/zalo-bot/pairing" }));
      setNotice("Đã tạo mã. Hãy gửi nguyên dòng bên dưới vào Bot Mộc Maria trên Zalo.");
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  async function test() {
    try {
      await mutation.mutateAsync({ path: "/admin/zalo-bot/test" });
      setNotice(
        "Đã xếp hàng thông báo kiểm tra. Mở Bot trên Zalo để xem, rồi bấm Kiểm tra trạng thái.",
      );
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  async function report() {
    try {
      await mutation.mutateAsync({ path: "/admin/chat-digest/run" });
      setNotice(
        "Đã tổng hợp các hội thoại có tin mới. Thông báo được gửi trong khoảng 30 giây; hội thoại không có tin mới sẽ không báo lại.",
      );
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  return (
    <section className="market-panel">
      <h2>Kết nối người nhận thông báo</h2>
      <p>
        Đặt lịch mới được báo ngay. Chat Khách – KTV được tổng hợp theo giờ hoặc theo ngày bạn chọn.
      </p>
      {status.isPending && <p role="status">Đang kiểm tra kết nối...</p>}
      {status.isError && <p role="alert">Chưa tải được trạng thái. Hãy thử lại.</p>}
      {status.data && (
        <p>
          Bot: {status.data.botConfigured ? "Đã cấu hình" : "Chưa cấu hình"} · Webhook:{" "}
          {status.data.webhookConfigured ? "Đã cấu hình" : "Chưa cấu hình"} · Người nhận:{" "}
          {status.data.recipientCount}
        </p>
      )}
      <ol>
        <li>
          Bấm <strong>Tạo mã kết nối</strong>.
        </li>
        <li>
          Mở Zalo, vào cuộc trò chuyện <strong>Bot Mộc Maria</strong>. Dán và gửi nguyên dòng kết
          nối.
        </li>
        <li>
          Bot trả lời <strong>Đã kết nối thông báo thành công</strong>. Quay lại đây và bấm{" "}
          <strong>Kiểm tra trạng thái</strong>.
        </li>
      </ol>
      <p>
        Nếu dùng nhóm quản trị, thêm Bot vào nhóm rồi gửi mã trong nhóm đó. Mỗi mã dùng một lần, có
        hiệu lực 30 phút; tạo mã mới thay thế mã chưa dùng.
      </p>
      <div className="market-actions">
        <button
          type="button"
          disabled={
            mutation.isPending || !status.data?.botConfigured || !status.data.webhookConfigured
          }
          onClick={connect}
        >
          Tạo mã kết nối
        </button>
        <button type="button" disabled={status.isFetching} onClick={() => void status.refetch()}>
          Kiểm tra trạng thái
        </button>
        <button
          type="button"
          disabled={mutation.isPending || !status.data?.recipientCount}
          onClick={test}
        >
          Gửi thông báo kiểm tra
        </button>
        <button
          type="button"
          disabled={mutation.isPending || !status.data?.recipientCount}
          onClick={report}
        >
          Gửi báo cáo chat ngay
        </button>
      </div>
      {pairing && (
        <div className="market-panel">
          <label htmlFor="zalo-pairing">Dòng cần gửi vào Bot</label>
          <textarea
            id="zalo-pairing"
            readOnly
            rows={2}
            value={pairing.command}
            style={{ width: "100%", overflowWrap: "anywhere" }}
            onFocus={(event) => event.currentTarget.select()}
          />
          <p>
            Hết hạn lúc {date(pairing.expiresAt)}. Chỉ gửi mã vào cuộc trò chuyện hoặc nhóm cần nhận
            thông báo.
          </p>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      <p>
        <Link href="/quan-tri/thong-bao">Chỉnh lịch báo cáo chat và email</Link> ·{" "}
        <Link href="/quan-tri/lich-hen">Xem yêu cầu đặt lịch</Link>
      </p>
      <h3>Thông báo gần đây</h3>
      <p>
        “Đã gửi” là Zalo đã chấp nhận tin; kiểm tra thêm trong ứng dụng Zalo để xác nhận bạn đã
        nhận.
      </p>
      {status.data && !status.data.deliveries.length && <p>Chưa có thông báo Zalo.</p>}
      <ul>
        {status.data?.deliveries.map((item) => (
          <li key={item.key}>
            {item.status === "sent"
              ? "Đã gửi"
              : item.status === "failed"
                ? "Gửi thất bại"
                : "Đang chờ / thử lại"}{" "}
            · {item.attempts} lần gửi · {date(item.updatedAt)}
            {item.errorCode && ` · Mã lỗi ${item.errorCode}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
