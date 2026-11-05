"use client";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  Coins,
  LocateFixed,
  MapPin,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { RoleName } from "@/features/auth/auth.types";
import { ApiError } from "@/features/auth/auth-api";
import { prepareAttendanceSelfie } from "./selfie-image";
import {
  attendanceLabel,
  attendanceSelfieUrl,
  displayAttendanceDate,
  formattedCheckInTime,
  hcmDate,
  isConfigured,
  isUsableLocation,
  metersBetween,
  mayAutoCheckIn,
  radiusMeters,
  staffBranches,
  type StaffAttendanceMe,
  type AttendanceRecord,
} from "./data";
import "./staff-attendance.css";

const staffRoles: RoleName[] = ["BRANCH_MANAGER", "RECEPTIONIST", "THERAPIST", "DOCTOR_CONSULTANT"];
export function canStaffCheckIn(roles: readonly RoleName[]) {
  return roles.some((role) => staffRoles.includes(role));
}
type LocationPoint = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestamp: number;
};
function locationError(error: unknown): string {
  if (error instanceof Error && error.message === "GPS_IMPRECISE")
    return "GPS chưa đủ chính xác hoặc đã cũ. Chưa ghi nhận điểm danh; hãy ra nơi thoáng rồi thử lại.";
  const code = (error as { code?: number })?.code;
  if (code === 1) return "Quyền GPS bị từ chối. Hãy cấp quyền vị trí trong trình duyệt để thử lại.";
  if (code === 3) return "GPS quá thời gian chờ. Hãy ra nơi thoáng hơn rồi thử lại.";
  return "Chưa lấy được GPS. Có thể thử lại hoặc ghi nhận không có GPS (+0 coin).";
}
async function getLocation(): Promise<LocationPoint> {
  if (!navigator.geolocation) throw new Error("GPS_UNAVAILABLE");
  const p = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 12000,
    }),
  );
  if (
    !isUsableLocation(
      {
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy,
        timestamp: p.timestamp,
      },
      Date.now(),
    )
  )
    throw new Error("GPS_IMPRECISE");
  return {
    latitude: p.coords.latitude,
    longitude: p.coords.longitude,
    accuracyMeters: p.coords.accuracy,
    timestamp: p.timestamp,
  };
}

export function StaffAttendanceCard({ standalone = false }: { standalone?: boolean }) {
  const { user } = useAuth();
  return <AttendanceSession key={user?.id ?? "guest"} standalone={standalone} />;
}

