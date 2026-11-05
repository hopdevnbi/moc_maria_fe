"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  attendanceLabel,
  attendanceRows,
  attendanceSelfieUrl,
  displayAttendanceDate,
  formattedCheckInTime,
  hcmDate,
  isConfigured,
  type AttendanceAdminList,
  type AttendanceAdminSummary,
  type AttendanceBranch,
  type AttendanceRecord,
  type AttendanceStatus,
} from "./data";
import "./staff-attendance-admin.css";

function recordName(row: AttendanceRecord) {
  return (
    row.employee?.displayName ||
    row.staff?.displayName ||
    row.staffName ||
    row.employeeName ||
    "Nhân viên " + (row.userId ?? "")
  );
}
export function StaffAttendanceAdmin() {
  const { user, authFetch } = useAuth();
  const client = useQueryClient();
  const allowed = !!user?.roles.includes("SUPER_ADMIN");
  const [date, setDate] = useState(() => hcmDate());
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AttendanceStatus | "ALL">("ALL");
  const [branchId, setBranchId] = useState("");
  const [draft, setDraft] = useState<{ id: string; latitude: string; longitude: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteNotice, setDeleteNotice] = useState("");
  const checkIns = useQuery({
    queryKey: ["admin", "staff-attendance", date, page],
    queryFn: () =>
      authFetch<AttendanceAdminList>(
        "/admin/staff-attendance/check-ins?date=" + date + "&page=" + page + "&limit=30",
        { cache: "no-store" },
      ),
    enabled: allowed,
    retry: false,
  });
  const summary = useQuery({
    queryKey: ["admin", "staff-attendance", "summary", date],
    queryFn: () =>
      authFetch<AttendanceAdminSummary>("/admin/staff-attendance/summary?date=" + date, {
        cache: "no-store",
      }),
    enabled: allowed,
    retry: false,
  });
  const branches = useQuery({
    queryKey: ["admin", "branches", "attendance"],
    queryFn: () => authFetch<AttendanceBranch[]>("/admin/branches", { cache: "no-store" }),
    enabled: allowed,
    retry: false,
  });
  const selectedBranch = branches.data?.find((b) => b.id === branchId) ?? branches.data?.[0];
  const latitude =
    draft !== null && draft.id === selectedBranch?.id
      ? draft.latitude
      : selectedBranch?.latitude == null
        ? ""
        : String(selectedBranch.latitude);
  const longitude =
    draft !== null && draft.id === selectedBranch?.id
      ? draft.longitude
      : selectedBranch?.longitude == null
        ? ""
        : String(selectedBranch.longitude);

  async function saveCenter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBranch || saving) return;
    const lat = Number(latitude.trim().replace(",", "."));
    const lon = Number(longitude.trim().replace(",", "."));
    if (
      !latitude.trim() ||
      !longitude.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    ) {
      setError(true);
      setFeedback("Vui lòng nhập vĩ độ (-90 đến 90) và kinh độ (-180 đến 180) hợp lệ.");
      return;
    }
    setSaving(true);
    setFeedback("");
    setError(false);
    try {
      await authFetch("/admin/branches/" + encodeURIComponent(selectedBranch.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
      await client.invalidateQueries({ queryKey: ["admin", "branches", "attendance"] });
      setFeedback(
        "Đã lưu tọa độ cơ sở. Các lượt check-in mới sẽ được kiểm tra theo bán kính 200m.",
      );
    } catch (cause) {
      setError(true);
      setFeedback(cause instanceof Error ? cause.message : "Chưa cập nhật được tọa độ.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCheckIn() {
    if (!allowed || !deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await authFetch("/admin/staff-attendance/check-ins/" + encodeURIComponent(deleteTarget.id), {
        method: "DELETE",
        cache: "no-store",
      });
      setDeleteNotice(
        `Đã xóa lượt check-in của ${recordName(deleteTarget)}. Nhân viên có thể điểm danh lại trong ngày.`,
      );
      setDeleteTarget(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin", "staff-attendance"] }),
        client.invalidateQueries({ queryKey: ["staff-attendance"] }),
      ]);
    } catch (cause) {
      setDeleteError(
        cause instanceof Error ? cause.message : "Không thể xóa lượt chấm công. Vui lòng thử lại.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const rows = attendanceRows(checkIns.data);
  const total = Array.isArray(checkIns.data) ? rows.length : (checkIns.data?.total ?? rows.length);
  const filtered = rows.filter((record) => {
    if (status !== "ALL" && record.status !== status) return false;
    const text = [
      recordName(record),
      record.employee?.email,
      record.staff?.email,
      record.branchName,
      record.branch?.name,
      record.userId,
    ]
      .join(" ")
      .toLocaleLowerCase("vi-VN");
    return text.includes(search.trim().toLocaleLowerCase("vi-VN"));
  });
  const metrics = [
    {
      label: "Tổng lượt",
      value: summary.data?.totalCheckIns ?? summary.data?.total ?? rows.length,
      Icon: UsersRound,
      tone: "total",
    },
    {
      label: "Trong 200m",
      value: summary.data?.statuses?.IN_RANGE ?? rows.filter((r) => r.status === "IN_RANGE").length,
      Icon: CheckCircle2,
      tone: "valid",
    },
    {
      label: "Ngoài 200m",
      value:
        summary.data?.statuses?.OUT_OF_RANGE ??
        rows.filter((r) => r.status === "OUT_OF_RANGE").length,
      Icon: ShieldAlert,
      tone: "review",
    },
    {
      label: "Coin đã cộng",
      value: summary.data?.totalCoinsAwarded ?? rows.reduce((n, r) => n + r.coinsEarned, 0),
      Icon: Coins,
      tone: "coin",
    },
  ];
  if (!allowed)
    return <p role="alert">Chỉ super admin có quyền xem chấm công và cấu hình tọa độ.</p>;
  return (
    <div className="mm-att-admin">
      <section className="mm-att-admin-hero">
        <div className="mm-att-admin-hero-content">
          <span className="mm-att-admin-eyebrow">
            <ShieldCheck size={15} /> NHÂN SỰ · CHẤM CÔNG
          </span>
          <h2>Chấm công & ví coin</h2>
          <p>Quản lý điểm danh nhân viên, xác thực GPS và số coin được cộng theo ngày.</p>
        </div>
        <button
          type="button"
          disabled={checkIns.isFetching || summary.isFetching}
          onClick={() => {
            void checkIns.refetch();
            void summary.refetch();
            void branches.refetch();
          }}
        >
          <RefreshCw size={16} aria-hidden="true" /> Tải dữ liệu
        </button>
      </section>
      <div className="mm-att-admin-summary" aria-label="Thống kê điểm danh">
        {metrics.map(({ label, value, Icon, tone }) => (
          <div key={label} className={`mm-att-admin-metric is-${tone}`}>
            <div className="mm-att-admin-metric-top">
              <span>{label}</span>
              <span className="mm-att-admin-metric-icon">
                <Icon size={19} aria-hidden="true" />
              </span>
            </div>
            <strong>{summary.isPending ? "—" : value.toLocaleString("vi-VN")}</strong>
          </div>
        ))}
      </div>
      <section className="mm-att-admin-panel" aria-labelledby="mm-att-list-heading">
        <div className="mm-att-admin-head">
          <div>
            <span className="mm-att-admin-eyebrow">DANH SÁCH CHẤM CÔNG</span>
            <h3 id="mm-att-list-heading">Lượt check-in theo ngày</h3>
            <p>Mỗi nhân viên tối đa một lượt/ngày · Ảnh selfie có thể xem riêng.</p>
          </div>
          <label className="mm-att-admin-date-label">
            <span>
              <CalendarDays size={15} /> Ngày cần xem
            </span>
            <input
              aria-label="Ngày cần xem"
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
        <div className="mm-att-admin-filters">
          <label className="mm-att-admin-search">
            <Search size={17} />
            <input
              aria-label="Tìm nhân viên"
              placeholder="Tên nhân viên, cơ sở..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="mm-att-admin-status-filter">
            <span>Trạng thái</span>
            <select
              aria-label="Lọc trạng thái điểm danh"
              value={status}
              onChange={(event) => setStatus(event.target.value as AttendanceStatus | "ALL")}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="IN_RANGE">Đủ điều kiện 200m</option>
              <option value="OUT_OF_RANGE">Ngoài phạm vi 200m</option>
              <option value="LOCATION_UNAVAILABLE">Không có GPS</option>
              <option value="LOCATION_NOT_CONFIGURED">Chưa cấu hình tọa độ</option>
            </select>
          </label>
          <span className="mm-att-admin-showing" role="status">
            Hiển thị <strong>{filtered.length}</strong> lượt · {displayAttendanceDate(date)}
          </span>
        </div>
        {deleteNotice && (
          <p className="mm-att-admin-delete-success" role="status">
            <CheckCircle2 size={16} aria-hidden="true" /> {deleteNotice}
          </p>
        )}
        {checkIns.isPending ? (
          <p role="status" className="mm-att-admin-empty">
            Đang tải lịch sử điểm danh...
          </p>
        ) : checkIns.isError ? (
          <p role="alert" className="mm-att-admin-empty">
            Chưa tải được dữ liệu. Hãy thử tải lại.
          </p>
        ) : filtered.length === 0 ? (
          <p className="mm-att-admin-empty">Không có lượt check-in phù hợp trong ngày này.</p>
        ) : (
          <div className="mm-att-admin-records">
            {filtered.map((record) => (
              <article key={record.id} className="mm-att-admin-record">
                <div className="mm-att-admin-record-header">
                  <div className="mm-att-admin-person">
                    <span className="mm-att-admin-avatar" aria-hidden="true">
                      {recordName(record).trim().slice(0, 1).toLocaleUpperCase("vi-VN")}
                    </span>
                    <div>
                      <strong>{recordName(record)}</strong>
                      <small>
                        <Clock3 size={13} aria-hidden="true" />{" "}
                        {formattedCheckInTime(record.checkedInAt ?? record.createdAt)}
                      </small>
                    </div>
                  </div>
                  <div className="mm-att-admin-record-actions">
                    <span
                      className={
                        "mm-att-admin-status " +
                        (record.status === "IN_RANGE" ? "is-valid" : "is-review")
                      }
                    >
                      {record.status === "IN_RANGE" ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <ShieldAlert size={15} />
                      )}
                      {attendanceLabel(record.status)}
                    </span>
                    <button
                      type="button"
                      className="mm-att-admin-delete-trigger"
                      aria-label={`Xóa lượt check-in của ${recordName(record)}`}
                      title="Xóa lượt check-in để điểm danh lại"
                      disabled={deleting}
                      onClick={() => {
                        setDeleteTarget(record);
                        setDeleteError("");
                        setDeleteNotice("");
                      }}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="mm-att-admin-record-details">
                  <div className="mm-att-admin-info">
                    <span>
                      <MapPin size={15} aria-hidden="true" /> Cơ sở
                    </span>
                    <strong>{record.branchName ?? record.branch?.name ?? "Mộc Maria"}</strong>
                  </div>
                  <div className="mm-att-admin-info">
                    <span>
                      <LocateFixed size={15} aria-hidden="true" /> Khoảng cách GPS
                    </span>
                    <strong>
                      {typeof record.distanceMeters === "number"
                        ? Math.round(record.distanceMeters) + " m"
                        : "Chưa xác định"}
                    </strong>
                    <small>
                      Độ chính xác:{" "}
                      {typeof record.accuracyMeters === "number"
                        ? Math.round(record.accuracyMeters) + " m"
                        : "Không có"}
                    </small>
                  </div>
                  <div className="mm-att-admin-info mm-att-admin-coins">
                    <span>
                      <Coins size={15} aria-hidden="true" /> Coin được cộng
                    </span>
                    <strong>+{record.coinsEarned} coin</strong>
                  </div>
                </div>
                {attendanceSelfieUrl(record.selfieUrl) ? (
                  <a
                    href={attendanceSelfieUrl(record.selfieUrl)!}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="mm-att-admin-selfie"
                  >
                    <Camera size={16} aria-hidden="true" /> Xem ảnh selfie
                  </a>
                ) : (
                  <span className="mm-att-admin-no-selfie">
                    <Camera size={16} aria-hidden="true" /> Chưa gửi selfie
                  </span>
                )}
              </article>
            ))}
          </div>
        )}
        <div className="mm-att-admin-pagination">
          <span>
            Trang {page}/{Math.max(1, Math.ceil(total / 30))} · Tổng {total} lượt
            <small>Bộ lọc tìm kiếm áp dụng trên trang hiện tại.</small>
          </span>
          <div className="mm-att-admin-page-actions">
            <button
              type="button"
              disabled={page <= 1 || checkIns.isFetching}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={16} /> Trước
            </button>
            <button
              type="button"
              disabled={page * 30 >= total || checkIns.isFetching}
              onClick={() => setPage(page + 1)}
            >
              Sau <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      {deleteTarget && (
        <div
          className="mm-att-admin-delete-overlay"
          role="presentation"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="mm-att-delete-title"
            aria-describedby="mm-att-delete-detail"
            className="mm-att-admin-delete-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="mm-att-admin-delete-symbol">
              <Trash2 size={22} aria-hidden="true" />
            </span>
            <h3 id="mm-att-delete-title">Xóa lượt điểm danh?</h3>
            <p id="mm-att-delete-detail">
              Xóa lượt check-in ngày{" "}
              <strong>{displayAttendanceDate(deleteTarget.localDate ?? date)}</strong> của{" "}
              <strong>{recordName(deleteTarget)}</strong> để có thể check-in lại.
              {deleteTarget.coinsEarned > 0 && (
                <>
                  {" "}
                  Hệ thống sẽ hoàn tác <strong>{deleteTarget.coinsEarned} coin</strong> đã cộng nếu
                  ví còn đủ số dư.
                </>
              )}
            </p>
            <p className="mm-att-admin-delete-hint">
              Thao tác được ghi lại trong nhật ký quản trị. Ảnh selfie cũ không còn gắn với lượt
              check-in mới.
            </p>
            {deleteError && (
              <p role="alert" className="mm-att-admin-delete-error">
                {deleteError}
              </p>
            )}
            <div className="mm-att-admin-delete-buttons">
              <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)}>
                Quay lại
              </button>
              <button
                type="button"
                disabled={deleting}
                className="is-danger"
                onClick={() => void removeCheckIn()}
              >
                <Trash2 size={15} aria-hidden="true" /> {deleting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
      <section className="mm-att-admin-panel" aria-labelledby="mm-att-center">
        <div className="mm-att-admin-config-head">
          <span className="mm-att-admin-config-icon">
            <MapPin size={20} />
          </span>
          <div>
            <span className="mm-att-admin-eyebrow">THIẾT LẬP CƠ SỞ</span>
            <h3 id="mm-att-center">Cấu hình tọa độ GPS</h3>
            <p>Phạm vi hợp lệ 200m, áp dụng cho lượt check-in mới.</p>
          </div>
        </div>
        {branches.isPending ? (
          <p role="status">Đang tải cơ sở...</p>
        ) : branches.isError ? (
          <p role="alert">Không tải được cơ sở.</p>
        ) : !selectedBranch ? (
          <p>Chưa có cơ sở.</p>
        ) : (
          <>
            <label className="mm-att-admin-branch-label">
              Chọn cơ sở
              <select
                value={selectedBranch.id}
                onChange={(event) => setBranchId(event.target.value)}
              >
                {branches.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            {!isConfigured(selectedBranch) && (
              <p className="mm-att-admin-warning" role="status">
                Cần cấu hình tọa độ cơ sở để kiểm tra phạm vi 200m.
              </p>
            )}
            <form
              className="mm-att-admin-coordinate-form"
              onSubmit={(event) => void saveCenter(event)}
            >
              <label>
                Vĩ độ{" "}
                <input
                  aria-label="Vĩ độ cơ sở"
                  required
                  inputMode="decimal"
                  value={latitude}
                  onChange={(event) =>
                    selectedBranch &&
                    setDraft({ id: selectedBranch.id, latitude: event.target.value, longitude })
                  }
                />
              </label>
              <label>
                Kinh độ{" "}
                <input
                  aria-label="Kinh độ cơ sở"
                  required
                  inputMode="decimal"
                  value={longitude}
                  onChange={(event) =>
                    selectedBranch &&
                    setDraft({ id: selectedBranch.id, latitude, longitude: event.target.value })
                  }
                />
              </label>
              <button type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu tọa độ"}
              </button>
            </form>
            {feedback && (
              <p role={error ? "alert" : "status"} className={error ? "mm-att-admin-warning" : ""}>
                {feedback}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
