"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  MessageSquareText,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { usePrivateData, usePrivateMutation, mutationMessage } from "./private-api";
import "./reviews-admin.css";

export type ModerationStatus = "PENDING" | "PUBLISHED" | "HIDDEN";
export type ModerationReview = {
  id: string;
  provider_application_id: string;
  provider_name: string;
  service_name: string;
  stars: number;
  comment: string;
  visibility: "PUBLISHED" | "HIDDEN";
  moderation_status: ModerationStatus;
  version: number;
  created_at: string;
  updated_at: string;
};
type ReviewList = {
  items: ModerationReview[];
  page: number;
  total: number;
  pending: number;
  hasMore: boolean;
};
type ReviewPolicy = { vipOnly: boolean; version: number };

function ReviewPolicySettings() {
  const policy = usePrivateData<ReviewPolicy>("/admin/provider-reviews/policy");
  const update = usePrivateMutation<ReviewPolicy>();
  const [wanted, setWanted] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const [success, setSuccess] = useState("");
  const value = policy.data?.vipOnly;

  async function save() {
    if (!policy.data || wanted === null || wanted === value || reason.trim().length < 10) return;
    try {
      await update.mutateAsync({
        path: "/admin/provider-reviews/policy",
        method: "PATCH",
        body: { vipOnly: wanted, expectedVersion: policy.data.version, reason: reason.trim() },
      });
      setWanted(null);
      setReason("");
      setSuccess(
        wanted
          ? "Đã bật: chỉ hội viên VIP đủ điều kiện được gửi đánh giá."
          : "Đã mở quyền đánh giá cho mọi khách có lịch hẹn hoàn thành.",
      );
      await policy.refetch();
    } catch {
      // Keep the draft and error visible so admins can reload on a version conflict.
    }
  }

  return (
    <section className="mm-reviews-policy" aria-label="Cài đặt quyền đánh giá KTV">
      <div className="mm-reviews-policy-heading">
        <span className="mm-reviews-policy-icon">
          <Crown size={21} />
        </span>
        <div>
          <h3>Ai được đánh giá KTV?</h3>
          <p>Khách phải có lịch hẹn đã hoàn thành. Mọi nhận xét vẫn phải được Admin duyệt.</p>
        </div>
      </div>
      {policy.isPending ? (
        <p role="status">Đang tải cấu hình...</p>
      ) : policy.isError || !policy.data ? (
        <p role="alert">
          Chưa tải được cấu hình.{" "}
          <button type="button" onClick={() => void policy.refetch()}>
            Thử lại
          </button>
        </p>
      ) : (
        <>
          <div
            className="mm-reviews-policy-options"
            role="group"
            aria-label="Chế độ cho phép đánh giá"
          >
            <button
              type="button"
              className={(wanted ?? value) === false ? "active" : ""}
              aria-pressed={(wanted ?? value) === false}
              disabled={update.isPending}
              onClick={() => {
                setWanted(false);
                setSuccess("");
              }}
            >
              Mọi khách đã dùng dịch vụ
            </button>
            <button
              type="button"
              className={(wanted ?? value) === true ? "active vip" : ""}
              aria-pressed={(wanted ?? value) === true}
              disabled={update.isPending}
              onClick={() => {
                setWanted(true);
                setSuccess("");
              }}
            >
              <Crown size={16} /> Chỉ hội viên VIP
            </button>
          </div>
          {(wanted ?? value) && (
            <p className="mm-reviews-policy-hint">
              VIP phải còn hiệu lực tại thời điểm gửi hoặc sửa đánh giá; khách thường không thể vượt
              qua bằng cách gọi API trực tiếp.
            </p>
          )}
          {wanted !== null && wanted !== value && (
            <div className="mm-reviews-policy-confirm">
              <label htmlFor="mm-review-policy-reason">Lý do thay đổi (tối thiểu 10 ký tự)</label>
              <textarea
                id="mm-review-policy-reason"
                rows={2}
                maxLength={500}
                value={reason}
                disabled={update.isPending}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Giải thích vì sao bạn muốn thay đổi quyền đánh giá..."
              />
              <div>
                <button
                  type="button"
                  disabled={update.isPending}
                  onClick={() => {
                    setWanted(null);
                    setReason("");
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="mm-review-approve"
                  disabled={update.isPending || reason.trim().length < 10}
                  onClick={() => void save()}
                >
                  {update.isPending ? "Đang lưu..." : "Xác nhận lưu chế độ"}
                </button>
              </div>
            </div>
          )}
          {update.isError && (
            <p role="alert" className="mm-reviews-error">
              {mutationMessage(update.error)}{" "}
              <button type="button" onClick={() => void policy.refetch()}>
                Tải lại
              </button>
            </p>
          )}
          {success && (
            <p role="status" className="mm-reviews-success">
              <Check size={16} />
              {success}
            </p>
          )}
        </>
      )}
    </section>
  );
}
type Filter = "ALL" | ModerationStatus;
const filters: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "PUBLISHED", label: "Đã duyệt" },
  { value: "HIDDEN", label: "Đã ẩn" },
];
export const moderationLabels: Record<ModerationStatus, string> = {
  PENDING: "Chờ duyệt",
  PUBLISHED: "Đã công khai",
  HIDDEN: "Đã ẩn",
};

