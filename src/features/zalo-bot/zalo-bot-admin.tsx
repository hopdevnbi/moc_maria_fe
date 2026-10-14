"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Copy,
  KeyRound,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import {
  mutationMessage,
  usePrivateData,
  usePrivateMutation,
} from "@/features/marketplace/private-api";
import {
  NotificationBadge,
  NotificationNav,
  notificationDate,
} from "@/features/notifications/notification-ui";

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

export function ZaloBotAdmin() {
  const status = usePrivateData<Status>("/admin/zalo-bot");
  const mutation = usePrivateMutation<Pairing>();
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeArea, setNoticeArea] = useState<"connection" | "test">("connection");
  const [failed, setFailed] = useState(false);
  const connected = !!status.data?.recipientCount;
  async function connect() {
    setNoticeArea("connection");
    setNotice("");
    try {
      setPairing(await mutation.mutateAsync({ path: "/admin/zalo-bot/pairing" }));
      setFailed(false);
      setNotice("Đã tạo mã. Hãy gửi nguyên dòng bên dưới vào Bot Mộc Maria trên Zalo.");
    } catch (error) {
      setFailed(true);
      setNotice(mutationMessage(error));
    }
  }
  async function test() {
    setNoticeArea("test");
    setNotice("");
    try {
      await mutation.mutateAsync({ path: "/admin/zalo-bot/test" });
      setFailed(false);
      setNotice(
        "Đã xếp hàng thông báo kiểm tra. Mở Bot trên Zalo để xem, rồi bấm Kiểm tra trạng thái.",
      );
    } catch (error) {
      setFailed(true);
      setNotice(mutationMessage(error));
    }
  }
  async function report() {
    setNoticeArea("test");
    setNotice("");
    try {
      await mutation.mutateAsync({ path: "/admin/chat-digest/run" });
      setFailed(false);
      setNotice(
        "Đã tổng hợp các hội thoại có tin mới. Thông báo được gửi trong khoảng 30 giây; hội thoại không có tin mới sẽ không báo lại.",
      );
    } catch (error) {
      setFailed(true);
      setNotice(mutationMessage(error));
    }
  }
  async function copy() {
    if (!pairing) return;
    setNoticeArea("connection");
    try {
      await navigator.clipboard.writeText(pairing.command);
      setFailed(false);
      setNotice("Đã sao chép. Mở Bot Mộc Maria trên Zalo và dán dòng kết nối.");
    } catch {
      setFailed(true);
      setNotice("Hãy chọn dòng kết nối bên dưới và sao chép thủ công.");
    }
  }
  return (
    <div className="mm-notifications">
      <div className="nt-toolbar">
        <NotificationNav active="zalo" />
        <button
          className="nt-button nt-button--quiet nt-refresh"
          type="button"
          disabled={status.isFetching}
          onClick={() => void status.refetch()}
        >
          <RefreshCw size={15} aria-hidden />
          Kiểm tra trạng thái
        </button>
      </div>
      {status.isPending && (
        <div className="nt-card nt-loading" role="status">
          Đang kiểm tra kết nối Bot…
        </div>
      )}
      {status.isError && (
        <p role="alert" className="nt-notice nt-notice--error">
          Chưa tải được trạng thái. Hãy thử lại.
        </p>
      )}
      <div className="nt-zalo-grid">
        <div className="nt-zalo-stack">
          <section className="nt-card">
            <header className="nt-card-heading">
              <span className="nt-heading-icon">
                <MessageCircle size={23} aria-hidden />
              </span>
              <div>
                <span className="nt-eyebrow">KÊNH THÔNG BÁO</span>
                <h2>Bot Mộc Maria</h2>
                <p>Đặt lịch mới được báo ngay. Chat được tổng hợp theo lịch bạn chọn.</p>
              </div>
            </header>
            {connected ? (
              <div className="nt-connected">
                <CheckCircle2 size={25} aria-hidden />
                <div>
                  <strong>Đã kết nối người nhận</strong>
                  <p>{status.data!.recipientCount} người / nhóm đang nhận thông báo.</p>
                </div>
              </div>
            ) : (
              <div className="nt-connected">
                <MessageCircle size={24} aria-hidden />
                <div>
                  <strong>Kết nối người nhận thông báo</strong>
                  <p>Tạo một mã và gửi vào Bot trên Zalo để bắt đầu.</p>
                </div>
              </div>
            )}
            <div className="nt-toolbar">
              <NotificationBadge
                tone={status.data?.botConfigured && status.data.webhookConfigured ? "good" : "warn"}
              >
                {status.data?.botConfigured && status.data.webhookConfigured
                  ? "Bot & webhook sẵn sàng"
                  : "Cần kiểm tra cấu hình"}
              </NotificationBadge>
              <button
                className="nt-button nt-button--quiet"
                type="button"
                disabled={
                  mutation.isPending ||
                  !status.data?.botConfigured ||
                  !status.data.webhookConfigured
                }
                onClick={connect}
              >
                <KeyRound size={16} aria-hidden />
                Tạo mã kết nối
              </button>
            </div>
            <details className="nt-steps" open={!connected}>
              <summary>
                {connected ? "Thêm người nhận hoặc nhóm Zalo" : "Kết nối trong 3 bước"}
              </summary>
              <ol>
                <li>
                  Bấm <strong>Tạo mã kết nối</strong> và sao chép nguyên dòng được tạo.
                </li>
                <li>
                  Mở Zalo, vào cuộc trò chuyện <strong>Bot Mộc Maria</strong>. Dán và gửi dòng kết
                  nối.
                </li>
                <li>
                  Khi Bot trả lời <strong>Đã kết nối thông báo thành công</strong>, quay lại đây và
                  bấm <strong>Kiểm tra trạng thái</strong>.
                </li>
              </ol>
              <p className="nt-hint">
                Nếu dùng nhóm quản trị, thêm Bot vào nhóm rồi gửi mã trong nhóm đó. Mỗi mã dùng một
                lần, có hiệu lực 30 phút; tạo mã mới thay thế mã chưa dùng.
              </p>
            </details>
            {pairing && (
              <div className="nt-code">
                <label htmlFor="zalo-pairing">Dòng cần gửi vào Bot</label>
                <textarea
                  id="zalo-pairing"
                  readOnly
                  rows={2}
                  value={pairing.command}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button type="button" className="nt-button nt-button--quiet" onClick={copy}>
                  <Copy size={14} aria-hidden />
                  Sao chép dòng kết nối
                </button>
                <small>
                  Hết hạn lúc {notificationDate(pairing.expiresAt)}. Chỉ gửi mã vào cuộc trò chuyện
                  hoặc nhóm cần nhận thông báo.
                </small>
              </div>
            )}
            {notice && noticeArea === "connection" && (
              <p
                className={`nt-notice ${failed ? "nt-notice--error" : ""}`}
                role={failed ? "alert" : "status"}
              >
                {notice}
              </p>
            )}
            {status.data?.lastWebhookAt && (
              <p className="nt-sender">
                <ShieldCheck size={14} aria-hidden />
                Lần tương tác gần nhất: {notificationDate(status.data.lastWebhookAt)}
              </p>
            )}
          </section>
          <section className="nt-card">
            <span className="nt-eyebrow">KIỂM TRA NHANH</span>
            <h2>Biết ngay thông báo có đến</h2>
            <div className="nt-test-actions">
              <div className="nt-test-action">
                <div>
                  <h3>Thử kết nối Zalo</h3>
                  <p>Gửi một tin kiểm tra, không tạo lịch hẹn hay hội thoại.</p>
                </div>
                <button
                  className="nt-button"
                  type="button"
                  disabled={mutation.isPending || !connected}
                  onClick={test}
                >
                  <Send size={15} aria-hidden />
                  Gửi thông báo kiểm tra
                </button>
              </div>
              <div className="nt-test-action">
                <div>
                  <h3>Xem báo cáo chat hiện tại</h3>
                  <p>Tổng hợp các hội thoại có tin mới. Hội thoại yên lặng không báo lại.</p>
                </div>
                <button
                  className="nt-button nt-button--quiet"
                  type="button"
                  disabled={mutation.isPending || !connected}
                  onClick={report}
                >
                  Gửi báo cáo chat ngay
                  <ArrowUpRight size={15} aria-hidden />
                </button>
              </div>
            </div>
            {notice && noticeArea === "test" && (
              <p
                className={`nt-notice ${failed ? "nt-notice--error" : ""}`}
                role={failed ? "alert" : "status"}
              >
                {notice}
              </p>
            )}
            <p className="nt-sender">
              <Link href="/quan-tri/thong-bao">
                Chỉnh lịch báo cáo chat và email <ArrowUpRight size={12} aria-hidden />
              </Link>
            </p>
          </section>
        </div>
        <section className="nt-card">
          <header className="nt-card-heading">
            <span className="nt-heading-icon">
              <ShieldCheck size={22} aria-hidden />
            </span>
            <div>
              <span className="nt-eyebrow">THEO DÕI GỬI TIN</span>
              <h2>Thông báo gần đây</h2>
              <p>Hiển thị tối đa 10 thông báo mới nhất.</p>
            </div>
          </header>
          {status.data && !status.data.deliveries.length && (
            <div className="nt-empty">
              <Send size={25} aria-hidden />
              <strong>Chưa có thông báo Zalo</strong>
              <p>Kết nối người nhận rồi gửi một tin kiểm tra.</p>
            </div>
          )}
          <ul className="nt-delivery-list">
            {status.data?.deliveries.map((item) => (
              <li key={item.key} className="nt-delivery">
                <div>
                  <NotificationBadge
                    tone={
                      item.status === "sent" ? "good" : item.status === "failed" ? "warn" : "muted"
                    }
                  >
                    {item.status === "sent"
                      ? "Đã gửi"
                      : item.status === "failed"
                        ? "Gửi thất bại"
                        : "Đang chờ / thử lại"}
                  </NotificationBadge>
                  <time dateTime={item.updatedAt}>{notificationDate(item.updatedAt)}</time>
                  {item.errorCode && (
                    <small className="nt-delivery-error">Mã lỗi {item.errorCode}</small>
                  )}
                </div>
                <small>{item.attempts} lần gửi</small>
              </li>
            ))}
          </ul>
          <p className="nt-sender">
            “Đã gửi” nghĩa là Zalo đã chấp nhận tin. Mở ứng dụng Zalo để kiểm tra tin nhận được.
          </p>
          <p className="nt-sender">
            <Link href="/quan-tri/lich-hen">
              Xem yêu cầu đặt lịch <ArrowUpRight size={12} aria-hidden />
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
