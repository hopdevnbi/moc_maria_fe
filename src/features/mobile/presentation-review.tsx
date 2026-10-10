"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Presentation } from "./profile-editor";
export function PresentationReview() {
  const { user, authFetch } = useAuth();
  const [items, setItems] = useState<Presentation[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const allowed = user?.roles.includes("SUPER_ADMIN");
  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      setItems(
        await authFetch<Presentation[]>("/admin/provider-presentation", { cache: "no-store" }),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Chưa tải được danh sách.");
    } finally {
      setLoading(false);
    }
  }, [allowed, authFetch]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);
  async function review(e: FormEvent<HTMLFormElement>, item: Presentation) {
    e.preventDefault();
    if (busy || !item.revision) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setNotice("");
    try {
      await authFetch("/admin/provider-presentation/" + item.providerId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revisionId: item.revision.id,
          decision: f.get("decision"),
          note: String(f.get("note") || "").trim(),
        }),
      });
      setNotice("Đã xử lý bản mô tả.");
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Chưa duyệt được. Hãy tải lại.");
    } finally {
      setBusy(false);
    }
  }
  if (!allowed) return <p role="alert">Chỉ super admin được phê duyệt nội dung công khai.</p>;
  return (
    <section className="mm-description-editor">
      <button className="mm-outline-cta" onClick={() => void load()} disabled={loading}>
        Tải lại danh sách
      </button>
      {notice && <p role="status">{notice}</p>}
      {loading ? (
        <p>Đang tải bản gửi duyệt...</p>
      ) : !items.length ? (
        <p>Không có mô tả đang chờ duyệt.</p>
      ) : (
        items.map((item) => (
          <article className="mm-account-profile" key={item.providerId}>
            <h2>{item.publicName}</h2>
            <h3>Nội dung đang công khai</h3>
            <p className="mm-preserve-lines">
              {item.published?.introduction || item.introduction || "Chưa có mô tả"}
            </p>
            <h3>Nội dung mới gửi duyệt</h3>
            <p className="mm-preserve-lines">{item.revision?.introduction}</p>
            <form onSubmit={(e) => void review(e, item)}>
              <label>
                Quyết định
                <select name="decision">
                  <option value="APPROVED">Phê duyệt và công bố mô tả</option>
                  <option value="REJECTED">Yêu cầu KTV chỉnh sửa</option>
                </select>
              </label>
              <label>
                Góp ý / ghi chú
                <textarea name="note" required maxLength={500} rows={3} />
              </label>
              <button className="mm-primary-cta" disabled={busy}>
                {busy ? "Đang xử lý..." : "Lưu quyết định"}
              </button>
            </form>
          </article>
        ))
      )}
    </section>
  );
}
