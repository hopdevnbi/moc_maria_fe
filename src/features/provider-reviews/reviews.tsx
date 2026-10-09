"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, BadgeCheck, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { resolveApiBaseUrl } from "@/shared/config/environment";
import "./reviews.css";

type Summary = { average: number | null; count: number; distribution?: Record<string, number> };
type PublicReview = {
  id: string;
  stars: number;
  comment: string;
  author_label: string;
  service_name: string;
  created_at: string;
};
type ReviewPage = { summary: Summary; items: PublicReview[]; hasMore: boolean };
type Eligible = {
  appointment_id: string;
  provider_application_id: string;
  provider_name: string;
  service_name: string;
  completed_at: string;
  review_id: string | null;
  stars: number | null;
  comment: string | null;
  visibility: string | null;
  version: number | null;
  editable_until: string | null;
};
async function read<T>(path: string): Promise<T> {
  const response = await fetch(resolveApiBaseUrl() + path, {
    cache: "no-store",
    credentials: "omit",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Chưa tải được đánh giá.");
  return response.json() as Promise<T>;
}
export function ProviderRating({ providerId, isDemo }: { providerId: string; isDemo?: boolean }) {
  const ratings = useQuery({
    queryKey: ["public-provider-ratings"],
    queryFn: () => read<Record<string, Summary>>("/provider-reviews/public/ratings"),
    enabled: !isDemo,
    staleTime: 60000,
  });
  if (isDemo) return null;
  const rating = ratings.data?.[providerId];
  return (
    <span className="mm-provider-rating">
      <Star size={15} aria-hidden="true" />
      {ratings.isPending
        ? "Đang tải đánh giá..."
        : ratings.isError
          ? "Chưa tải được đánh giá"
          : rating?.count
            ? `${rating.average}/5 · ${rating.count} đánh giá`
            : "Chưa có đánh giá"}
    </span>
  );
}
function ReviewForm({ item, onDone }: { item: Eligible; onDone: () => void }) {
  const { authFetch, user } = useAuth();
  const client = useQueryClient();
  const [stars, setStars] = useState(item.stars ?? 0);
  const [comment, setComment] = useState(item.comment ?? "");
  const save = useMutation({
    mutationFn: () =>
      authFetch(item.review_id ? `/provider-reviews/${item.review_id}` : "/provider-reviews", {
        method: item.review_id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stars,
          comment: comment.trim(),
          ...(item.review_id
            ? { expectedVersion: item.version }
            : {
                appointmentId: item.appointment_id,
                providerApplicationId: item.provider_application_id,
              }),
        }),
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["my-provider-reviews", user?.id] }),
        client.invalidateQueries({
          queryKey: ["public-provider-reviews", item.provider_application_id],
        }),
        client.invalidateQueries({ queryKey: ["public-provider-ratings"] }),
      ]);
      onDone();
    },
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (stars && comment.trim()) save.mutate();
      }}
    >
      <p>
        <strong>{item.provider_name}</strong>
        <br />
        {item.service_name} · {new Date(item.completed_at).toLocaleDateString("vi-VN")}
      </p>
      <fieldset disabled={save.isPending}>
        <legend>Chất lượng dịch vụ</legend>
        <div className="mm-review-stars">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="stars"
                value={value}
                checked={stars === value}
                onChange={() => setStars(value)}
                required
              />
              <Star size={28} fill={value <= stars ? "currentColor" : "none"} />
              <span>{value} sao</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mm-review-comment">
        Nhận xét của bạn
        <textarea
          required
          maxLength={2000}
          rows={5}
          value={comment}
          disabled={save.isPending}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Bạn hài lòng điều gì? KTV có thể cải thiện điều gì?"
        />
      </label>
      <small>
        Nhận xét được công khai dưới tên “Khách đã sử dụng dịch vụ”. Không đưa số điện thoại, địa
        chỉ hoặc thông tin riêng tư vào nhận xét. Bạn có thể sửa trong 7 ngày kể từ lần gửi đầu
        tiên.
      </small>
      {save.isError && (
        <p role="alert">
          {save.error instanceof Error &&
          /đánh giá|lịch hẹn|Thời hạn|tải lại/i.test(save.error.message)
            ? save.error.message
            : "Chưa gửi được đánh giá. Vui lòng thử lại."}
        </p>
      )}
      <button className="mm-review-button" disabled={!stars || !comment.trim() || save.isPending}>
        {save.isPending ? "Đang gửi..." : item.review_id ? "Lưu thay đổi" : "Gửi đánh giá"}
      </button>
    </form>
  );
}
export function MyReviewRequests({ providerId }: { providerId: string }) {
  const { user, status, authFetch } = useAuth();
  const [selected, setSelected] = useState<Eligible | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const customer = !!user?.permissions.includes("customer.portal");
  const eligible = useQuery({
    queryKey: ["my-provider-reviews", user?.id, providerId],
    queryFn: () =>
      authFetch<Eligible[]>(
        `/provider-reviews/me/eligible?providerApplicationId=${encodeURIComponent(providerId)}`,
        { cache: "no-store" },
      ),
    enabled: status === "authenticated" && customer,
  });
  if (status === "loading") return <p>Đang kiểm tra lịch dịch vụ...</p>;
  if (status !== "authenticated")
    return (
      <p>
        <Link href={"/dang-nhap?next=" + encodeURIComponent("/chuyen-vien/" + providerId)}>
          Đăng nhập
        </Link>{" "}
        để đánh giá dịch vụ bạn đã sử dụng.
      </p>
    );
  if (!customer) return null;
  return (
    <div className="mm-my-reviews">
      {eligible.isError ? (
        <p role="alert">
          Chưa tải được dịch vụ của bạn.{" "}
          <button onClick={() => void eligible.refetch()}>Thử lại</button>
        </p>
      ) : eligible.isPending ? (
        <p>Đang kiểm tra lịch dịch vụ...</p>
      ) : eligible.data?.length ? (
        eligible.data.map((item) => {
          const editable =
            !item.review_id ||
            (item.visibility === "PUBLISHED" &&
              !!item.editable_until &&
              new Date(item.editable_until).getTime() > eligible.dataUpdatedAt);
          return (
            <div
              className="mm-review-request"
              key={item.appointment_id + item.provider_application_id}
            >
              <div>
                <strong>{item.service_name}</strong>
                <small>
                  Hoàn thành {new Date(item.completed_at).toLocaleDateString("vi-VN")}
                  {item.review_id ? ` · Đã đánh giá ${item.stars}/5` : ""}
                </small>
              </div>
              {editable ? (
                <button
                  className="mm-review-button"
                  onClick={() => {
                    setSelected(item);
                    dialog.current?.showModal();
                  }}
                >
                  {item.review_id ? "Sửa đánh giá" : "Viết đánh giá"}
                </button>
              ) : (
                <small>{item.visibility === "HIDDEN" ? "Đang kiểm duyệt" : "Đã hết hạn sửa"}</small>
              )}
            </div>
          );
        })
      ) : (
        <p>Bạn có thể viết đánh giá sau khi hoàn thành dịch vụ với KTV này.</p>
      )}
      <dialog
        ref={dialog}
        className="mm-review-modal"
        aria-label="Đánh giá dịch vụ"
        onClose={() => setSelected(null)}
      >
        <header>
          <h3>{selected?.review_id ? "Sửa đánh giá" : "Đánh giá dịch vụ"}</h3>
          <button aria-label="Đóng đánh giá" onClick={() => dialog.current?.close()}>
            <X size={20} />
          </button>
        </header>
        {selected && (
          <ReviewForm
            key={selected.appointment_id + selected.provider_application_id}
            item={selected}
            onDone={() => dialog.current?.close()}
          />
        )}
      </dialog>
    </div>
  );
}
export function ProviderReviews({ providerId }: { providerId: string }) {
  const [page, setPage] = useState(1);
  const reviews = useQuery({
    queryKey: ["public-provider-reviews", providerId, page],
    queryFn: () =>
      read<ReviewPage>(`/providers/${encodeURIComponent(providerId)}/reviews?page=${page}`),
    staleTime: 30000,
  });
  return (
    <section
      className="mm-detail-section mm-provider-reviews"
      aria-label="Đánh giá chất lượng dịch vụ"
    >
      <h2>Khách hàng nói gì?</h2>
      <p className="mm-review-verified">
        <BadgeCheck size={17} /> Đánh giá từ các lượt dịch vụ đã hoàn thành
      </p>
      {reviews.isPending ? (
        <p>Đang tải đánh giá...</p>
      ) : reviews.isError ? (
        <p role="alert">
          Chưa tải được đánh giá. <button onClick={() => void reviews.refetch()}>Thử lại</button>
        </p>
      ) : (
        <>
          <div className="mm-review-summary">
            <strong>
              {reviews.data.summary.average ?? "—"}
              <small>/5</small>
            </strong>
            <span>
              {reviews.data.summary.count
                ? `${reviews.data.summary.count} đánh giá xác thực`
                : "Chưa có đánh giá"}
            </span>
          </div>
          {reviews.data.items.map((item) => (
            <article className="mm-review-card" key={item.id}>
              <div>
                <strong>{item.author_label}</strong>
                <span aria-label={`${item.stars} trên 5 sao`}>
                  {"★".repeat(item.stars)}
                  {"☆".repeat(5 - item.stars)}
                </span>
              </div>
              <small>
                {item.service_name} · {new Date(item.created_at).toLocaleDateString("vi-VN")}
              </small>
              <p>{item.comment}</p>
            </article>
          ))}
          {(page > 1 || reviews.data.hasMore) && (
            <nav aria-label="Trang đánh giá">
              <button disabled={page === 1} onClick={() => setPage((old) => old - 1)}>
                Trang trước
              </button>
              <span>Trang {page}</span>
              <button disabled={!reviews.data.hasMore} onClick={() => setPage((old) => old + 1)}>
                Trang sau
              </button>
            </nav>
          )}
        </>
      )}
      <MyReviewRequests providerId={providerId} />
    </section>
  );
}
