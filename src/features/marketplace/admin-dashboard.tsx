"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import "./admin-dashboard.css";

type Period = "day" | "month" | "year";
type Totals = {
  requests: number;
  pending: number;
  contacted: number;
  confirmed: number;
  inService: number;
  completed: number;
  cancelled: number;
};
type Staff = {
  id: string;
  name: string;
  status: string;
  accountActive: boolean;
  total: number;
  completed: number;
  inService: number;
  pending: number;
  rating: number | null;
  feedback: number;
};
type Overview = {
  generatedAt: string;
  range: { period: Period; from: string; to: string; label: string };
  totals: Totals;
  trend: { bucket: string; total: number; completed: number }[];
  services: { id: string; name: string; total: number; completed: number }[];
  providers: Staff[];
  serviceCount: number;
  activeProviders: number;
};
type ProviderDetails = {
  provider: Staff;
  feedback: { id: string; stars: number; comment: string; createdAt: string }[];
  range: Overview["range"];
};

const number = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const percent = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const quickLinks = [
  {
    label: "Quản lý lịch đặt",
    href: "/quan-tri/lich-hen",
    permission: "customers.manage",
    icon: CalendarDays,
  },
  {
    label: "Hồ sơ kỹ thuật viên",
    href: "/quan-tri/ktv",
    permission: "staff.manage",
    icon: UsersRound,
  },
  {
    label: "Dịch vụ & bảng giá",
    href: "/quan-tri/dich-vu",
    permission: "staff.manage",
    icon: Sparkles,
  },
  {
    label: "Đánh giá khách hàng",
    href: "/quan-tri/danh-gia-ktv",
    permission: "staff.manage",
    icon: Star,
  },
];

function useDashboardRealtime(enabled: boolean) {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    let lastRefresh = 0;
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh < 20_000) return;
      lastRefresh = Date.now();
      void client.invalidateQueries({ queryKey: ["admin-dashboard"] });
    };
    // Existing Mộc Maria catalog Socket is only an invalidation hint.
    // Operational events are supported when emitted by a trusted backend.
    const socket = io("https://chat.giangxa.com/moc-maria-updates", {
      transports: ["websocket", "polling"],
      reconnectionDelayMax: 15_000,
      withCredentials: false,
      timeout: 7_000,
    });
    socket.on("moc-maria:appointments-changed", refresh);
    socket.on("moc-maria:catalog-changed", refresh);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      socket.disconnect();
    };
  }, [enabled, client]);
}

