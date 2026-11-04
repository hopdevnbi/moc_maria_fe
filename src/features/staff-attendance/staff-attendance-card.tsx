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
import { prepareChatImage } from "@/features/mobile/chat-image";
import {
  attendanceLabel,
  formattedCheckInTime,
  hcmDate,
  isConfigured,
  mayAutoCheckIn,
  radiusMeters,
  staffBranches,
  type StaffAttendanceMe,
} from "./data";
import "./staff-attendance.css";

const staffRoles: RoleName[] = ["BRANCH_MANAGER", "RECEPTIONIST", "THERAPIST", "DOCTOR_CONSULTANT"];
export function canStaffCheckIn(roles: readonly RoleName[]) {
  return roles.some((role) => staffRoles.includes(role));
}
type LocationPoint = { latitude: number; longitude: number; accuracyMeters: number };
function locationError(error: unknown): string {
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
  if (Date.now() - p.timestamp > 30000) throw new Error("GPS_STALE");
  return {
    latitude: p.coords.latitude,
    longitude: p.coords.longitude,
    accuracyMeters: p.coords.accuracy,
  };
}

export function StaffAttendanceCard() {
  const { user, authFetch } = useAuth();
  const client = useQueryClient();
  const eligible = !!user && canStaffCheckIn(user.roles);
  const [day, setDay] = useState(() => hcmDate());
  const [branchId, setBranchId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hasError, setHasError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [auto, setAuto] = useState(false);
  const locked = useRef(false);
  const lastNotice = useRef(0);
  useEffect(() => {
    const timer = setInterval(() => setDay(hcmDate()), 60000);
    return () => clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: ["staff-attendance", user?.id, day],
    queryFn: () => authFetch<StaffAttendanceMe>("/staff-attendance/me", { cache: "no-store" }),
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
      if (locked.current) return;
      locked.current = true;
      setBusy(true);
      setHasError(false);
      setFeedback("");
      try {
        const result = await authFetch<StaffAttendanceMe>("/staff-attendance/check-ins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branchId: id, ...point }),
        });
        const record = result.today;
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
        setHasError(true);
        setAuto(false);
        setFeedback(error instanceof Error ? error.message : "Không thể check-in. Hãy thử lại.");
      } finally {
        await client.invalidateQueries({ queryKey: ["staff-attendance", user?.id] });
        locked.current = false;
        setBusy(false);
      }
    },
    [authFetch, client, user?.id],
  );

  async function manual() {
    if (!branch || busy || today) return;
    setBusy(true);
    setHasError(false);
    setFeedback("Đang xin quyền truy cập vị trí GPS...");
    try {
      const point = await getLocation();
      setBusy(false);
      await checkIn(branch.id, point);
    } catch (error) {
      setBusy(false);
      setHasError(true);
      setFeedback(locationError(error));
    }
  }

  useEffect(() => {
    if (!auto || !branch || !configured || today || busy) return;
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
          if (disposed || document.visibilityState !== "visible" || locked.current) return;
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
  }, [auto, branch, configured, today, busy, checkIn]);

  async function uploadSelfie(event: ChangeEvent<HTMLInputElement>) {
    const original = event.target.files?.[0];
    event.target.value = "";
    if (!today || !original || uploading) return;
    setUploading(true);
    setHasError(false);
    setFeedback("Đang xử lý và tải ảnh selfie...");
    try {
      const file = await prepareChatImage(original);
      if (!file || file.size > 5 * 1024 * 1024) {
        throw new Error("Ảnh không hợp lệ hoặc vượt giới hạn 5MB. Hãy chọn ảnh khác.");
      }
      const form = new FormData();
      form.append("file", file, file.name);
      await authFetch("/staff-attendance/check-ins/" + encodeURIComponent(today.id) + "/selfie", {
        method: "POST",
        body: form,
      });
      setFeedback("Ảnh selfie đã lưu thành công.");
      await client.invalidateQueries({ queryKey: ["staff-attendance", user?.id] });
    } catch (error) {
      setHasError(true);
      setFeedback(error instanceof Error ? error.message : "Chưa tải ảnh lên được. Hãy thử lại.");
    } finally {
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
          Chưa tải được dữ liệu check-in.
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
                  onChange={(event) => setBranchId(event.target.value)}
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
          {!configured && (
            <p className="mm-att-warning" role="status">
              Cơ sở chưa cấu hình tọa độ. Bạn vẫn có thể check-in, nhưng chưa đủ điều kiện nhận coin
              theo GPS.
            </p>
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
                  disabled={!branch || busy}
                  onClick={() => void manual()}
                >
                  <LocateFixed size={20} /> {busy ? "Đang ghi nhận..." : "Check-in bằng GPS"}
                </button>
                <button
                  className="mm-att-secondary"
                  type="button"
                  disabled={!branch || busy}
                  onClick={() => branch && void checkIn(branch.id)}
                >
                  Check-in không có GPS (+0 coin)
                </button>
              </div>
              <p className="mm-att-small">
                Ngoài 200m vẫn check-in được; quản trị sẽ thấy trạng thái không đủ phạm vi và bạn
                nhận 0 coin.
              </p>
              <label className="mm-att-auto">
                <input
                  type="checkbox"
                  checked={auto}
                  disabled={!configured || !branch || busy}
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
            <div className="mm-att-selfie">
              <div>
                <h3>
                  <Camera size={18} /> Ảnh selfie xác nhận
                </h3>
                <p>
                  {today.selfieUrl
                    ? "Ảnh đã được lưu tại hệ thống."
                    : "Chụp ảnh selfie sau check-in để bổ sung minh chứng."}
                </p>
                {today.selfieUrl && (
                  <a href={today.selfieUrl} target="_blank" rel="noopener noreferrer">
                    Xem selfie đã gửi
                  </a>
                )}
              </div>
              {!today.selfieUrl && (
                <label className="mm-att-upload">
                  <Camera size={17} />
                  {uploading ? "Đang tải ảnh..." : "Chụp / tải selfie"}
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    disabled={uploading}
                    onChange={(event) => void uploadSelfie(event)}
                  />
                </label>
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
