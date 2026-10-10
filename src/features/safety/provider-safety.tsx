"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ShieldCheck, MapPin, Siren, CheckCircle2, Pause, Play } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Inquiry } from "@/features/mobile/inquiries";
import { watchSafetyLocation } from "./geolocation";
import { ongoing, time, pointState, stateLabels, type SafetySession } from "./types";
export function ProviderSafety() {
  const { user } = useAuth();
  return <ProviderSafetyContent key={user?.id || "signed-out"} />;
}
function ProviderSafetyContent() {
  const { user, authFetch } = useAuth(),
    allowed = user?.roles.some((r) => r === "THERAPIST" || r === "DOCTOR_CONSULTANT");
  const [sessions, setSessions] = useState<SafetySession[]>([]),
    [inquiries, setInquiries] = useState<Inquiry[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [gpsSession, setGpsSession] = useState(""),
    [gpsNotice, setGpsNotice] = useState(""),
    [confirmSos, setConfirmSos] = useState(false),
    [now, setNow] = useState(0);
  const current = sessions.find((s) => ongoing(s) && Date.parse(s.expiresAt) > now);
  const load = useCallback(async () => {
    if (!allowed) return;
    try {
      const [s, q] = await Promise.all([
        authFetch<SafetySession[]>("/ktv-safety/me", { cache: "no-store" }),
        authFetch<Inquiry[]>("/appointment-inquiries", { cache: "no-store" }),
      ]);
      setSessions(s);
      setInquiries(
        q.filter(
          (i) => i.customerId !== user?.id && i.location === "AT_HOME" && i.status === "CONTACTED",
        ),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa kết nối được chế độ an toàn.");
    } finally {
      setLoading(false);
    }
  }, [allowed, authFetch, user?.id]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setNow(Date.now());
        void load();
      }
    });
    const timer = setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === "visible") void load();
    }, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [load]);
  const trackingId = current?.sharing && gpsSession === current.id ? current.id : "";
  useEffect(() => {
    if (!trackingId) return;
    if (!navigator.geolocation) {
      queueMicrotask(() => setGpsNotice("Thiết bị không hỗ trợ GPS. Bạn vẫn có thể gửi SOS."));
      return;
    }
    const controller = new AbortController();
    const stop = watchSafetyLocation(
      navigator.geolocation,
      document,
      async (point) => {
        const result = await authFetch<SafetySession>("/ktv-safety/" + trackingId + "/point", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(point),
          signal: controller.signal,
        });
        if (!controller.signal.aborted)
          setSessions((old) => old.map((s) => (s.id === result.id ? result : s)));
      },
      setGpsNotice,
    );
    return () => {
      controller.abort();
      stop();
    };
  }, [trackingId, authFetch]);
  async function action(action: string) {
    if (!current || busy) return;
    if (action === "PAUSE" || action === "FINISH" || action === "STOP") setGpsSession("");
    setBusy(true);
    setNotice("");
    try {
      const s = await authFetch<SafetySession>("/ktv-safety/" + current.id + "/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setSessions((old) => old.map((v) => (v.id === s.id ? s : v)));
      if (action === "RESUME") setGpsSession(s.id);
      if (action === "SOS") {
        setConfirmSos(false);
        setNotice(
          "SOS đã được ghi nhận. Chờ quản trị tiếp nhận; nếu nguy hiểm ngay, hãy gọi người hỗ trợ hoặc cơ quan khẩn cấp.",
        );
      }
    } catch (e) {
      setNotice(
        (e instanceof Error ? e.message : "Chưa gửi được thao tác.") +
          (action === "SOS" ? " SOS chưa gửi thành công. Hãy gọi người hỗ trợ trực tiếp." : ""),
      );
    } finally {
      setBusy(false);
    }
  }
  async function start(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setNotice("");
    try {
      const s = await authFetch<SafetySession>("/ktv-safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId: f.get("inquiryId"),
          consent: f.get("consent") === "on",
          expectedCheckAt: new Date(Date.now() + Number(f.get("minutes")) * 60000).toISOString(),
        }),
      });
      setSessions((old) => [s, ...old]);
      setNow(Date.now());
      setGpsSession(s.id);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Chưa bật được chế độ an toàn.");
    } finally {
      setBusy(false);
    }
  }
  if (!allowed) return <p role="alert">Chế độ này dành cho tài khoản kỹ thuật viên.</p>;
  return (
    <section className="mm-safety">
      <div className="safety-intro">
        <ShieldCheck size={26} />
        <div>
          <h2>Đồng hành cùng bạn trong mỗi chuyến đi</h2>
          <p>
            Bạn quyết định khi nào chia sẻ. Chỉ super admin theo dõi; khách hàng không xem được vị
            trí này.
          </p>
        </div>
      </div>
      <p className="safety-web-note">
        Giữ trang này mở trên màn hình để GPS cập nhật. Khóa điện thoại, chuyển ứng dụng hoặc mất
        mạng có thể làm vị trí ngừng cập nhật. Đây là công cụ hỗ trợ; quản trị cần có người trực để
        xử lý SOS.
      </p>
      {error && (
        <p role="alert" className="safety-warning">
          {error} Dữ liệu hiển thị có thể đã cũ.
        </p>
      )}
      {notice && (
        <p role="status" className="safety-warning">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải...</p>
      ) : current ? (
        <article className="safety-card">
          <div className="safety-card-heading">
            <h2>{current.status === "ARRIVED" ? "Đã đến nơi phục vụ" : "Đang trên đường"}</h2>
            <span
              className={"safety-pill " + (pointState(current, now) === "FRESH" ? "fresh" : "")}
            >
              {stateLabels[pointState(current, now)]}
            </span>
          </div>
          <h3>{current.visit?.serviceName}</h3>
          <p>
            <MapPin size={16} /> {current.visit?.address}
          </p>
          <p>Khách hàng: {current.visit?.customerName}</p>
          <p>
            Check-in tiếp theo trước {time(current.expectedCheckAt)} · Tự kết thúc{" "}
            {time(current.expiresAt)}
          </p>
          {now > Date.parse(current.expectedCheckAt) && (
            <p className="safety-warning">
              Đã quá giờ check-in. Hãy cập nhật trạng thái hoặc liên hệ quản trị.
            </p>
          )}
          <p role="status">
            {trackingId
              ? gpsNotice
              : "GPS trên thiết bị này chưa chạy. Bấm tiếp tục chia sẻ nếu muốn bật."}
          </p>
          {current.point && (
            <p>
              Cập nhật cuối: {time(current.point.recordedAt)} · Sai số khoảng{" "}
              {Math.round(current.point.accuracy)} m
            </p>
          )}
          <div className="safety-actions">
            <button
              className="mm-outline-cta"
              disabled={busy}
              onClick={() => void action(trackingId ? "PAUSE" : "RESUME")}
            >
              {trackingId ? <Pause size={18} /> : <Play size={18} />}{" "}
              {trackingId ? "Tạm dừng GPS" : "Tiếp tục chia sẻ GPS"}
            </button>
            {current.status === "TRAVELLING" && (
              <button
                className="mm-primary-cta"
                disabled={busy}
                onClick={() => void action("ARRIVED")}
              >
                <CheckCircle2 size={18} /> Tôi đã đến nơi
              </button>
            )}
            <button
              className="mm-outline-cta"
              disabled={busy}
              onClick={() => void action("FINISH")}
            >
              Đã hoàn tất · check-out
            </button>
            <button className="mm-outline-cta" disabled={busy} onClick={() => void action("STOP")}>
              Kết thúc phiên an toàn
            </button>
          </div>
          <div className="safety-sos-box">
            {current.sos && current.sos.status !== "RESOLVED" ? (
              <>
                <strong>
                  {current.sos.status === "OPEN"
                    ? "SOS đã gửi · chưa được tiếp nhận"
                    : "Quản trị đã tiếp nhận SOS"}
                </strong>
                <p>{current.sos.note || "Hãy liên hệ trực tiếp nếu cần hỗ trợ ngay."}</p>
                {current.sos.acknowledgedAt && (
                  <p>Tiếp nhận lúc {time(current.sos.acknowledgedAt)}</p>
                )}
              </>
            ) : (
              <>
                <button
                  className="safety-sos"
                  disabled={busy}
                  onClick={() => setConfirmSos((v) => !v)}
                >
                  <Siren size={22} /> Tôi cần hỗ trợ · SOS
                </button>
                {confirmSos && (
                  <div>
                    <p>
                      Gửi cảnh báo đến bảng theo dõi của super admin, kèm vị trí cuối nếu có. SOS
                      vẫn gửi được khi GPS bị từ chối; cần kết nối mạng.
                    </p>
                    <div className="safety-actions">
                      <button
                        className="safety-sos"
                        disabled={busy}
                        onClick={() => void action("SOS")}
                      >
                        Gửi SOS ngay
                      </button>
                      <button className="mm-outline-cta" onClick={() => setConfirmSos(false)}>
                        Quay lại
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </article>
      ) : (
        <article className="safety-card">
          <h2>Bắt đầu chuyến phục vụ tại nhà</h2>
          {!inquiries.length ? (
            <>
              <p>
                Chưa có yêu cầu tại nhà đã nhận trao đổi. Mở yêu cầu đặt lịch, trao đổi và thống
                nhất chuyến đi với khách trước.
              </p>
              <Link className="mm-primary-cta" href="/tai-khoan#yeu-cau-dat-lich">
                Xem yêu cầu đặt lịch
              </Link>
            </>
          ) : (
            <form onSubmit={(e) => void start(e)}>
              <label>
                Chuyến phục vụ
                <select name="inquiryId" required>
                  {inquiries.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.customerName} · {q.serviceName} · {q.address}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Dự kiến check-in sau
                <select name="minutes" defaultValue="60">
                  <option value="30">30 phút</option>
                  <option value="60">1 giờ</option>
                  <option value="120">2 giờ</option>
                  <option value="240">4 giờ</option>
                </select>
              </label>
              <label className="safety-consent">
                <input type="checkbox" name="consent" required />
                <span>
                  Tôi đã thống nhất chuyến đi với khách và tự nguyện chia sẻ vị trí với super admin
                  trong phiên này, tối đa 8 giờ. Có thể dừng bất kỳ lúc nào. Điểm GPS hiện tại được
                  xóa khi dừng; vị trí gửi kèm SOS được giữ tối đa 24 giờ. Bản đồ dùng OpenStreetMap
                  và có thể chia sẻ vùng bản đồ đang xem với nhà cung cấp bản đồ.
                </span>
              </label>
              <button className="mm-primary-cta" disabled={busy || !!error}>
                <ShieldCheck size={18} /> {busy ? "Đang bật..." : "Bật chế độ an toàn & GPS"}
              </button>
            </form>
          )}
        </article>
      )}
      <p className="safety-fine">
        Phiên an toàn không thay thế xác nhận lịch hẹn. Trang chỉ giữ điểm GPS mới nhất, không lưu
        hành trình. Dữ liệu chuyến đi được xóa sau 24 giờ kể từ khi kết thúc; quyền truy cập của
        quản trị được ghi nhật ký.
      </p>
      {sessions
        .filter((s) => !ongoing(s) || Date.parse(s.expiresAt) <= now)
        .slice(0, 3)
        .map((s) => (
          <article className="safety-history" key={s.id}>
            <strong>Phiên đã kết thúc · {time(s.startedAt)}</strong>
            <p>
              {s.status === "EXPIRED" ? "Hết thời hạn 8 giờ" : "Đã dừng chia sẻ"}
              {s.sos && s.sos.status !== "RESOLVED" ? " · SOS vẫn đang chờ xử lý" : ""}
            </p>
            {s.sos?.note && <p>{s.sos.note}</p>}
          </article>
        ))}
    </section>
  );
}