function AttendanceSession({ standalone }: { standalone: boolean }) {
  const { user, authFetch } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  // The server also permits an active staff profile without one of the usual roles.
  const eligible = !!user && user.isActive && (standalone || canStaffCheckIn(user.roles));
  const [day, setDay] = useState(() => hcmDate());
  const [branchId, setBranchId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hasError, setHasError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const selfieLocked = useRef(false);
  const [auto, setAuto] = useState(false);
  const locked = useRef(false);
  const gpsPending = useRef(false);
  const alive = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const [zeroCheckIn, setZeroCheckIn] = useState<{
    branchId: string;
    point?: LocationPoint;
  } | null>(null);
  const lastNotice = useRef(0);
  useEffect(() => {
    alive.current = true;
    const updateDay = () => setDay(hcmDate());
    const timer = setInterval(updateDay, 1000);
    window.addEventListener("focus", updateDay);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", updateDay);
    };
  }, []);
  const query = useQuery({
    queryKey: ["staff-attendance", user?.id, day],
    queryFn: ({ signal }) =>
      authFetch<StaffAttendanceMe>("/staff-attendance/me", { cache: "no-store", signal }),
    enabled: eligible,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const branches = staffBranches(query.data);
  const branch = branches.find((b) => b.id === branchId) ?? branches[0];
  const today = query.data?.today ?? null;
  const configured = isConfigured(branch);

  const checkIn = useCallback(
    async (id: string, point?: LocationPoint) => {
      if (locked.current || gpsPending.current || !alive.current) return;
      if (query.data?.localDate !== hcmDate()) {
        setDay(hcmDate());
        setBusy(false);
        setFeedback("Đã sang ngày mới. Hãy chờ tải lại trạng thái rồi check-in.");
        return;
      }
      if (point && !isUsableLocation({ ...point, accuracy: point.accuracyMeters }, Date.now())) {
        setZeroCheckIn(null);
        setBusy(false);
        setHasError(true);
        setFeedback(locationError(new Error("GPS_IMPRECISE")));
        return;
      }
      locked.current = true;
      setBusy(true);
      setHasError(false);
      setFeedback("");
      try {
        const result = await authFetch<StaffAttendanceMe>("/staff-attendance/check-ins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branchId: id,
            ...(point
              ? {
                  latitude: point.latitude,
                  longitude: point.longitude,
                  accuracyMeters: point.accuracyMeters,
                }
              : {}),
          }),
        });
        const record = result.today;
        if (!alive.current) return;
        client.setQueryData(["staff-attendance", userId, result.localDate], result);
        setZeroCheckIn(null);
        setAuto(false);
        setFeedback(
          result.alreadyCheckedIn
            ? "Bạn đã check-in hôm nay. Hệ thống giữ nguyên lượt điểm danh và số coin."
            : !record
              ? "Đã gửi yêu cầu. Hãy tải lại trạng thái để xác nhận."
              : record.status === "IN_RANGE"
                ? "Check-in thành công. Đã cộng " + record.coinsEarned + " coin."
                : "Đã ghi nhận check-in: " + attendanceLabel(record.status) + ". Lượt này +0 coin.",
        );
      } catch (error) {
        if (!alive.current) return;
        setHasError(true);
        setAuto(false);
        setUncertain(true);
        setFeedback(error instanceof Error ? error.message : "Không thể check-in. Hãy thử lại.");
      } finally {
        await client.invalidateQueries({ queryKey: ["staff-attendance", userId] });
        locked.current = false;
        if (alive.current) setBusy(false);
      }
    },
    [authFetch, client, userId, query.data?.localDate],
  );

  async function manual() {
    if (
      !branch ||
      busy ||
      today ||
      locked.current ||
      gpsPending.current ||
      uncertain ||
      query.isFetching
    )
      return;
    gpsPending.current = true;
    const startedDay = hcmDate();
    setZeroCheckIn(null);
    setBusy(true);
    setHasError(false);
    setFeedback("Đang xin quyền truy cập vị trí GPS...");
    try {
      const point = await getLocation();
      gpsPending.current = false;
      if (!alive.current) return;
      if (startedDay !== hcmDate()) {
        setDay(hcmDate());
        setBusy(false);
        setFeedback("Đã sang ngày mới. Hãy kiểm tra ngày điểm danh rồi thử lại.");
        return;
      }
      if (
        !configured ||
        metersBetween({ latitude: branch.latitude!, longitude: branch.longitude! }, point) >
          radiusMeters(branch)
      ) {
        setBusy(false);
        setZeroCheckIn({ branchId: branch.id, point });
        return;
      }
      await checkIn(branch.id, point);
    } catch (error) {
      gpsPending.current = false;
      if (!alive.current) return;
      setBusy(false);
      setHasError(true);
      setFeedback(locationError(error));
    }
  }

  useEffect(() => {
    if (
      !auto ||
      !branch ||
      !configured ||
      today ||
      busy ||
      uncertain ||
      query.isFetching ||
      query.isError ||
      zeroCheckIn
    )
      return;
    if (!navigator.geolocation) return;
    let watchId: number | undefined;
    let disposed = false;
    function stop() {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      watchId = undefined;
    }
    function watch() {
      stop();
      if (disposed || document.visibilityState !== "visible") return;
      watchId = navigator.geolocation.watchPosition(
        (p) => {
          if (
            disposed ||
            document.visibilityState !== "visible" ||
            locked.current ||
            gpsPending.current
          )
            return;
          const reading = {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: p.coords.accuracy,
            timestamp: p.timestamp,
          };
          if (mayAutoCheckIn(branch!, reading, Date.now())) {
            stop();
            setAuto(false);
            void checkIn(branch!.id, {
              latitude: reading.latitude,
              longitude: reading.longitude,
              accuracyMeters: reading.accuracy,
              timestamp: reading.timestamp,
            });
          } else if (Date.now() - lastNotice.current > 15000) {
            lastNotice.current = Date.now();
            setFeedback(
              "Đang theo dõi vị trí khi trang mở. Chỉ tự check-in khi GPS xác nhận trong 200m.",
            );
          }
        },
        (error) => {
          if (disposed) return;
          setHasError(true);
          setFeedback(locationError(error));
          if (error.code === 1) setAuto(false);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
      );
    }
    document.addEventListener("visibilitychange", watch);
    watch();
    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", watch);
    };
  }, [
    auto,
    branch,
    configured,
    today,
    busy,
    checkIn,
    uncertain,
    query.isFetching,
    query.isError,
    zeroCheckIn,
  ]);

  async function uploadSelfie(event: ChangeEvent<HTMLInputElement>) {
    const original = event.target.files?.[0];
    event.target.value = "";
    if (!today || !original || uploading || selfieLocked.current) return;
    selfieLocked.current = true;
    setUploading(true);
    setHasError(false);
    setFeedback("Đang xử lý và tải ảnh selfie...");
    try {
      const file = await prepareAttendanceSelfie(original);
      if (!alive.current) return;
      const form = new FormData();
      form.append("file", file, file.name);
      const updated = await authFetch<AttendanceRecord>(
        "/staff-attendance/check-ins/" + encodeURIComponent(today.id) + "/selfie",
        {
          method: "POST",
          cache: "no-store",
          body: form,
        },
      );
      if (!updated?.selfieUrl)
        throw new Error("Máy chủ chưa xác nhận ảnh đã lưu. Hãy kiểm tra lại trạng thái.");
      // Show the confirmed CDN URL immediately, even if the phone loses focus
      // while the camera/gallery is open or the following refetch is delayed.
      client.setQueryData<StaffAttendanceMe>(["staff-attendance", user?.id, day], (previous) =>
        previous?.today?.id === updated.id
          ? { ...previous, today: { ...previous.today, ...updated } }
          : previous,
      );
      setFeedback("Ảnh selfie đã lưu thành công.");
      await client
        .invalidateQueries({ queryKey: ["staff-attendance", user?.id] })
        .catch(() => undefined);
    } catch (error) {
      setHasError(true);
      setFeedback(
        error instanceof ApiError && error.status === 409
          ? "Ảnh đã được gửi ở thiết bị khác. Đang tải lại trạng thái để kiểm tra."
          : error instanceof Error
            ? error.message
            : "Chưa tải ảnh lên được. Hãy thử lại.",
      );
      if (error instanceof ApiError && error.status === 409) {
        await client
          .invalidateQueries({ queryKey: ["staff-attendance", user?.id] })
          .catch(() => undefined);
      }
    } finally {
      selfieLocked.current = false;
      setUploading(false);
    }
  }

  if (!eligible) return null;
  return (
    <section className="mm-att-card" id="cham-cong" aria-labelledby="mm-att-title">
      <header className="mm-att-header">
        <div>
          <span className="mm-att-eyebrow">MỘC MARIA · NHÂN VIÊN & KTV</span>
          <h2 id="mm-att-title">Điểm danh hôm nay</h2>
          <p>Check-in một lần/ngày tại cơ sở. Trong 200m được cộng 5 coin.</p>
        </div>
        <div className="mm-att-wallet" aria-label="Số dư coin">
          <Coins size={24} />
          <span>VÍ COIN</span>
          <strong>{query.data?.wallet.balance ?? "—"}</strong>
        </div>
      </header>
      {query.isPending ? (
        <p role="status" className="mm-att-feedback">
          Đang tải dữ liệu điểm danh...
        </p>
      ) : query.isError ? (
        <div className="mm-att-feedback is-error" role="alert">
          {query.error instanceof ApiError && query.error.status === 403
            ? "Check-in dành cho nhân viên và KTV có hồ sơ đang hoạt động. Tài khoản hiện tại chưa được cấp quyền điểm danh."
            : "Chưa tải được dữ liệu check-in."}
          <button type="button" onClick={() => void query.refetch()}>
            <RefreshCw size={16} /> Tải lại
          </button>
        </div>
      ) : (
        <>
          <div className="mm-att-location">
            <MapPin size={20} />
            <div>
              <strong>{branch?.name ?? "Chưa được phân công cơ sở"}</strong>
              <small>{branch?.address || "Cơ sở Mộc Maria"}</small>
              <small>
                {configured
                  ? "Phạm vi hợp lệ: " + radiusMeters(branch!) + "m"
                  : "Cần cấu hình tọa độ cơ sở"}
              </small>
            </div>
            {branches.length > 1 && (
              <label className="mm-att-branch-select">
                <span>Chọn cơ sở</span>
                <select
                  value={branch?.id ?? ""}
                  disabled={busy}
                  onChange={(event) => {
                    setBranchId(event.target.value);
                    setZeroCheckIn(null);
                    setAuto(false);
                  }}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {!branch ? (
            <p className="mm-att-warning" role="status">
              Chưa có cơ sở đang hoạt động. Vui lòng liên hệ quản trị để được hỗ trợ.
            </p>
          ) : (
            !configured && (
              <p className="mm-att-warning" role="status">
                Cơ sở chưa cấu hình tọa độ. Bạn vẫn có thể check-in, nhưng chưa đủ điều kiện nhận
                coin theo GPS.
              </p>
            )
          )}
          {today ? (
            <div className="mm-att-done">
              <CheckCircle2 size={27} />
              <div>
                <strong>Đã check-in hôm nay · {attendanceLabel(today.status)}</strong>
                <p>{formattedCheckInTime(today.checkedInAt ?? today.createdAt)}</p>
                {typeof today.distanceMeters === "number" && (
                  <p>Cách cơ sở {Math.round(today.distanceMeters)}m</p>
                )}
                <span>{today.coinsEarned > 0 ? "+" + today.coinsEarned + " coin" : "+0 coin"}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="mm-att-actions">
                <button
                  className="mm-att-primary"
                  type="button"
                  disabled={!branch || busy || query.isFetching || uncertain || !!zeroCheckIn}
                  onClick={() => void manual()}
                >
                  <LocateFixed size={20} /> {busy ? "Đang ghi nhận..." : "Check-in bằng GPS"}
                </button>
                <button
                  className="mm-att-secondary"
                  type="button"
                  disabled={!branch || busy || query.isFetching || uncertain || !!zeroCheckIn}
                  onClick={() => {
                    if (branch) {
                      setAuto(false);
                      setZeroCheckIn({ branchId: branch.id });
                    }
                  }}
                >
                  Check-in không có GPS (+0 coin)
                </button>
              </div>
              {zeroCheckIn && (
                <div
                  className="mm-att-feedback mm-att-confirm"
                  role="group"
                  aria-label="Xác nhận điểm danh không nhận coin"
                >
                  <strong>Lượt này +0 coin</strong>
                  <p>
                    {!configured
                      ? "Cơ sở chưa có tọa độ."
                      : zeroCheckIn.point
                        ? "Bạn đang ngoài phạm vi cơ sở."
                        : "Bạn đang chọn điểm danh không có GPS."}{" "}
                    Chỉ có một lượt mỗi ngày; sau khi ghi nhận, bạn không thể check-in lại để nhận
                    coin hôm nay.
                  </p>
                  <div>
                    <button
                      type="button"
                      disabled={busy || query.isFetching || uncertain}
                      onClick={() => void checkIn(zeroCheckIn.branchId, zeroCheckIn.point)}
                    >
                      Xác nhận điểm danh +0 coin
                    </button>
                    <button type="button" disabled={busy} onClick={() => setZeroCheckIn(null)}>
                      Quay lại
                    </button>
                  </div>
                </div>
              )}
              {uncertain && (
                <div role="alert" className="mm-att-feedback is-error">
                  Cần kiểm tra lại trạng thái để tránh ghi nhận nhầm sau lỗi kết nối.
                  <button
                    type="button"
                    disabled={query.isFetching}
                    onClick={async () => {
                      const result = await query.refetch();
                      if (!result.isError) {
                        setUncertain(false);
                        setZeroCheckIn(null);
                      }
                    }}
                  >
                    Kiểm tra trạng thái
                  </button>
                </div>
              )}
              <p className="mm-att-small">
                Ngoài 200m vẫn check-in được; quản trị sẽ thấy trạng thái không đủ phạm vi và bạn
                nhận 0 coin.
              </p>
              <label className="mm-att-auto">
                <input
                  type="checkbox"
                  checked={auto}
                  disabled={
                    !configured || !branch || busy || query.isFetching || uncertain || !!zeroCheckIn
                  }
                  onChange={(event) => {
                    if (event.target.checked && !navigator.geolocation) {
                      setHasError(true);
                      setFeedback("Trình duyệt không hỗ trợ GPS. Hãy check-in thủ công.");
                      return;
                    }
                    setAuto(event.target.checked);
                    setHasError(false);
                    setFeedback(
                      event.target.checked
                        ? "Đã bật theo dõi vị trí khi trang đang mở."
                        : "Đã dừng theo dõi GPS.",
                    );
                  }}
                />
                <span>
                  <strong>Tự check-in khi đến cơ sở</strong>
                  <small>
                    Chỉ hoạt động lúc trang đang mở. Đóng ứng dụng hoặc chuyển sang nền sẽ dừng theo
                    dõi GPS.
                  </small>
                </span>
              </label>
            </>
          )}
          {today && (
            <div
              className={
                "mm-att-selfie" + (attendanceSelfieUrl(today.selfieUrl) ? " has-photo" : "")
              }
            >
              <div>
                <h3>
                  <Camera size={18} /> Ảnh selfie xác nhận
                </h3>
                <p>
                  {today.selfieUrl
                    ? `Ảnh điểm danh ngày ${displayAttendanceDate(today.localDate ?? day)} đã lưu trên CDN.`
                    : "Chụp ảnh selfie sau check-in để bổ sung minh chứng."}
                </p>
                {attendanceSelfieUrl(today.selfieUrl) && (
                  <a
                    href={attendanceSelfieUrl(today.selfieUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Xem selfie đã gửi
                  </a>
                )}
              </div>
              {attendanceSelfieUrl(today.selfieUrl) && (
                <figure className="mm-att-selfie-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Render a private dated CDN selfie directly without the public Next image optimizer. */}
                  <img
                    src={attendanceSelfieUrl(today.selfieUrl)!}
                    alt={`Ảnh selfie điểm danh ngày ${displayAttendanceDate(today.localDate ?? day)}`}
                    width="720"
                    height="960"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <figcaption>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    Một ảnh xác nhận · {displayAttendanceDate(today.localDate ?? day)}
                  </figcaption>
                </figure>
              )}
              {!today.selfieUrl && (
                <div className="mm-att-upload-actions">
                  <label className="mm-att-upload">
                    <Camera size={17} />
                    {uploading ? "Đang tải ảnh..." : "Chụp selfie"}
                    <input
                      aria-label="Chụp selfie bằng camera trước"
                      type="file"
                      accept="image/*"
                      capture="user"
                      disabled={uploading}
                      onChange={(event) => void uploadSelfie(event)}
                    />
                  </label>
                  <label className="mm-att-upload mm-att-upload-secondary">
                    Chọn ảnh có sẵn
                    <input
                      aria-label="Chọn ảnh selfie từ thư viện"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      disabled={uploading}
                      onChange={(event) => void uploadSelfie(event)}
                    />
                  </label>
                  <small>Ảnh được tối ưu trên máy, sau đó lưu lên CDN. Tối đa 5 MB.</small>
                </div>
              )}
            </div>
          )}
        </>
      )}
      {feedback && (
        <p
          role={hasError ? "alert" : "status"}
          className={hasError ? "mm-att-feedback is-error" : "mm-att-feedback"}
        >
          {feedback}
        </p>
      )}
      <p className="mm-att-trust">
        <ShieldCheck size={16} /> Máy chủ quyết định coin và ngăn chấm công trùng ngày.
      </p>
    </section>
  );
}
