"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, CircleStop, MapPinned, Pause, Play, Radio, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { watchSafetyLocation } from "@/features/safety/geolocation";
import {
  ongoing,
  pointState,
  stateLabels,
  time,
  type SafetySession,
} from "@/features/safety/types";

const shareRoles = ["THERAPIST", "DOCTOR_CONSULTANT", "SUPER_ADMIN"];

/** Only an opted-in, active KTV or Super Admin gets access to this control. */
export function CheckInJourneySharing() {
  const { user } = useAuth();
  if (!user?.isActive || !user.roles.some((role) => shareRoles.includes(role))) return null;
  return <JourneySharing key={user.id} isSuperAdmin={user.roles.includes("SUPER_ADMIN")} />;
}

function JourneySharing({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { authFetch } = useAuth();
  const [sessions, setSessions] = useState<SafetySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [error, setError] = useState("");
  const [gpsNotice, setGpsNotice] = useState("");
  const [gpsSession, setGpsSession] = useState("");
  const [now, setNow] = useState(0);

  const current = sessions.find((s) => ongoing(s) && Date.parse(s.expiresAt) > now);
  const trackingId = current?.sharing && current.id === gpsSession ? current.id : "";

  const refresh = useCallback(async () => {
    try {
      const rows = await authFetch<SafetySession[]>("/ktv-safety/me", { cache: "no-store" });
      setSessions(rows);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được trạng thái chia sẻ GPS.");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) {
        setNow(Date.now());
        void refresh();
      }
    });
    const interval = setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === "visible") void refresh();
    }, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    if (!trackingId) return;
    if (!navigator.geolocation) {
      queueMicrotask(() => setGpsNotice("Thiết bị không hỗ trợ GPS. Chưa thể chia sẻ vị trí."));
      return;
    }
    const controller = new AbortController();
    const stop = watchSafetyLocation(
      navigator.geolocation,
      document,
      async (point) => {
        const session = await authFetch<SafetySession>("/ktv-safety/" + trackingId + "/point", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(point),
          signal: controller.signal,
        });
        if (!controller.signal.aborted)
          setSessions((old) => old.map((s) => (s.id === session.id ? session : s)));
      },
      setGpsNotice,
    );
    return () => {
      controller.abort();
      stop();
    };
  }, [trackingId, authFetch]);

  async function startSharing(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || current || error) return;
    const form = new FormData(e.currentTarget);
    if (form.get("consent") !== "on") return;
    setBusy(true);
    setError("");
    try {
      const session = await authFetch<SafetySession>("/ktv-safety/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          expectedCheckAt: new Date(
            Date.now() + Number(form.get("minutes") || 120) * 60000,
          ).toISOString(),
        }),
      });
      setSessions((old) => [session, ...old.filter((s) => s.id !== session.id)]);
      setNow(Date.now());
      setGpsNotice("Đang xin quyền GPS và chờ vị trí đầu tiên...");
      setGpsSession(session.id);
      setExpanded(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa thể bật chia sẻ hành trình.");
    } finally {
      setBusy(false);
    }
  }

  async function control(action: "PAUSE" | "RESUME" | "STOP" | "CHECK") {
    if (!current || busy) return;
    setBusy(true);
    setError("");
    try {
      const session = await authFetch<SafetySession>("/ktv-safety/" + current.id + "/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setSessions((old) => old.map((s) => (s.id === session.id ? session : s)));
      if (action === "STOP" || action === "PAUSE") {
        setGpsSession("");
        setGpsNotice("");
      }
      if (action === "RESUME") {
        setGpsSession(session.id);
        setGpsNotice("Đang kết nối lại GPS trên thiết bị này...");
      }
      if (action === "STOP") setConfirmStop(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa thực hiện được thao tác GPS.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mm-checkin-gps-share" aria-label="Chia sẻ hành trình GPS">
      <div className="mm-checkin-gps-share-heading">
        <span className="mm-checkin-gps-share-icon" aria-hidden="true">
          <MapPinned size={26} />
        </span>
        <div>
          <span className="mm-checkin-gps-share-eyebrow">
            <Radio size={13} /> ĐỊNH VỊ KHI DI CHUYỂN
          </span>
          <h2>Chia sẻ hành trình GPS</h2>
          <p>
            Bật khi đi làm hoặc di chuyển bên ngoài. Chỉ các Super Admin đang hoạt động được xem vị
            trí và hành trình của bạn trên bản đồ quản trị.
          </p>
        </div>
      </div>

      {error && (
        <p className="mm-checkin-gps-alert" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="mm-checkin-gps-helper">
          Đang kiểm tra phiên chia sẻ...
        </p>
      ) : current ? (
        <div className="mm-checkin-gps-active">
          <p className="mm-checkin-gps-status" role="status">
            <span className={trackingId ? "mm-checkin-gps-pulse" : "mm-checkin-gps-dot"} />
            <strong>
              {trackingId
                ? "Đang chia sẻ hành trình trên thiết bị này"
                : current.sharing
                  ? "Phiên đang bật · GPS chưa chạy trên thiết bị này"
                  : "Đã tạm dừng chia sẻ GPS"}
            </strong>
          </p>
          <p className="mm-checkin-gps-helper">
            {stateLabels[pointState(current, now)]} · Bắt đầu {time(current.startedAt)} · Tự kết
            thúc {time(current.expiresAt)}
          </p>
          <p className="mm-checkin-gps-helper">
            {current.point
              ? `Vị trí gần nhất: ${time(current.point.recordedAt)} · Sai số khoảng ${Math.round(current.point.accuracy)}m`
              : "Chưa nhận được điểm GPS của phiên này."}
          </p>
          {gpsNotice && (
            <p className="mm-checkin-gps-helper" role="status">
              {gpsNotice}
            </p>
          )}
          <div className="mm-checkin-gps-buttons">
            {trackingId ? (
              <button
                type="button"
                className="mm-checkin-gps-secondary"
                disabled={busy}
                onClick={() => void control("PAUSE")}
              >
                <Pause size={18} /> Tạm dừng GPS
              </button>
            ) : (
              <button
                type="button"
                className="mm-checkin-gps-primary"
                disabled={busy}
                onClick={() => void control("RESUME")}
              >
                <Play size={18} /> Tiếp tục chia sẻ GPS
              </button>
            )}
            {current.purpose === "SHIFT" && (
              <button
                type="button"
                className="mm-checkin-gps-secondary"
                disabled={busy}
                onClick={() => void control("CHECK")}
              >
                <CheckCircle2 size={18} /> Tôi vẫn an toàn
              </button>
            )}
            <button
              type="button"
              className="mm-checkin-gps-stop"
              disabled={busy}
              onClick={() => setConfirmStop(true)}
            >
              <CircleStop size={18} /> Dừng chia sẻ hành trình
            </button>
          </div>
          {confirmStop && (
            <div className="mm-checkin-gps-stop-confirm">
              <strong>Bạn muốn dừng chia sẻ GPS?</strong>
              <p>
                Phiên sẽ kết thúc và dữ liệu đường đi của phiên bị xóa ngay. Super Admin sẽ không
                nhận vị trí mới.
              </p>
              <div className="mm-checkin-gps-buttons">
                <button
                  type="button"
                  className="mm-checkin-gps-stop"
                  disabled={busy}
                  onClick={() => void control("STOP")}
                >
                  Xác nhận dừng và xóa hành trình
                </button>
                <button
                  type="button"
                  className="mm-checkin-gps-secondary"
                  disabled={busy}
                  onClick={() => setConfirmStop(false)}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {!expanded ? (
            <button
              type="button"
              className="mm-checkin-gps-primary mm-checkin-gps-start"
              onClick={() => setExpanded(true)}
            >
              <MapPinned size={23} /> Bắt đầu chia sẻ hành trình
            </button>
          ) : (
            <form className="mm-checkin-gps-consent-form" onSubmit={(e) => void startSharing(e)}>
              <label>
                Nhắc xác nhận an toàn sau
                <select name="minutes" defaultValue="120">
                  <option value="30">30 phút</option>
                  <option value="60">1 giờ</option>
                  <option value="120">2 giờ</option>
                  <option value="240">4 giờ</option>
                </select>
              </label>
              <label className="mm-checkin-gps-consent">
                <input type="checkbox" name="consent" required />
                <span>
                  Tôi tự nguyện bật chia sẻ GPS và hành trình trong tối đa 8 giờ. Chỉ Super Admin
                  được xem; tôi có thể tạm dừng hoặc dừng bất cứ lúc nào. Dừng sẽ xóa hành trình
                  ngay. GPS chỉ hoạt động đáng tin cậy khi trang web đang mở.
                </span>
              </label>
              <div className="mm-checkin-gps-buttons">
                <button type="submit" className="mm-checkin-gps-primary" disabled={busy}>
                  {busy ? "Đang bật GPS..." : "Đồng ý và bật chia sẻ GPS"}
                </button>
                <button
                  type="button"
                  className="mm-checkin-gps-secondary"
                  disabled={busy}
                  onClick={() => setExpanded(false)}
                >
                  Để sau
                </button>
              </div>
            </form>
          )}
        </>
      )}
      <p className="mm-checkin-gps-note">
        <ShieldCheck size={15} /> Check-in không tự bật tracking. Khi khóa màn hình hoặc chuyển ứng
        dụng, web/PWA có thể ngừng gửi GPS.{" "}
        {isSuperAdmin
          ? "Super Admin khác có thể theo dõi phiên bạn tự bật."
          : "Bạn quyết định khi nào chia sẻ và dừng."}
      </p>
    </section>
  );
}
