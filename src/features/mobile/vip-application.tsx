"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, CheckCircle2, Clock3, Crown, Send, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import "./vip.css";

interface VipRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewNote: string | null;
  createdAt: string;
}
interface VipSettings {
  displayName: string;
  description: string;
  benefits: string[];
  acceptingRequests: boolean;
  durationDays: number | null;
}
interface VipAccount {
  tier: "STANDARD" | "VIP";
  status: "STANDARD" | "PENDING" | "VIP" | "EXPIRED" | "SUSPENDED";
  membership: { expiresAt: string | null } | null;
  request: VipRequest | null;
  settings: VipSettings;
}
const statusText: Record<VipAccount["status"], string> = {
  STANDARD: "Khách hàng thân thiết",
  PENDING: "Đang chờ xét duyệt",
  VIP: "Hội viên VIP đã kích hoạt",
  EXPIRED: "Hội viên VIP đã hết hạn",
  SUSPENDED: "Quyền VIP tạm dừng",
};

export function VipApplication() {
  const { user, status, authFetch } = useAuth();
  const [account, setAccount] = useState<VipAccount | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user?.permissions.includes("customer.portal")) return;
    setLoading(true);
    try {
      const next = await authFetch<VipAccount>("/membership/me", { cache: "no-store" });
      setAccount(next);
      setError("");
    } catch {
      setError("Chưa thể tải trạng thái hội viên. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, user?.permissions]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [status, load]);

  async function submit() {
    if (!account || account.status === "VIP" || account.status === "PENDING" || sending) return;
    setSending(true);
    setError("");
    try {
      await authFetch("/membership/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim().slice(0, 500) }),
      });
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa gửi được yêu cầu xét duyệt.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mm-vip-request" aria-label="Đăng ký Hội viên VIP">
      <div className="mm-vip-request-heading">
        <span className="mm-vip-crown">
          <Crown size={24} />
        </span>
        <div>
          <span className="mm-overline">HỘI VIÊN VIP · CẦN ADMIN PHÊ DUYỆT</span>
          <h2>Hành trình gắn bó cùng Mộc</h2>
          <p>Không tự động nâng hạng. Mọi đăng ký được xét duyệt trước khi kích hoạt.</p>
        </div>
      </div>
      {status === "loading" || loading ? (
        <p role="status" className="mm-vip-muted">
          Đang tải thông tin hội viên...
        </p>
      ) : !user ? (
        <div className="mm-vip-message">
          <p>Đăng nhập tài khoản khách hàng để gửi yêu cầu xét duyệt Hội viên VIP.</p>
          <Link href="/dang-nhap?returnTo=%2Fhoi-vien" className="mm-primary-cta">
            Đăng nhập để đăng ký VIP
          </Link>
        </div>
      ) : !user.permissions.includes("customer.portal") ? (
        <p className="mm-vip-muted">Tính năng xét duyệt VIP dành cho tài khoản khách hàng.</p>
      ) : account ? (
        <>
          <div className={"mm-vip-current " + (account.status === "VIP" ? "active" : "")}>
            {account.status === "VIP" ? <BadgeCheck size={23} /> : <Clock3 size={23} />}
            <div>
              <strong>{statusText[account.status]}</strong>
              <p>
                {account.status === "PENDING"
                  ? "Mộc Maria đã nhận yêu cầu của bạn. Vui lòng đợi Admin xem xét."
                  : account.status === "VIP"
                    ? "Bạn đã được xét duyệt. Hãy theo dõi quyền lợi chính thức tại đây."
                    : account.status === "SUSPENDED"
                      ? "Vui lòng liên hệ Mộc Maria nếu cần kiểm tra lý do tạm dừng."
                      : "Bạn có thể gửi yêu cầu để Mộc Maria xét duyệt hạng VIP."}
              </p>
              {account.status === "VIP" && account.membership?.expiresAt && (
                <small>
                  Hiệu lực đến {new Date(account.membership.expiresAt).toLocaleDateString("vi-VN")}
                </small>
              )}
              {account.request?.status === "REJECTED" && account.request.reviewNote && (
                <small>Phản hồi lần trước: {account.request.reviewNote}</small>
              )}
            </div>
          </div>
          <p className="mm-vip-muted">{account.settings.description}</p>
          {account.settings.benefits.length > 0 && (
            <div className="mm-vip-benefits">
              <h3>Quyền lợi được công bố</h3>
              {account.settings.benefits.map((benefit, i) => (
                <p key={i}>
                  <CheckCircle2 size={16} /> {benefit}
                </p>
              ))}
            </div>
          )}
          {account.settings.benefits.length === 0 && (
            <p className="mm-vip-muted">
              Chính sách ưu đãi chưa được Admin công bố; không có mức giảm giá hoặc điểm thưởng tự
              động.
            </p>
          )}
          {["STANDARD", "EXPIRED", "SUSPENDED"].includes(account.status) &&
            account.settings.acceptingRequests && (
              <div className="mm-vip-application-form">
                <label htmlFor="vip-note">Lời nhắn gửi Mộc Maria (không bắt buộc)</label>
                <textarea
                  id="vip-note"
                  rows={3}
                  maxLength={500}
                  placeholder="Ví dụ: Tôi thường xuyên sử dụng dịch vụ và mong được tham gia chương trình VIP..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <button
                  type="button"
                  className="mm-primary-cta"
                  disabled={sending}
                  onClick={() => void submit()}
                >
                  {sending ? "Đang gửi..." : "Gửi yêu cầu xét duyệt VIP"} <Send size={16} />
                </button>
              </div>
            )}
          {!account.settings.acceptingRequests &&
            account.status !== "VIP" &&
            account.status !== "PENDING" && (
              <p className="mm-vip-muted">Mộc Maria hiện tạm ngừng nhận đăng ký VIP.</p>
            )}
        </>
      ) : null}
      {error && (
        <div role="alert" className="mm-vip-error">
          {error}
          <button type="button" onClick={() => void load()}>
            Thử lại
          </button>
        </div>
      )}
      <p className="mm-vip-footnote">
        <ShieldCheck size={15} />
        VIP chỉ được kích hoạt sau khi Admin phê duyệt. Các quyền lợi phát sinh theo chính sách được
        công bố, không mặc định áp dụng cho mọi khách hàng.
      </p>
    </section>
  );
}
