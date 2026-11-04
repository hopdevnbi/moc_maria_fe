"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  Coins,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  attendanceLabel,
  attendanceRows,
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
function selfieUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
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
    },
    {
      label: "Trong 200m",
      value: summary.data?.statuses?.IN_RANGE ?? rows.filter((r) => r.status === "IN_RANGE").length,
      Icon: CheckCircle2,
    },
    {
      label: "Ngoài 200m",
      value:
        summary.data?.statuses?.OUT_OF_RANGE ??
        rows.filter((r) => r.status === "OUT_OF_RANGE").length,
      Icon: ShieldAlert,
    },
    {
      label: "Coin đã cộng",
      value: summary.data?.totalCoinsAwarded ?? rows.reduce((n, r) => n + r.coinsEarned, 0),
      Icon: Coins,
    },
  ];
  if (!allowed)
    return <p role="alert">Chỉ super admin có quyền xem chấm công và cấu hình tọa độ.</p>;
  return (
    <div className="mm-att-admin">
      <section className="mm-att-admin-hero">
        <div>
          <span>NHÂN SỰ · CHẤM CÔNG</span>
          <h2>Chấm công & ví coin</h2>
          <p>Theo dõi điểm danh, khoảng cách GPS, selfie và cấu hình tọa độ Mộc Maria.</p>
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
          <RefreshCw size={18} /> Tải lại
        </button>
      </section>
      <div className="mm-att-admin-summary" aria-label="Thống kê điểm danh">
        {metrics.map(({ label, value, Icon }) => (
          <div key={label} className="mm-att-admin-metric">
            <Icon size={21} aria-hidden="true" />
            <span>{label}</span>
            <strong>{summary.isPending ? "—" : value.toLocaleString("vi-VN")}</strong>
          </div>
        ))}
      </div>
      <section className="mm-att-admin-panel" aria-labelledby="mm-att-list-heading">
        <div className="mm-att-admin-head">
          <div>
            <span>DANH SÁCH CHẤM CÔNG</span>
            <h3 id="mm-att-list-heading">Lượt check-in theo ngày</h3>
          </div>
          <label>
            Ngày cần xem{" "}
            <input
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
          <label>
            Trạng thái
            <select
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
        </div>
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
                <div className="mm-att-admin-person">
                  <span className="mm-att-admin-avatar" aria-hidden="true">
                    {recordName(record).slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{recordName(record)}</strong>
                    <small>{formattedCheckInTime(record.checkedInAt ?? record.createdAt)}</small>
                  </div>
                </div>
                <div className="mm-att-admin-record-details">
                  <p>
                    <MapPin size={16} />{" "}
                    {record.branchName ?? record.branch?.name ?? "Cơ sở Mộc Maria"}
                  </p>
                  <span
                    className={
                      "mm-att-admin-status " +
                      (record.status === "IN_RANGE" ? "is-valid" : "is-review")
                    }
                  >
                    {attendanceLabel(record.status)}
                  </span>
                  <p>
                    Khoảng cách:{" "}
                    <strong>
                      {typeof record.distanceMeters === "number"
                        ? Math.round(record.distanceMeters) + "m"
                        : "Chưa xác định"}
                    </strong>
                  </p>
                  <p>
                    Độ chính xác GPS:{" "}
                    <strong>
                      {typeof record.accuracyMeters === "number"
                        ? Math.round(record.accuracyMeters) + "m"
                        : "Chưa có"}
                    </strong>
                  </p>
                  <p className="mm-att-admin-coins">
                    <Coins size={16} /> +{record.coinsEarned} coin
                  </p>
                </div>
                {selfieUrl(record.selfieUrl) ? (
                  <a
                    href={selfieUrl(record.selfieUrl)!}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="mm-att-admin-selfie"
                  >
                    <Camera size={16} /> Xem ảnh selfie
                  </a>
                ) : (
                  <span className="mm-att-admin-no-selfie">
                    <Camera size={16} /> Chưa gửi selfie
                  </span>
                )}
              </article>
            ))}
          </div>
        )}
        <div className="mm-att-admin-pagination">
          <span>
            Trang {page} / {Math.max(1, Math.ceil(total / 30))} · {total} lượt. Bộ lọc áp dụng trong
            trang.
          </span>
          <button
            type="button"
            disabled={page <= 1 || checkIns.isFetching}
            onClick={() => setPage(page - 1)}
          >
            Trước
          </button>
          <button
            type="button"
            disabled={page * 30 >= total || checkIns.isFetching}
            onClick={() => setPage(page + 1)}
          >
            Sau
          </button>
        </div>{" "}
      </section>
      <section className="mm-att-admin-panel" aria-labelledby="mm-att-center">
        <h3 id="mm-att-center">Cấu hình tọa độ cơ sở · Bán kính 200m</h3>
        {branches.isPending ? (
          <p role="status">Đang tải cơ sở...</p>
        ) : branches.isError ? (
          <p role="alert">Không tải được cơ sở.</p>
        ) : !selectedBranch ? (
          <p>Chưa có cơ sở.</p>
        ) : (
          <>
            <label>
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
