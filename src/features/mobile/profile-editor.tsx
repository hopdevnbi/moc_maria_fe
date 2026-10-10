"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";

export type Presentation = {
  providerId: string;
  publicName: string;
  introduction: string | null;
  published?: { introduction: string; approvedAt: string };
  revision?: {
    id: string;
    introduction: string;
    status: string;
    submittedAt: string;
    note?: string;
  };
};
const statusLabels: Record<string, string> = {
  PENDING: "Đang chờ super admin duyệt",
  APPROVED: "Đã được phê duyệt",
  REJECTED: "Cần chỉnh sửa theo góp ý",
};

export function ProviderDescriptionEditor() {
  const { user, authFetch } = useAuth();
  const [data, setData] = useState<Presentation | null>(null);
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const technician = user?.roles.some((r) => r === "THERAPIST" || r === "DOCTOR_CONSULTANT");
  useEffect(() => {
    let active = true;
    if (!user || !technician) return;
    authFetch<Presentation>("/provider-presentation/me", { cache: "no-store" })
      .then((value) => {
        if (active) {
          setData(value);
          setDescription(
            value.revision?.introduction ||
              value.published?.introduction ||
              value.introduction ||
              "",
          );
        }
      })
      .catch(() => {
        if (active) setNotice("Chưa tải được mô tả. Hãy tải lại trang.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, authFetch, technician]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const value = await authFetch<Presentation>("/provider-presentation/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ introduction: description.trim() }),
      });
      setData(value);
      setNotice("Đã gửi mô tả mới. Super admin sẽ xem xét trước khi công bố.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Chưa gửi được mô tả.");
    } finally {
      setBusy(false);
    }
  }
  if (!technician) return null;
  return (
    <section className="mm-account-profile mm-description-editor" id="mo-ta-ktv">
      <h2>Giới thiệu của bạn</h2>
      <p>Viết về phong cách chăm sóc, kinh nghiệm và dịch vụ bạn chú trọng để khách dễ lựa chọn.</p>
      {data?.revision && (
        <p className="mm-account-notice">
          {statusLabels[data.revision.status] || data.revision.status}
          {data.revision.note && <> · {data.revision.note}</>}
        </p>
      )}
      {data?.published && (
        <details>
          <summary>Mô tả đang công khai</summary>
          <p className="mm-preserve-lines">{data.published.introduction}</p>
        </details>
      )}
      {loading ? (
        <p role="status">Đang tải mô tả...</p>
      ) : (
        data && (
          <form onSubmit={submit}>
            <label htmlFor="provider-introduction">Mô tả gửi duyệt</label>
            <textarea
              id="provider-introduction"
              required
              minLength={30}
              maxLength={2000}
              rows={7}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Giới thiệu kinh nghiệm, thế mạnh và cách bạn chăm sóc khách hàng..."
            />
            <small>
              {description.length}/2.000 ký tự · Nội dung mới chỉ hiển thị sau khi super admin
              duyệt.
            </small>
            <button className="mm-primary-cta" disabled={busy || description.trim().length < 30}>
              {busy ? "Đang gửi..." : "Gửi mô tả để duyệt"}
            </button>
          </form>
        )
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
export function CustomerProfileEditor() {
  const { user, authFetch, refresh } = useAuth();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setNotice("");
    try {
      await authFetch("/customers/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: String(f.get("displayName") || "").trim(),
          phone: String(f.get("phone") || "").trim() || null,
        }),
      });
      await refresh();
      setNotice("Đã cập nhật thông tin của bạn.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Chưa lưu được thông tin.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="mm-profile-edit" onSubmit={submit}>
      <label>
        Họ và tên
        <input
          name="displayName"
          required
          minLength={2}
          maxLength={160}
          autoComplete="name"
          defaultValue={user?.displayName}
        />
      </label>
      <label>
        Số điện thoại
        <input
          name="phone"
          type="tel"
          maxLength={32}
          autoComplete="tel"
          defaultValue={user?.phone || ""}
        />
      </label>
      <button className="mm-primary-cta" disabled={busy}>
        {busy ? "Đang lưu..." : "Lưu thông tin"}
      </button>
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}
