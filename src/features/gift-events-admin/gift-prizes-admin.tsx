"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Gift, ImagePlus, Plus } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  mutationMessage,
  usePrivateData,
  usePrivateMutation,
} from "@/features/marketplace/private-api";
import type { GiftEvent } from "./event-admin";
import "./gift-prizes-admin.css";

type Kind =
  | "VOUCHER_FIXED"
  | "VOUCHER_PERCENT"
  | "GIFT_CARD"
  | "PHYSICAL_ITEM"
  | "TAKEAWAY_DRINK"
  | "CASH_COUNTER";
type Prize = {
  id: string;
  eventId: string;
  name: string;
  description: string;
  kind: Kind;
  config: Record<string, unknown>;
  weight: number;
  stockTotal: number;
  stockIssued: number;
  liabilityVnd: number;
  enabled: boolean;
  version: number;
  branchIds: string[];
};
type Branch = { id: string; name: string; isActive: boolean };
type PrizeForm = {
  kind: Kind;
  name: string;
  description: string;
  weight: string;
  stockTotal: string;
  enabled: boolean;
  validityDays: string;
  valueVnd: string;
  percent: string;
  maxDiscountVnd: string;
  minSpendVnd: string;
  sku: string;
  fairValueVnd: string;
  coverUrl: string;
  branchIds: string[];
  allowedServiceIds: string[];
};
const labels: Record<Kind, string> = {
  VOUCHER_FIXED: "Voucher giảm tiền",
  VOUCHER_PERCENT: "Voucher giảm %",
  GIFT_CARD: "Thẻ mệnh giá dùng một lần",
  PHYSICAL_ITEM: "Vật phẩm nhận tại quầy",
  TAKEAWAY_DRINK: "Đồ uống mang về",
  CASH_COUNTER: "Tiền mặt tại quầy (đang khóa)",
};
const fresh: PrizeForm = {
  kind: "VOUCHER_FIXED",
  name: "",
  description: "",
  weight: "10",
  stockTotal: "10",
  enabled: false,
  validityDays: "30",
  valueVnd: "50000",
  percent: "10",
  maxDiscountVnd: "50000",
  minSpendVnd: "0",
  sku: "",
  fairValueVnd: "0",
  coverUrl: "",
  branchIds: [],
  allowedServiceIds: [],
};
const get = (x: unknown, defaultValue: string) =>
  typeof x === "string" || typeof x === "number" ? String(x) : defaultValue;
function fromPrize(prize: Prize): PrizeForm {
  return {
    kind: prize.kind,
    name: prize.name,
    description: prize.description,
    weight: String(prize.weight),
    stockTotal: String(prize.stockTotal),
    enabled: prize.enabled,
    validityDays: get(prize.config.validityDays, "30"),
    valueVnd: get(prize.config.valueVnd, "50000"),
    percent: get(prize.config.percent, "10"),
    maxDiscountVnd: get(prize.config.maxDiscountVnd, "50000"),
    minSpendVnd: get(prize.config.minSpendVnd, "0"),
    sku: get(prize.config.sku, ""),
    fairValueVnd: get(prize.config.fairValueVnd, "0"),
    coverUrl: get(prize.config.coverUrl, ""),
    branchIds: prize.branchIds,
    allowedServiceIds: Array.isArray(prize.config.allowedServiceIds)
      ? prize.config.allowedServiceIds.filter((id): id is string => typeof id === "string")
      : [],
  };
}

