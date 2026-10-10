"use client";
import { useState, type FormEvent } from "react";
import { usePrivateData, usePrivateMutation, mutationMessage } from "./private-api";

type Recipient = { email: string; enabled: boolean };
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
    <section className="market-panel">
      <h2>Email nhận thông báo đặt lịch</h2>
      <p>
        Những địa chỉ đang bật sẽ nhận email khi khách gửi yêu cầu đặt lịch mới. Thay đổi được lưu
        vào hệ thống, không cần chỉnh file cấu hình.
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
  );
}
