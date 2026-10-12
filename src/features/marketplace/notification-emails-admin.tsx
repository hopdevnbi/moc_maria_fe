"use client";
import { useState, type FormEvent } from "react";
import { usePrivateData, usePrivateMutation, mutationMessage } from "./private-api";

type Recipient = { email: string; enabled: boolean };
type ChatDigest = {
  enabled: boolean;
  mode: "daily" | "interval";
  hour: number;
  intervalHours: number;
  zalo: boolean;
  email: boolean;
  nextAt: string | null;
  zaloReady: boolean;
  emailReady: boolean;
  pending: number;
  failed: number;
};
function ChatDigestAdmin() {
  const settings = usePrivateData<ChatDigest>("/admin/chat-digest");
  const change = usePrivateMutation();
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState("daily");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await change.mutateAsync({
        path: "/admin/chat-digest",
        body: {
          enabled: form.has("enabled"),
          mode: form.get("mode"),
          hour: Number(form.get("hour")),
          intervalHours: Number(form.get("intervalHours")),
          zalo: form.has("zalo"),
          email: form.has("email"),
        },
      });
      await settings.refetch();
      setNotice("Đã lưu lịch báo cáo hội thoại.");
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  return (
    <section className="market-panel">
      <h2>Báo cáo chat Khách – KTV</h2>
      <p>
        Mỗi hội thoại có tin mới nhận một báo cáo trong mỗi kỳ. Báo cáo gồm tên khách, KTV và số tin
        mới; không gửi lại các hội thoại không thay đổi.
      </p>
      {settings.isPending && <p role="status">Đang tải lịch báo cáo...</p>}
      {settings.isError && <p role="alert">Không tải được lịch báo cáo. Vui lòng thử lại.</p>}
      {settings.data && (
        <>
          <p>
            Zalo:{" "}
            {settings.data.zaloReady ? "Đã kết nối người nhận" : "Chưa kết nối người nhận với Bot"}.
            Email:{" "}
            {settings.data.emailReady
              ? "Đã cấu hình"
              : "Cần email người nhận và kết nối dịch vụ gửi"}
            .
          </p>
          <form
            key={JSON.stringify(settings.data)}
            className="market-form"
            onSubmit={(event) => void save(event)}
          >
            <label>
              <input type="checkbox" name="enabled" defaultChecked={settings.data.enabled} /> Bật
              báo cáo chat
            </label>
            <label>
              Tần suất
              <select
                name="mode"
                defaultValue={settings.data.mode}
                onChange={(event) => setMode(event.target.value)}
              >
                <option value="daily">Mỗi ngày vào giờ cố định</option>
                <option value="interval">Theo khoảng thời gian</option>
              </select>
            </label>
            <label>
              Giờ báo hằng ngày (giờ Việt Nam)
              <select name="hour" defaultValue={settings.data.hour}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label>
              Khoảng cách giữa các lần báo (giờ)
              <input
                name="intervalHours"
                type="number"
                min={1}
                max={168}
                defaultValue={settings.data.intervalHours}
              />
            </label>
            <p>
              {mode === "interval"
                ? "Khoảng cách tính từ lúc lưu lịch; tối thiểu 1 giờ."
                : "Giờ cố định áp dụng khi chọn báo mỗi ngày."}
            </p>
            <label>
              <input type="checkbox" name="zalo" defaultChecked={settings.data.zalo} /> Gửi qua Zalo
            </label>
            <label>
              <input type="checkbox" name="email" defaultChecked={settings.data.email} /> Gửi qua
              email admin ở danh sách bên dưới
            </label>
            <button className="market-button" disabled={change.isPending}>
              Lưu lịch báo cáo
            </button>
          </form>
          {settings.data.nextAt && (
            <p>
              Lần báo tiếp theo:{" "}
              {new Date(settings.data.nextAt).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}{" "}
              (giờ Việt Nam).
            </p>
          )}
          <p>
            Đang chờ gửi: {settings.data.pending}. Gửi lỗi cần kiểm tra: {settings.data.failed}.
          </p>
        </>
      )}
      {notice && (
        <p role="status" className="market-notice">
          {notice}
        </p>
      )}
    </section>
  );
}
export function NotificationEmailsAdmin() {
  const recipients = usePrivateData<Recipient[]>("/admin/notification-emails");
  const change = usePrivateMutation();
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  async function save(nextEmail: string, enabled: boolean) {
    try {
      await change.mutateAsync({
        path: "/admin/notification-emails",
        body: { email: nextEmail, enabled },
      });
      await recipients.refetch();
      setEmail("");
      setNotice("Đã lưu danh sách email nhận thông báo.");
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  async function remove(nextEmail: string) {
    if (!window.confirm(`Xóa ${nextEmail} khỏi danh sách nhận thông báo?`)) return;
    try {
      await change.mutateAsync({
        path: `/admin/notification-emails/${encodeURIComponent(nextEmail)}`,
        method: "DELETE",
      });
      await recipients.refetch();
      setNotice("Đã xóa địa chỉ nhận thông báo.");
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  return (
    <>
      <ChatDigestAdmin />
      <section className="market-panel">
        <h2>Email admin nhận thông báo</h2>
        <p>
          Những địa chỉ đang bật sẽ nhận email đặt lịch và báo cáo chat theo lịch ở trên. Thay đổi
          được lưu vào hệ thống, không cần chỉnh file cấu hình.
        </p>
        {recipients.isPending && <p role="status">Đang tải danh sách...</p>}
        {recipients.isError && (
          <p role="alert">
            Không tải được danh sách email. Kiểm tra quyền quản trị và kết nối Backend.
          </p>
        )}
        {recipients.data?.map((item) => (
          <div
            key={item.email}
            className="market-toolbar"
            style={{ marginBottom: 12, gap: 12, flexWrap: "wrap" }}
          >
            <strong>{item.email}</strong>
            <span>{item.enabled ? "Đang nhận" : "Tạm ngưng"}</span>
            <button
              type="button"
              className="market-button market-button-secondary"
              disabled={change.isPending}
              onClick={() => void save(item.email, !item.enabled)}
            >
              {item.enabled ? "Tạm ngưng" : "Bật nhận"}
            </button>
            <button
              type="button"
              className="market-button market-button-secondary"
              disabled={change.isPending}
              onClick={() => void remove(item.email)}
            >
              Xóa
            </button>
          </div>
        ))}
        <form
          className="market-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void save(email.trim(), true);
          }}
        >
          <label>
            Thêm email nhận thông báo
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={320}
              placeholder="email@example.com"
            />
          </label>
          <button className="market-button" disabled={change.isPending || !email.trim()}>
            Thêm email
          </button>
        </form>
        {notice && (
          <p role="status" className="market-notice">
            {notice}
          </p>
        )}
      </section>
    </>
  );
}