export function GiftPrizesAdmin({ event }: { event: GiftEvent | null }) {
  const { authFetch } = useAuth();
  const prizes = usePrivateData<Prize[]>(
    event ? `/admin/gift-events/${event.id}/prizes` : "/admin/gift-events/none/prizes",
    !!event,
  );
  const branches = usePrivateData<Branch[]>("/admin/branches", !!event);
  const services = usePrivateData<Array<{ id: string; name: string; isPublished: boolean }>>(
    "/admin/services",
    !!event,
  );
  const saveMutation = usePrivateMutation<Prize>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PrizeForm>(fresh);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const selected = prizes.data?.find((p) => p.id === editingId) || null;
  const editable = !!event && ["DRAFT", "PAUSED"].includes(event.status);
  const set = <K extends keyof PrizeForm>(key: K, value: PrizeForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const reset = () => {
    setEditingId(null);
    setForm(fresh);
    setReason("");
    setNotice("");
  };
  const select = (p: Prize) => {
    setEditingId(p.id);
    setForm(fromPrize(p));
    setReason("");
  };
  const config = (): Record<string, unknown> => {
    const x: Record<string, unknown> = { validityDays: Number(form.validityDays) };
    if (form.coverUrl) x.coverUrl = form.coverUrl;
    if (["VOUCHER_FIXED", "GIFT_CARD", "CASH_COUNTER"].includes(form.kind))
      x.valueVnd = Number(form.valueVnd);
    if (form.kind === "VOUCHER_PERCENT") {
      x.percent = Number(form.percent);
      x.maxDiscountVnd = Number(form.maxDiscountVnd);
      x.allowedServiceIds = form.allowedServiceIds;
    }
    if (form.kind.startsWith("VOUCHER")) x.minSpendVnd = Number(form.minSpendVnd);
    if (["PHYSICAL_ITEM", "TAKEAWAY_DRINK"].includes(form.kind)) {
      x.sku = form.sku.trim();
      x.fairValueVnd = Number(form.fairValueVnd);
    }
    return x;
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!event || !editable || saveMutation.isPending) return;
    try {
      const common = {
        name: form.name.trim(),
        description: form.description.trim(),
        weight: Number(form.weight),
        stockTotal: Number(form.stockTotal),
        config: config(),
        enabled: form.kind === "CASH_COUNTER" ? false : form.enabled,
        branchIds: form.branchIds,
      };
      const result = await saveMutation.mutateAsync({
        path: selected
          ? `/admin/gift-events/${event.id}/prizes/${selected.id}`
          : `/admin/gift-events/${event.id}/prizes`,
        method: selected ? "PATCH" : "POST",
        body: selected
          ? { ...common, expectedVersion: selected.version, reason: reason.trim() }
          : { ...common, kind: form.kind },
      });
      setEditingId(result.id);
      setForm(fromPrize(result));
      setReason("");
      setNotice("Đã lưu phần thưởng và ghi nhật ký.");
      await prizes.refetch();
    } catch {
      /* giữ biểu mẫu để thử lại */
    }
  }
  async function upload(file: File) {
    if (!event || !editable) return;
    setUploading(true);
    setUploadError("");
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await authFetch<{ url: string }>(`/admin/gift-events/${event.id}/prize-media`, {
        method: "POST",
        body,
        cache: "no-store",
      });
      set("coverUrl", res.url);
    } catch {
      setUploadError("Không thể upload/crop ảnh. Kiểm tra cấu hình CDN rồi thử lại.");
    } finally {
      setUploading(false);
    }
  }
  if (!event)
    return (
      <div className="mm-gp-empty">
        <Gift size={27} />
        <h4>Hãy tạo bản nháp trước</h4>
        <p>Sau khi lưu sự kiện, bạn có thể thêm giải, trọng số và kho quà.</p>
      </div>
    );
  return (
    <section className="mm-gp">
      <header>
        <div>
          <span>KHO QUÀ · P06</span>
          <h4>Quà tặng & cơ cấu nhận quà</h4>
        </div>
        <button type="button" onClick={reset} disabled={!editable}>
          <Plus size={16} /> Thêm quà
        </button>
      </header>
      <p>
        Trọng số quyết định xác suất trên máy chủ; cả sáu hộp sử dụng cùng cơ cấu. Quà đã trao giữ
        nguyên snapshot.
      </p>
      {prizes.isError && (
        <p role="alert" className="mm-gp-error">
          Không tải được kho quà. API đang tắt hoặc cần áp dụng migration.
        </p>
      )}
      {prizes.isPending && <p>Đang tải danh sách phần thưởng…</p>}
      <div className="mm-gp-list">
        {prizes.data?.map((p) => (
          <button
            type="button"
            key={p.id}
            className={p.id === editingId ? "selected" : ""}
            onClick={() => select(p)}
          >
            <Gift size={22} />
            <span>
              <strong>{p.name}</strong>
              <small>
                {labels[p.kind]} · Tồn {p.stockTotal - p.stockIssued}/{p.stockTotal} · Trọng số{" "}
                {p.weight}
              </small>
            </span>
            <b>{p.enabled ? "Đã bật" : "Tắt"}</b>
          </button>
        ))}
      </div>
      {notice && (
        <p role="status" className="mm-gp-notice">
          <CheckCircle2 size={16} />
          {notice}
        </p>
      )}
      {editable ? (
        <form onSubmit={(e) => void submit(e)}>
          <h5>{selected ? "Chỉnh phần thưởng" : "Tạo phần thưởng"}</h5>
          <div className="mm-gp-grid">
            <label>
              Loại quà
              <select
                disabled={!!selected}
                value={form.kind}
                onChange={(e) => set("kind", e.target.value as Kind)}
              >
                {Object.entries(labels).map(([kind, label]) => (
                  <option key={kind} value={kind}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tên quà
              <input
                required
                minLength={3}
                maxLength={160}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Voucher massage thảo mộc"
              />
            </label>
            <label>
              Số lượng quà
              <input
                required
                type="number"
                min={selected?.stockIssued || 0}
                max={1000000}
                value={form.stockTotal}
                onChange={(e) => set("stockTotal", e.target.value)}
              />
            </label>
            <label>
              Trọng số (không phải % cố định)
              <input
                required
                type="number"
                min={1}
                max={100000}
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
              />
            </label>
            {["VOUCHER_FIXED", "GIFT_CARD", "CASH_COUNTER"].includes(form.kind) && (
              <label>
                Giá trị (VND)
                <input
                  required
                  type="number"
                  min={1000}
                  value={form.valueVnd}
                  onChange={(e) => set("valueVnd", e.target.value)}
                />
              </label>
            )}
            {form.kind === "VOUCHER_PERCENT" && (
              <>
                <label>
                  Tỷ lệ giảm (%)
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={form.percent}
                    onChange={(e) => set("percent", e.target.value)}
                  />
                </label>
                <label>
                  Giảm tối đa (VND)
                  <input
                    required
                    type="number"
                    min={1000}
                    value={form.maxDiscountVnd}
                    onChange={(e) => set("maxDiscountVnd", e.target.value)}
                  />
                </label>
                <fieldset className="wide">
                  <legend>Áp dụng cho các dịch vụ và đồ uống có trong catalog</legend>
                  <p>Chỉ những sản phẩm được tích chọn mới được tính ưu đãi tại quầy.</p>
                  {services.data
                    ?.filter((item) => item.isPublished)
                    .map((item) => (
                      <label className="mm-gp-check" key={item.id}>
                        <input
                          type="checkbox"
                          checked={form.allowedServiceIds.includes(item.id)}
                          onChange={(e) =>
                            set(
                              "allowedServiceIds",
                              e.target.checked
                                ? [...form.allowedServiceIds, item.id]
                                : form.allowedServiceIds.filter((id) => id !== item.id),
                            )
                          }
                        />
                        {item.name}
                      </label>
                    ))}
                  {!services.data?.length && <p>Chưa có catalog dịch vụ để áp dụng tự động.</p>}
                </fieldset>
              </>
            )}
            {form.kind.startsWith("VOUCHER") && (
              <label>
                Đơn tối thiểu (VND)
                <input
                  type="number"
                  min={0}
                  value={form.minSpendVnd}
                  onChange={(e) => set("minSpendVnd", e.target.value)}
                />
              </label>
            )}
            {["PHYSICAL_ITEM", "TAKEAWAY_DRINK"].includes(form.kind) && (
              <>
                <label>
                  Mã SKU
                  <input
                    minLength={2}
                    required
                    value={form.sku}
                    onChange={(e) => set("sku", e.target.value)}
                  />
                </label>
                <label>
                  Giá trị nội bộ (VND)
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.fairValueVnd}
                    onChange={(e) => set("fairValueVnd", e.target.value)}
                  />
                </label>
              </>
            )}
            <label>
              Hạn quà (ngày)
              <input
                required
                type="number"
                min={1}
                max={365}
                value={form.validityDays}
                onChange={(e) => set("validityDays", e.target.value)}
              />
            </label>
            <label className="wide">
              Mô tả/điều kiện quà
              <textarea
                rows={3}
                maxLength={1200}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>
            <fieldset className="wide">
              <legend>Địa điểm nhận quà</legend>
              {!branches.data?.length && (
                <p>Chưa có chi nhánh. Cần cấu hình cơ sở trước khi thêm giải.</p>
              )}
              {branches.data
                ?.filter((b) => b.isActive)
                .map((b) => (
                  <label className="mm-gp-check" key={b.id}>
                    <input
                      type="checkbox"
                      checked={form.branchIds.includes(b.id)}
                      onChange={(e) =>
                        set(
                          "branchIds",
                          e.target.checked
                            ? [...form.branchIds, b.id]
                            : form.branchIds.filter((id) => id !== b.id),
                        )
                      }
                    />
                    {b.name}
                  </label>
                ))}
            </fieldset>
            <label className="wide">
              Ảnh quà – tự crop 800px và chuyển WebP lên CDN
              <span className="mm-gp-upload">
                <ImagePlus size={16} />
                <input
                  type="file"
                  disabled={uploading}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                  }}
                />
                {uploading ? "Đang tối ưu ảnh…" : "Chọn ảnh"}
              </span>
            </label>
            {form.coverUrl && <small className="wide mm-gp-url">CDN: {form.coverUrl}</small>}
            {uploadError && (
              <p role="alert" className="wide mm-gp-error">
                {uploadError}
              </p>
            )}
            {form.kind === "CASH_COUNTER" && (
              <p className="wide mm-gp-cash">
                Quà tiền mặt chưa thể bật. Chờ duyệt thủ tục pháp lý, kế toán và chứng từ.
              </p>
            )}
            <label className="wide mm-gp-check">
              <input
                type="checkbox"
                checked={form.enabled}
                disabled={form.kind === "CASH_COUNTER"}
                onChange={(e) => set("enabled", e.target.checked)}
              />{" "}
              Bật giải khi chiến dịch đủ điều kiện
            </label>
            {selected && (
              <label className="wide">
                Lý do cập nhật (10–500 ký tự)
                <input
                  required
                  minLength={10}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            )}
          </div>
          <button
            className="mm-gp-save"
            type="submit"
            disabled={
              saveMutation.isPending ||
              !form.name.trim() ||
              !form.branchIds.length ||
              (!!selected && reason.trim().length < 10)
            }
          >
            {saveMutation.isPending
              ? "Đang lưu…"
              : selected
                ? "Lưu cập nhật và nhật ký"
                : "Thêm phần thưởng"}
          </button>
          {saveMutation.isError && (
            <p role="alert" className="mm-gp-error">
              {mutationMessage(saveMutation.error)}
            </p>
          )}
        </form>
      ) : (
        <p>
          Chỉ được sửa kho quà ở trạng thái NHÁP hoặc TẠM DỪNG. Không hồi tố quyền lợi quà đã phát.
        </p>
      )}
    </section>
  );
}
