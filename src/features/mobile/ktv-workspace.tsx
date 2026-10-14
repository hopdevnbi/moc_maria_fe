"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  LogOut,
  RefreshCw,
  Search,
  MapPin,
  Clock3,
  ArrowUpRight,
  UserRound,
  KeyRound,
  GraduationCap,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { OwnProviderPlanning } from "@/features/marketplace/provider-planning";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";
import { ProviderDescriptionEditor } from "./profile-editor";
import type { Inquiry } from "./inquiries";
import { officialServiceLabel } from "./official-ktv-offers";
import {
  type ProviderFulfillment,
  workStatus,
  workLabels,
  hanoiDay,
  workTime,
  matchWorkSearch,
} from "./ktv-workspace-data";
import "./ktv-workspace.css";

export function TechnicianWorkspace() {
  const { user, authFetch, logout, logoutAll } = useAuth();
  const client = useQueryClient();
  const key = ["ktv-workspace", user?.id];
  const enabled = !!user && user.roles.some((r) => r === "THERAPIST" || r === "DOCTOR_CONSULTANT");
  const inquiries = useQuery({
    queryKey: [...key, "inquiries"],
    queryFn: () => authFetch<Inquiry[]>("/appointment-inquiries", { cache: "no-store" }),
    enabled,
    refetchInterval: 30000,
  });
  const fulfillments = useQuery({
    queryKey: [...key, "fulfillments"],
    queryFn: () =>
      authFetch<ProviderFulfillment[]>("/provider/inquiry-fulfillments", { cache: "no-store" }),
    enabled,
    refetchInterval: 30000,
  });
  const threads = useQuery({
    queryKey: [...key, "threads"],
    queryFn: () =>
      authFetch<Array<{ unread_count: number }>>("/ktv-chat/threads", { cache: "no-store" }),
    enabled,
    refetchInterval: 30000,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [tab, setTab] = useState("active"),
    [query, setQuery] = useState(""),
    [panel, setPanel] = useState("schedule");
  const [completion, setCompletion] = useState<Inquiry | null>(null),
    [attested, setAttested] = useState(false),
    [note, setNote] = useState(""),
    [notice, setNotice] = useState(""),
    [signingOut, setSigningOut] = useState(false);
  const items = (inquiries.data || []).filter((i) => i.customerId !== user?.id && !i.archivedAt);
  const progress = new Map((fulfillments.data || []).map((f) => [f.inquiryId, f]));
  const stage = (i: Inquiry) => workStatus(i, progress.get(i.id));
  const when = (i: Inquiry) => progress.get(i.id)?.startsAt || i.requestedAt;
  const active = (i: Inquiry) => !["COMPLETED", "DECLINED", "CANCELLED"].includes(stage(i));
  const today = hanoiDay(new Date(now));
  const todayItems = items.filter(
    (i) => hanoiDay(when(i)) === today && !["CANCELLED", "DECLINED"].includes(stage(i)),
  );
  const selected = items
    .filter(
      (i) =>
        (tab === "all" ||
          (tab === "active" && active(i)) ||
          (tab === "today" && todayItems.includes(i)) ||
          (tab === "done" && stage(i) === "COMPLETED")) &&
        matchWorkSearch(i.customerName + " " + i.serviceName + " " + i.address, query),
    )
    .sort((a, b) => {
      const rank = (i: Inquiry) =>
        stage(i) === "IN_SERVICE"
          ? 0
          : hanoiDay(when(i)) === today
            ? 1
            : stage(i) === "PENDING"
              ? 2
              : Date.parse(when(i)) >= now
                ? 3
                : 4;
      return rank(a) - rank(b) || Date.parse(when(b)) - Date.parse(when(a));
    });
  const next = items
    .filter((i) => active(i) && stage(i) !== "PENDING" && Date.parse(when(i)) >= now)
    .sort((a, b) => Date.parse(when(a)) - Date.parse(when(b)))[0];
  const mutation = useMutation({
    mutationFn: async ({ item, status }: { item: Inquiry; status: string }) => {
      const fulfillment = progress.get(item.id);
      if (status === "COMPLETED" || status === "IN_SERVICE") {
        const reason =
          note.trim() ||
          (status === "COMPLETED"
            ? "KTV xác nhận buổi chăm sóc đã thực sự hoàn thành."
            : "KTV xác nhận bắt đầu phục vụ khách hàng.");
        if (item.appointmentId) {
          if (!fulfillment?.version)
            throw Error("Chưa tải được tiến độ lịch. Hãy tải lại trước khi cập nhật.");
          return authFetch("/provider/inquiry-fulfillments/" + item.id + "/status", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status,
              expectedVersion: fulfillment.version,
              reason,
              ...(status === "COMPLETED" ? { servicePerformedConfirmed: attested } : {}),
            }),
          });
        }
        return authFetch("/provider/appointment-inquiries/" + item.id + "/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ servicePerformedConfirmed: attested, reason }),
        });
      }
      return authFetch("/appointment-inquiries/" + item.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (data, action) => {
      const updated = data as {
        providerCompletedAt?: string;
        status?: string;
        version?: number;
        id?: string;
      };
      if (updated.providerCompletedAt)
        client.setQueryData<Inquiry[]>([...key, "inquiries"], (old) =>
          old?.map((i) =>
            i.id === action.item.id
              ? { ...i, providerCompletedAt: updated.providerCompletedAt }
              : i,
          ),
        );
      else if (action.item.appointmentId)
        client.setQueryData<ProviderFulfillment[]>([...key, "fulfillments"], (old) =>
          old?.map((f) =>
            f.inquiryId === action.item.id
              ? { ...f, status: updated.status || f.status, version: updated.version || f.version }
              : f,
          ),
        );
      else if (updated.id)
        client.setQueryData<Inquiry[]>([...key, "inquiries"], (old) =>
          old?.map((i) => (i.id === action.item.id ? { ...i, ...updated } : i)),
        );
      void client.invalidateQueries({ queryKey: key });
      setCompletion(null);
      setAttested(false);
      setNote("");
      setNotice(
        action.status === "COMPLETED"
          ? "Đã cập nhật hoàn thành buổi chăm sóc."
          : "Đã cập nhật yêu cầu của khách hàng.",
      );
    },
    onError: (e) =>
      setNotice(e instanceof Error ? e.message : "Chưa cập nhật được. Vui lòng thử lại."),
  });
  async function signOut(all = false) {
    setSigningOut(true);
    try {
      await (all ? logoutAll() : logout());
    } catch {
      setNotice("Chưa đăng xuất được. Vui lòng thử lại.");
    } finally {
      setSigningOut(false);
    }
  }
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!completion || !dialogRef.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = "hidden";
    dialog.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = [
        ...dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href]",
        ),
      ];
      const first = controls[0],
        last = controls.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener("keydown", trap);
    return () => {
      dialog.removeEventListener("keydown", trap);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [completion]);
  if (!enabled || !user) return null;
  const counts = [
    { label: "Hẹn hôm nay", value: todayItems.length, Icon: CalendarDays },
    {
      label: "Chờ phản hồi",
      value: items.filter((i) => stage(i) === "PENDING").length,
      Icon: Clock3,
    },
    {
      label: "Đã hoàn thành",
      value: items.filter((i) => stage(i) === "COMPLETED").length,
      Icon: CheckCircle2,
    },
    {
      label: "Tin chưa đọc",
      value: (threads.data || []).reduce((sum, t) => sum + t.unread_count, 0),
      Icon: MessageCircle,
    },
  ];
  return (
    <main className="mm-container ktvw-main">
      <header className="ktvw-hero">
        <div>
          <span className="ktvw-eyebrow">KHÔNG GIAN LÀM VIỆC · MỘC MARIA</span>
          <h1>
            Chào {user.displayName},<br />
            <em>một ngày tận tâm.</em>
          </h1>
          <p>Lịch hẹn, khách hàng và những việc cần làm — ngay trong tầm tay.</p>
          <div className="ktvw-hero-actions">
            <Link className="ktvw-primary" href="/tin-nhan">
              <MessageCircle size={18} /> Trả lời khách hàng
            </Link>
            <Link href="/ktv/an-toan" className="ktvw-light">
              <ShieldCheck size={18} /> An toàn khi phục vụ
            </Link>
          </div>
        </div>
        <div className="ktvw-hero-aside">
          <span>
            {new Intl.DateTimeFormat("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(now))}
          </span>
          <strong>{next ? "Cuộc hẹn sắp tới" : "Sẵn sàng cho hôm nay"}</strong>
          <p>
            {next
              ? next.customerName + " · " + workTime(when(next))
              : "Theo dõi yêu cầu mới và dành thời gian chăm sóc khách hàng."}
          </p>
          <button
            type="button"
            className="ktvw-logout"
            disabled={signingOut}
            onClick={() => void signOut()}
          >
            <LogOut size={16} />
            {signingOut ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      </header>
      <section className="ktvw-stats" aria-label="Tổng quan công việc">
        {counts.map(({ label, value, Icon }, i) => (
          <article key={label}>
            <Icon size={21} />
            <strong>
              {(
                i === 3
                  ? threads.isPending || threads.isError
                  : inquiries.isPending || inquiries.isError
              )
                ? "—"
                : value}
            </strong>
            <span>{label}</span>
          </article>
        ))}
      </section>
      {notice && (
        <p role={mutation.isError ? "alert" : "status"} className="ktvw-notice">
          {notice}
        </p>
      )}
      <div className="ktvw-columns">
        <section className="ktvw-agenda" aria-labelledby="ktvw-agenda-title">
          <div className="ktvw-section-head">
            <div>
              <span className="ktvw-eyebrow">KHÁCH HÀNG & LỊCH HẸN</span>
              <h2 id="ktvw-agenda-title">Công việc của bạn</h2>
            </div>
            <button
              type="button"
              className="ktvw-icon-button"
              aria-label="Tải lại lịch hẹn"
              disabled={inquiries.isFetching}
              onClick={() => {
                void inquiries.refetch();
                void fulfillments.refetch();
                void threads.refetch();
              }}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <div className="ktvw-tabs" aria-label="Lọc lịch hẹn">
            {[
              ["active", "Cần xử lý"],
              ["today", "Hôm nay"],
              ["done", "Đã xong"],
              ["all", "Tất cả"],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={tab === id}
                className={tab === id ? "selected" : ""}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="ktvw-search">
            <Search size={18} />
            <input
              aria-label="Tìm khách hàng hoặc dịch vụ"
              placeholder="Tìm khách hàng, dịch vụ, địa chỉ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {inquiries.isPending ? (
            <p role="status" className="ktvw-empty">
              Đang tải lịch hẹn của bạn...
            </p>
          ) : inquiries.isError ? (
            <p role="alert" className="ktvw-empty">
              Chưa tải được lịch hẹn. Hãy bấm tải lại.
            </p>
          ) : !selected.length ? (
            <div className="ktvw-empty">
              <CalendarDays size={32} />
              <h3>{tab === "done" ? "Chưa có lịch hoàn thành" : "Không có lịch trong mục này"}</h3>
              <p>
                Yêu cầu mới sẽ xuất hiện tại đây. Bạn có thể đổi bộ lọc hoặc tiếp tục trả lời khách
                hàng.
              </p>
            </div>
          ) : (
            selected.map((item) => {
              const status = stage(item),
                f = progress.get(item.id),
                official = !!item.appointmentId;
              const startAllowed = f?.startsAt && Date.parse(f.startsAt) - 30 * 60000 <= now;
              const finishAllowed = official
                ? status === "IN_SERVICE" && !!f?.endsAt && Date.parse(f.endsAt) <= now
                : status === "CONTACTED" && Date.parse(item.requestedAt) <= now;
              return (
                <article className="ktvw-card" key={item.id}>
                  <div className="ktvw-card-top">
                    <div className="ktvw-avatar">
                      {item.customerName
                        .trim()
                        .split(/\s+/)
                        .slice(-2)
                        .map((s) => s[0])
                        .join("")}
                    </div>
                    <div>
                      <h3>{item.customerName}</h3>
                      <p>
                        {
                          officialServiceLabel({ id: item.serviceId || "", name: item.serviceName })
                            .name
                        }
                      </p>
                    </div>
                    <span className={"ktvw-status is-" + status.toLowerCase()}>
                      {workLabels[status] || status}
                    </span>
                  </div>
                  <div className="ktvw-card-meta">
                    <p>
                      <Clock3 size={16} />
                      <span>
                        {workTime(when(item))}
                        <small>
                          {official ? "Thời gian đã xác nhận" : "Thời gian khách đề nghị"}
                        </small>
                      </span>
                    </p>
                    <p>
                      <MapPin size={16} />
                      <span>
                        {item.location === "AT_HOME" ? "Tại địa chỉ khách hàng" : "Tại Mộc Maria"}
                        <small>{item.address}</small>
                      </span>
                    </p>
                  </div>
                  {item.notes && <p className="ktvw-notes">Ghi chú: {item.notes}</p>}
                  {item.providerCompletedAt && (
                    <p className="ktvw-finish-note">
                      <CheckCircle2 size={14} /> KTV báo hoàn thành lúc{" "}
                      {workTime(item.providerCompletedAt)}
                    </p>
                  )}
                  <div className="ktvw-card-actions">
                    <Link href="/tin-nhan" className="ktvw-light">
                      <MessageCircle size={16} /> Mở chat
                    </Link>
                    {item.location === "AT_HOME" && active(item) && (
                      <Link className="ktvw-light" href="/ktv/an-toan">
                        <ShieldCheck size={16} /> An toàn
                      </Link>
                    )}
                    {status === "PENDING" && !official && (
                      <>
                        <button
                          type="button"
                          className="ktvw-primary"
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate({ item, status: "CONTACTED" })}
                        >
                          Nhận trao đổi
                        </button>
                        <button
                          type="button"
                          className="ktvw-text"
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate({ item, status: "DECLINED" })}
                        >
                          Chưa thể phục vụ
                        </button>
                      </>
                    )}
                    {status === "CONFIRMED" && official && (
                      <button
                        type="button"
                        className="ktvw-primary"
                        disabled={mutation.isPending || !startAllowed}
                        onClick={() => mutation.mutate({ item, status: "IN_SERVICE" })}
                      >
                        Bắt đầu phục vụ
                      </button>
                    )}
                    {["CONTACTED", "IN_SERVICE"].includes(status) && (
                      <button
                        type="button"
                        className="ktvw-complete"
                        disabled={mutation.isPending || !finishAllowed}
                        onClick={() => {
                          setCompletion(item);
                          setAttested(false);
                          setNote("");
                          setNotice("");
                        }}
                      >
                        <CheckCircle2 size={16} /> Đánh dấu đã hoàn thành
                      </button>
                    )}
                  </div>
                  {!finishAllowed && status === "IN_SERVICE" && f?.endsAt && (
                    <p className="ktvw-hint">Có thể hoàn thành từ {workTime(f.endsAt)}.</p>
                  )}
                  {fulfillments.isError && official && (
                    <p className="ktvw-hint" role="alert">
                      Chưa tải được tiến độ lịch chính thức. Hãy tải lại trước khi cập nhật.
                    </p>
                  )}
                </article>
              );
            })
          )}
        </section>
        <aside className="ktvw-sidebar">
          <section className="ktvw-support">
            <ShieldCheck size={24} />
            <h2>An tâm khi phục vụ</h2>
            <p>
              Bật chia sẻ vị trí khi đi phục vụ tại nhà. Check-in và SOS luôn sẵn sàng khi bạn cần
              hỗ trợ.
            </p>
            <Link href="/ktv/an-toan">
              Mở công cụ an toàn <ArrowUpRight size={17} />
            </Link>
          </section>
          <section className="ktvw-shortcuts">
            <h2>Góc của bạn</h2>
            {[
              ["schedule", "Ca làm việc", CalendarDays],
              ["profile", "Hồ sơ & giới thiệu", UserRound],
              ["security", "Tài khoản & bảo mật", KeyRound],
            ].map(([id, label, Icon]) => {
              const I = Icon as typeof CalendarDays;
              return (
                <button
                  key={id as string}
                  type="button"
                  className={panel === id ? "selected" : ""}
                  onClick={() => setPanel(id as string)}
                >
                  <I size={18} />
                  {label as string}
                  <ArrowUpRight size={15} />
                </button>
              );
            })}
            <Link href="/ktv/dao-tao">
              <GraduationCap size={18} /> Đào tạo & chứng nhận <ArrowUpRight size={15} />
            </Link>
            {user.permissions.includes("admin.portal") && (
              <Link href="/quan-tri">
                Khu vực quản trị <ArrowUpRight size={15} />
              </Link>
            )}
          </section>
        </aside>
      </div>
      <section className="ktvw-personal" aria-label="Thiết lập kỹ thuật viên">
        <div className="ktvw-tabs">
          {[
            ["schedule", "Ca làm việc"],
            ["profile", "Hồ sơ của tôi"],
            ["security", "Bảo mật"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={panel === id}
              className={panel === id ? "selected" : ""}
              onClick={() => setPanel(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {panel === "schedule" ? (
          <div id="lich-lam-viec">
            <OwnProviderPlanning />
          </div>
        ) : panel === "profile" ? (
          <ProviderDescriptionEditor />
        ) : (
          <div className="ktvw-security-grid">
            <article className="ktvw-account">
              <h2>Thông tin tài khoản</h2>
              <dl>
                <dt>Họ và tên</dt>
                <dd>{user.displayName}</dd>
                <dt>Email</dt>
                <dd>{user.email || "Chưa cập nhật"}</dd>
                <dt>Số điện thoại</dt>
                <dd>{user.phone || "Chưa cập nhật"}</dd>
              </dl>
              {user.mustChangePassword && (
                <p className="ktvw-notice">
                  Hãy đổi mật khẩu ban đầu thành mật khẩu của riêng bạn.
                </p>
              )}
              <button
                type="button"
                className="ktvw-light"
                disabled={signingOut}
                onClick={() => void signOut(true)}
              >
                Đăng xuất mọi thiết bị
              </button>
            </article>
            <ChangePasswordForm />
          </div>
        )}
      </section>
      {completion && (
        <div
          className="ktvw-modal-backdrop"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !mutation.isPending) setCompletion(null);
          }}
        >
          <section
            role="dialog"
            ref={dialogRef}
            tabIndex={-1}
            aria-modal="true"
            aria-labelledby="ktvw-completion-title"
            className="ktvw-modal"
          >
            <button
              type="button"
              className="ktvw-icon-button ktvw-modal-close"
              aria-label="Đóng xác nhận"
              disabled={mutation.isPending}
              onClick={() => setCompletion(null)}
            >
              <X size={20} />
            </button>
            <CheckCircle2 size={32} />
            <h2 id="ktvw-completion-title">Xác nhận hoàn thành</h2>
            <p>
              {completion.customerName} ·{" "}
              {
                officialServiceLabel({
                  id: completion.serviceId || "",
                  name: completion.serviceName,
                }).name
              }
            </p>
            <label className="ktvw-attest">
              <input
                type="checkbox"
                checked={attested}
                onChange={(e) => setAttested(e.target.checked)}
              />{" "}
              Buổi chăm sóc đã diễn ra và tôi đã phục vụ xong.
            </label>
            <label className="ktvw-modal-note">
              Ghi chú hoàn thành (không bắt buộc)
              <textarea
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Thông tin cần lưu lại cho buổi chăm sóc..."
              />
            </label>
            {notice && <p role="alert">{notice}</p>}
            <div className="ktvw-card-actions">
              <button
                type="button"
                className="ktvw-light"
                disabled={mutation.isPending}
                onClick={() => setCompletion(null)}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="ktvw-complete"
                disabled={
                  !attested ||
                  mutation.isPending ||
                  (note.trim().length > 0 && note.trim().length < 10)
                }
                onClick={() => mutation.mutate({ item: completion, status: "COMPLETED" })}
              >
                {mutation.isPending ? "Đang cập nhật..." : "Xác nhận đã hoàn thành"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