export function AdminDashboard() {
  const { user, authFetch } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const [date, setDate] = useState(today);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canView =
    !!user?.roles.some((r) => r === "ADMIN" || r === "SUPER_ADMIN") &&
    user.permissions.includes("customers.manage") &&
    user.permissions.includes("staff.manage");
  const client = useQueryClient();
  useDashboardRealtime(canView);
  const params = new URLSearchParams({ period, date });
  const report = useQuery({
    queryKey: ["admin-dashboard", user?.id, period, date],
    queryFn: () => authFetch<Overview>("/admin/dashboard/overview?" + params.toString()),
    enabled: canView,
    staleTime: 45_000,
    refetchInterval: canView ? 90_000 : false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const detail = useQuery({
    queryKey: ["admin-dashboard-provider", user?.id, selectedId, period, date],
    queryFn: () =>
      authFetch<ProviderDetails>(
        "/admin/dashboard/providers/" + selectedId + "?" + params.toString(),
      ),
    enabled: canView && !!selectedId,
    staleTime: 45_000,
    retry: 1,
  });

  const data = report.data;
  const completion = percent(data?.totals.completed ?? 0, data?.totals.requests ?? 0);
  const maxTrend = Math.max(1, ...(data?.trend.map((item) => item.total) ?? []));
  const maxService = Math.max(1, ...(data?.services.map((item) => item.total) ?? []));
  const active = (staff: Staff) => staff.accountActive && staff.status === "APPROVED";
  const shortcuts = quickLinks.filter((item) => user?.permissions.includes(item.permission));

  return (
    <div className="mm-ops">
      <section className="mm-ops-top">
        <div>
          <div className="mm-ops-kicker">
            <Activity size={14} /> MỘC MARIA · OPERATIONS
          </div>
          <h2>Nhịp vận hành, trong một góc nhìn.</h2>
          <p>Đặt lịch, dịch vụ và kỹ thuật viên — cập nhật từ dữ liệu thực của hệ thống.</p>
        </div>
        <div className="mm-ops-toolbar">
          <div className="mm-ops-periods" role="group" aria-label="Khoảng báo cáo">
            {(
              [
                ["day", "Ngày"],
                ["month", "Tháng"],
                ["year", "Năm"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                className={period === value ? "is-selected" : ""}
                onClick={() => {
                  setPeriod(value);
                  setSelectedId(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="mm-ops-date">
            <span className="sr-only">Ngày tham chiếu</span>
            <CalendarDays size={16} />
            <input
              aria-label="Ngày tham chiếu"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value || today());
                setSelectedId(null);
              }}
            />
          </label>
          <button
            type="button"
            className="mm-ops-refresh"
            aria-label="Làm mới báo cáo"
            disabled={report.isFetching}
            onClick={() => void client.invalidateQueries({ queryKey: ["admin-dashboard"] })}
          >
            <RefreshCw size={17} className={report.isFetching ? "is-spinning" : ""} />
          </button>
        </div>
      </section>

      {!canView ? (
        <div className="mm-ops-empty">
          <ShieldCheck size={28} />
          <h3>Tổng hợp vận hành dành cho quản trị viên</h3>
          <p>
            Để bảo vệ dữ liệu khách và KTV, báo cáo chỉ hiển thị khi tài khoản có đủ quyền quản lý.
          </p>
          <div className="mm-ops-quick-links">
            {shortcuts.map(({ href, label, icon: Icon }) => (
              <Link href={href} key={href}>
                <Icon size={18} /> {label} <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        </div>
      ) : report.isPending ? (
        <div className="mm-ops-skeleton" role="status" aria-label="Đang tải số liệu báo cáo">
          <div />
          <div />
          <div />
          <div />
          <div className="is-wide" />
          <div className="is-wide" />
          <span>Đang tải bản tổng hợp vận hành…</span>
        </div>
      ) : report.isError || !data ? (
        <div className="mm-ops-empty" role="alert">
          <Activity size={28} />
          <h3>Chưa lấy được báo cáo</h3>
          <p>Không hiển thị số liệu giả. Hãy kiểm tra API tổng hợp hoặc thử tải lại.</p>
          <button type="button" onClick={() => void report.refetch()}>
            Thử lại <RefreshCw size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="mm-ops-meta">
            <span>
              <CheckCircle2 size={14} /> Số liệu từ hệ thống
            </span>
            <span>
              Cập nhật{" "}
              {new Date(data.generatedAt).toLocaleTimeString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
              {report.isFetching ? " · Đang làm mới" : ""}
            </span>
          </div>

          <section className="mm-ops-kpis" aria-label="Chỉ số vận hành">
            {(
              [
                {
                  label: "Yêu cầu đặt lịch",
                  value: data.totals.requests,
                  hint: "Tổng tiếp nhận",
                  icon: ClipboardList,
                  tone: "forest",
                },
                {
                  label: "Đã hoàn thành",
                  value: data.totals.completed,
                  hint: completion + "% tổng yêu cầu",
                  icon: CheckCircle2,
                  tone: "mint",
                },
                {
                  label: "Cần xử lý",
                  value: data.totals.pending + data.totals.contacted,
                  hint: "Chờ & đang trao đổi",
                  icon: Clock3,
                  tone: "amber",
                },
                {
                  label: "Đang phục vụ",
                  value: data.totals.inService,
                  hint: "Theo trạng thái lịch",
                  icon: Activity,
                  tone: "blue",
                },
                {
                  label: "Hồ sơ kỹ thuật viên",
                  value: data.providers.length,
                  hint: number(data.activeProviders) + " hồ sơ đã duyệt",
                  icon: UsersRound,
                  tone: "mint",
                },
                {
                  label: "Dịch vụ công bố",
                  value: data.serviceCount,
                  hint: "Danh mục hiện hành",
                  icon: Stethoscope,
                  tone: "forest",
                },
              ] as const
            ).map(({ label, value, hint, icon: Icon, tone }) => (
              <div className={"mm-ops-kpi mm-ops-kpi-" + tone} key={label}>
                <div className="mm-ops-kpi-top">
                  <span>{label}</span>
                  <Icon size={19} />
                </div>
                <strong>{number(value)}</strong>
                <small>{hint}</small>
              </div>
            ))}
          </section>

          <div className="mm-ops-primary">
            <section className="mm-ops-panel mm-ops-chart">
              <div className="mm-ops-panel-head">
                <div>
                  <span className="mm-ops-eyebrow">XU HƯỚNG VẬN HÀNH</span>
                  <h3>
                    Lượng đặt lịch{" "}
                    {period === "day"
                      ? "trong ngày"
                      : period === "month"
                        ? "theo ngày"
                        : "theo tháng"}
                  </h3>
                </div>
                <Link href="/quan-tri/lich-hen">
                  Xem lịch <ArrowUpRight size={15} />
                </Link>
              </div>
              <div className="mm-ops-legend">
                <span>
                  <i /> Tiếp nhận
                </span>
                <span>
                  <i /> Hoàn thành
                </span>
              </div>
              <div
                className="mm-ops-bars"
                role="img"
                aria-label="Biểu đồ lượng yêu cầu đặt lịch và đã hoàn thành"
              >
                {data.trend.length ? (
                  data.trend.map((item) => (
                    <div
                      className="mm-ops-bar-item"
                      key={item.bucket}
                      title={
                        item.bucket +
                        ": " +
                        item.total +
                        " yêu cầu, " +
                        item.completed +
                        " hoàn thành"
                      }
                    >
                      <div className="mm-ops-bar-columns">
                        <span style={{ height: (item.total / maxTrend) * 100 + "%" }} />
                        <span style={{ height: (item.completed / maxTrend) * 100 + "%" }} />
                      </div>
                      <small>
                        {period === "month"
                          ? item.bucket.slice(-2)
                          : period === "year"
                            ? item.bucket.slice(-2)
                            : item.bucket.slice(0, 2)}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>Chưa có yêu cầu trong kỳ này.</p>
                )}
              </div>
              <div className="mm-ops-chart-foot">
                <span>{number(data.totals.confirmed)} đã xác nhận</span>
                <span>{number(data.totals.cancelled)} hủy / từ chối</span>
              </div>
            </section>

            <section className="mm-ops-panel mm-ops-service-panel">
              <div className="mm-ops-panel-head">
                <div>
                  <span className="mm-ops-eyebrow">DỊCH VỤ ĐƯỢC QUAN TÂM</span>
                  <h3>Top dịch vụ</h3>
                </div>
                <Link href="/quan-tri/dich-vu">
                  Quản lý <ArrowUpRight size={15} />
                </Link>
              </div>
              <div className="mm-ops-top-services">
                {data.services.length ? (
                  data.services.map((item, index) => (
                    <div className="mm-ops-service-row" key={item.id + item.name}>
                      <div className="mm-ops-service-info">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{item.name}</strong>
                        <b>{number(item.total)}</b>
                      </div>
                      <div className="mm-ops-track">
                        <span style={{ width: (item.total / maxService) * 100 + "%" }} />
                      </div>
                      <small>{item.completed} hoàn thành</small>
                    </div>
                  ))
                ) : (
                  <p className="mm-ops-muted">Chưa có lượt đặt dịch vụ trong kỳ.</p>
                )}
              </div>
            </section>
          </div>

          <section className="mm-ops-panel mm-ops-team">
            <div className="mm-ops-panel-head">
              <div>
                <span className="mm-ops-eyebrow">ĐỘI NGŨ KỸ THUẬT VIÊN</span>
                <h3>Hiệu quả phục vụ & đánh giá</h3>
                <p>Nhấn vào từng KTV để xem số lượng phục vụ và phản hồi chi tiết.</p>
              </div>
              <Link href="/quan-tri/ktv">
                Toàn bộ KTV <ArrowUpRight size={15} />
              </Link>
            </div>
            {data.providers.length ? (
              <div className="mm-ops-staff-list">
                {data.providers.map((staff) => (
                  <button
                    type="button"
                    key={staff.id}
                    className="mm-ops-staff"
                    onClick={() => setSelectedId(staff.id)}
                  >
                    <span className="mm-ops-avatar" aria-hidden="true">
                      {staff.name.trim().slice(0, 1).toUpperCase()}
                    </span>
                    <span className="mm-ops-staff-name">
                      <strong>{staff.name}</strong>
                      <small
                        className={
                          staff.inService > 0
                            ? "mm-ops-serving"
                            : active(staff)
                              ? "mm-ops-active"
                              : "mm-ops-inactive"
                        }
                      >
                        <i />{" "}
                        {staff.inService > 0
                          ? "Đang phục vụ"
                          : active(staff)
                            ? "Đã được duyệt"
                            : staff.status === "APPLIED" && staff.accountActive
                              ? "Chờ duyệt hồ sơ"
                              : "Tạm ngưng"}
                      </small>
                    </span>
                    <span className="mm-ops-staff-metric">
                      <strong>{staff.total}</strong>
                      <small>Đã tiếp nhận</small>
                    </span>
                    <span className="mm-ops-staff-metric">
                      <strong>{staff.completed}</strong>
                      <small>Hoàn thành</small>
                    </span>
                    <span className="mm-ops-staff-metric">
                      <strong>{staff.pending}</strong>
                      <small>Chưa hoàn thành</small>
                    </span>
                    <span className="mm-ops-staff-metric mm-ops-staff-rating">
                      <strong>
                        <Star size={13} fill="currentColor" />{" "}
                        {staff.rating == null ? "—" : staff.rating}
                      </strong>
                      <small>{number(staff.feedback)} đánh giá</small>
                    </span>
                    <ChevronRight size={17} className="mm-ops-staff-chevron" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mm-ops-muted">Chưa có KTV trong danh sách báo cáo.</p>
            )}
          </section>

          <section className="mm-ops-footer">
            <div>
              <ShieldCheck size={19} />
              <p>
                “Hồ sơ hoạt động” không phải trạng thái Socket online. Dashboard không suy đoán
                doanh thu khi chưa có thanh toán được đối soát.
              </p>
            </div>
            <div className="mm-ops-quick-links">
              {shortcuts.map(({ href, label, icon: Icon }) => (
                <Link href={href} key={href}>
                  <Icon size={17} /> {label} <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {selectedId && canView && (
        <div className="mm-ops-drawer-layer" role="presentation">
          <button
            type="button"
            className="mm-ops-drawer-scrim"
            aria-label="Đóng chi tiết KTV"
            onClick={() => setSelectedId(null)}
          />
          <aside
            className="mm-ops-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Báo cáo chi tiết KTV"
          >
            <div className="mm-ops-drawer-head">
              <div>
                <span className="mm-ops-eyebrow">BÁO CÁO CÁ NHÂN</span>
                <h3>Chi tiết kỹ thuật viên</h3>
              </div>
              <button type="button" aria-label="Đóng" onClick={() => setSelectedId(null)}>
                <X size={20} />
              </button>
            </div>
            {detail.isPending ? (
              <p role="status" className="mm-ops-muted">
                Đang tải hồ sơ và phản hồi…
              </p>
            ) : detail.isError || !detail.data ? (
              <p role="alert">Không tải được chi tiết KTV.</p>
            ) : (
              <>
                <h4>{detail.data.provider.name}</h4>
                <p className="mm-ops-muted">Số liệu theo kỳ đã chọn ({data?.range.label})</p>
                <div className="mm-ops-drawer-stats">
                  {[
                    ["Tiếp nhận", detail.data.provider.total],
                    ["Hoàn thành", detail.data.provider.completed],
                    ["Chưa hoàn thành", detail.data.provider.pending],
                    ["Đang phục vụ", detail.data.provider.inService],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <Link className="mm-ops-profile-link" href={"/quan-tri/ktv/" + selectedId}>
                  Xem hồ sơ & chuyên môn đầy đủ <ExternalLink size={16} />
                </Link>
                <h5>Phản hồi đã công bố</h5>
                {detail.data.feedback.length ? (
                  detail.data.feedback.map((review) => (
                    <article className="mm-ops-review" key={review.id}>
                      <span>
                        <Star size={14} fill="currentColor" /> {review.stars}/5
                      </span>
                      <p>{review.comment}</p>
                      <small>{new Date(review.createdAt).toLocaleDateString("vi-VN")}</small>
                    </article>
                  ))
                ) : (
                  <p className="mm-ops-muted">Chưa có đánh giá công khai.</p>
                )}
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