export function ProviderReviewsAdmin() {
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ModerationReview | null>(null);
  const [decision, setDecision] = useState<"PUBLISHED" | "HIDDEN">("PUBLISHED");
  const [reason, setReason] = useState("");
  const [success, setSuccess] = useState("");
  const endpoint = "/admin/provider-reviews?status=" + filter + "&page=" + page;
  const list = usePrivateData<ReviewList>(endpoint);
  const change = usePrivateMutation();

  function choose(item: ModerationReview, visibility: "PUBLISHED" | "HIDDEN") {
    setSelected(item);
    setDecision(visibility);
    setReason("");
    setSuccess("");
    change.reset();
  }
  async function submit() {
    if (!selected || reason.trim().length < 10 || change.isPending) return;
    try {
      await change.mutateAsync({
        path: "/admin/provider-reviews/" + encodeURIComponent(selected.id) + "/visibility",
        method: "PATCH",
        body: { visibility: decision, expectedVersion: selected.version, reason: reason.trim() },
      });
      setSuccess(
        decision === "PUBLISHED"
          ? "Đã duyệt. Đánh giá sẽ được hiển thị công khai."
          : "Đã ẩn đánh giá khỏi website.",
      );
      setSelected(null);
      await list.refetch();
    } catch {
      // The mutation exposes the error inline without closing the dialog.
    }
  }

  return (
    <div className="mm-reviews-admin">
      <div className="mm-reviews-admin-intro">
        <div className="mm-reviews-admin-icon">
          <ShieldCheck size={23} />
        </div>
        <div>
          <span className="mm-reviews-eyebrow">KIỂM DUYỆT NỘI DUNG</span>
          <h2>Đánh giá & nhận xét KTV</h2>
          <p>
            Khách hàng chấm 1–5 sao sau khi hoàn tất lịch hẹn. Chỉ đánh giá bạn duyệt mới được hiển
            thị trên website.
          </p>
        </div>
      </div>
      <ReviewPolicySettings />
      <div className="mm-reviews-admin-stat">
        <span>
          <Clock3 size={18} /> Cần xét duyệt
        </span>
        <strong>{list.data?.pending ?? "—"}</strong>
      </div>
      <div className="mm-reviews-admin-filters" role="group" aria-label="Lọc đánh giá">
        {filters.map((item) => (
          <button
            type="button"
            key={item.value}
            aria-pressed={filter === item.value}
            className={filter === item.value ? "active" : ""}
            onClick={() => {
              setFilter(item.value);
              setPage(1);
              setSelected(null);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {success && (
        <p className="mm-reviews-success" role="status">
          <Check size={18} /> {success}
        </p>
      )}
      {list.isPending ? (
        <div className="mm-reviews-admin-empty" role="status">
          Đang tải danh sách đánh giá...
        </div>
      ) : list.isError || !list.data ? (
        <div className="mm-reviews-admin-empty" role="alert">
          Không tải được danh sách. <button onClick={() => void list.refetch()}>Thử lại</button>
        </div>
      ) : !list.data.items.length ? (
        <div className="mm-reviews-admin-empty">
          <MessageSquareText size={29} />
          <strong>
            {filter === "PENDING"
              ? "Không có nhận xét đang chờ"
              : "Chưa có đánh giá trong nhóm này"}
          </strong>
          <p>Đánh giá mới từ lịch hẹn đã hoàn thành sẽ xuất hiện ở đây để Admin xét duyệt.</p>
        </div>
      ) : (
        <div className="mm-reviews-admin-list">
          {list.data.items.map((item) => (
            <article className="mm-reviews-admin-card" key={item.id}>
              <div className="mm-reviews-admin-card-head">
                <div>
                  <span className="mm-reviews-eyebrow">ĐÁNH GIÁ KỸ THUẬT VIÊN</span>
                  <h3>{item.provider_name}</h3>
                  <small>
                    {item.service_name} · {new Date(item.created_at).toLocaleDateString("vi-VN")}
                  </small>
                </div>
                <span
                  className={"mm-reviews-admin-status is-" + item.moderation_status.toLowerCase()}
                >
                  {moderationLabels[item.moderation_status]}
                </span>
              </div>
              <div className="mm-reviews-admin-stars" aria-label={item.stars + " trên 5 sao"}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={17} fill={i < item.stars ? "currentColor" : "none"} />
                ))}
                <strong>{item.stars}/5</strong>
              </div>
              <p className="mm-reviews-admin-comment">{item.comment}</p>
              <div className="mm-reviews-admin-card-actions">
                <Link href={"/chuyen-vien/" + encodeURIComponent(item.provider_application_id)}>
                  Xem hồ sơ KTV
                </Link>
                {item.moderation_status !== "PUBLISHED" && (
                  <button className="mm-review-approve" onClick={() => choose(item, "PUBLISHED")}>
                    <Check size={16} /> Duyệt đăng
                  </button>
                )}
                {item.moderation_status !== "HIDDEN" && (
                  <button className="mm-review-reject" onClick={() => choose(item, "HIDDEN")}>
                    <X size={16} />{" "}
                    {item.moderation_status === "PUBLISHED" ? "Ẩn đánh giá" : "Từ chối"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {list.data && (page > 1 || list.data.hasMore) && (
        <nav className="mm-reviews-pagination" aria-label="Phân trang đánh giá">
          <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            <ChevronLeft size={16} /> Trang trước
          </button>
          <span>Trang {page}</span>
          <button disabled={!list.data.hasMore} onClick={() => setPage((value) => value + 1)}>
            Trang sau <ChevronRight size={16} />
          </button>
        </nav>
      )}
      {selected && (
        <div className="mm-reviews-modal-overlay" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mm-review-moderation-title"
            className="mm-reviews-modal"
          >
            <h3 id="mm-review-moderation-title">
              {decision === "PUBLISHED" ? "Duyệt đánh giá" : "Ẩn / từ chối đánh giá"}
            </h3>
            <p>
              <strong>{selected.provider_name}</strong> · {selected.stars}/5 sao
            </p>
            <blockquote>{selected.comment}</blockquote>
            <label htmlFor="mm-moderation-reason">Lý do xử lý (ít nhất 10 ký tự)</label>
            <textarea
              id="mm-moderation-reason"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                decision === "PUBLISHED"
                  ? "Đã kiểm tra nội dung, đúng quy định công khai..."
                  : "Nội dung chưa phù hợp với quy định đăng tải..."
              }
            />
            {change.isError && (
              <p role="alert" className="mm-reviews-error">
                {mutationMessage(change.error)}
              </p>
            )}
            <div className="mm-reviews-modal-actions">
              <button type="button" disabled={change.isPending} onClick={() => setSelected(null)}>
                Hủy
              </button>
              <button
                type="button"
                disabled={change.isPending || reason.trim().length < 10}
                className="mm-review-approve"
                onClick={() => void submit()}
              >
                {change.isPending ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
