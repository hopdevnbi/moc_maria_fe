"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Bell, MapPin, ShieldCheck, Siren } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { SafetyMap } from "./safety-map";
import { ongoing, time, pointState, stateLabels, type SafetySession } from "./types";
interface Monitor {
  serverTime: string;
  sessions: SafetySession[];
}
export function AdminSafety() {
  const { user } = useAuth();
  return <AdminSafetyContent key={user?.id || "signed-out"} />;
}
function AdminSafetyContent() {
  const { user, authFetch } = useAuth(),
    allowed = user?.roles.includes("SUPER_ADMIN");
  const [data, setData] = useState<SafetySession[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(""),
    [mapOpen, setMapOpen] = useState(false),
    [sound, setSound] = useState(false),
    [now, setNow] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null),
    seen = useRef<Set<string>>(new Set()),
    offset = useRef(0),
    inFlight = useRef(false);
  const load = useCallback(async () => {
    if (!allowed || inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await authFetch<Monitor>("/ktv-safety/monitor", { cache: "no-store" });
      offset.current = Date.parse(result.serverTime) - Date.now();
      setNow(Date.now() + offset.current);
      setData(result.sessions);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu an toàn.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [allowed, authFetch]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    const timer = setInterval(() => {
      setNow(Date.now() + offset.current);
      if (document.visibilityState === "visible") void load();
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [load]);
  useEffect(() => {
    const ids = data.filter((s) => s.sos?.status === "OPEN").map((s) => s.sos!.id);
    if (sound && ids.some((id) => !seen.current.has(id)))
      void audio.current
        ?.play()
        .catch(() => setNotice("Trình duyệt đã chặn âm báo. Bấm bật âm báo lại."));
    seen.current = new Set(ids);
  }, [data, sound]);
  async function incident(e: FormEvent<HTMLFormElement>, s: SafetySession) {
    e.preventDefault();
    if (busy || !s.sos) return;
    const f = new FormData(e.currentTarget);
    setBusy(s.id);
    setNotice("");
    try {
      await authFetch("/ktv-safety/" + s.id + "/incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: s.sos.id,
          action: s.sos.status === "OPEN" ? "ACKNOWLEDGE" : "RESOLVE",
          note: f.get("note"),
        }),
      });
      await load();
      setNotice("Đã ghi nhận xử lý SOS.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Chưa xử lý được SOS.");
    } finally {
      setBusy("");
    }
  }
  if (!allowed) return <p role="alert">Chỉ super admin được xem vị trí và xử lý cảnh báo KTV.</p>;
  const unresolved = data.filter((s) => s.sos && s.sos.status !== "RESOLVED"),
    running = data.filter((s) => ongoing(s) && Date.parse(s.expiresAt) > now),
    stale = running.filter((s) => pointState(s, now) === "STALE"),
    overdue = running.filter((s) => Date.parse(s.expectedCheckAt) < now);
  return (
    <section className="mm-safety">
      <div className="safety-intro">
        <ShieldCheck size={26} />
        <div>
          <h2>Theo dõi chuyến phục vụ</h2>
          <p>
            KTV tự bật chia sẻ. GPS được cập nhật khi trang KTV đang mở; điểm cũ luôn được đánh dấu.
          </p>
        </div>
      </div>
      <p className="safety-web-note">
        Giữ bảng này mở để nhận cảnh báo và âm báo SOS mới. Tiếp nhận SOS nghĩa là bạn bắt đầu liên
        hệ hỗ trợ KTV; chỉ đóng cảnh báo sau khi đã kiểm tra an toàn. Trang không tự gọi điện hoặc
        gửi SMS.
      </p>
      <div className="safety-stats">
        <div>
          <strong>{running.length}</strong>
          <span>Chuyến đang hoạt động</span>
        </div>
        <div className={unresolved.length ? "urgent" : ""}>
          <strong>{unresolved.length}</strong>
          <span>SOS cần xử lý</span>
        </div>
        <div>
          <strong>{stale.length}</strong>
          <span>Vị trí mất cập nhật</span>
        </div>
        <div>
          <strong>{overdue.length}</strong>
          <span>Quá giờ check-in</span>
        </div>
      </div>
      <div className="safety-actions">
        <button className="mm-outline-cta" onClick={() => void load()} disabled={loading}>
          Tải lại
        </button>
        <button
          className="mm-outline-cta"
          aria-pressed={sound}
          onClick={() => {
            if (sound) {
              setSound(false);
              audio.current?.pause();
              return;
            }
            audio.current = new Audio("/media/audio/chat-notification-053a2fe62791.mp3");
            audio.current.volume = 0.65;
            void audio.current
              .play()
              .then(() => setSound(true))
              .catch(() =>
                setNotice("Chưa bật được âm báo. Hãy thử lại sau khi tương tác với trang."),
              );
          }}
        >
          <Bell size={18} />
          {sound ? "Tắt âm báo SOS" : "Bật âm báo SOS"}
        </button>
        <Link className="mm-outline-cta" href="/tai-khoan">
          Tài khoản
        </Link>
      </div>
      {error && (
        <p role="alert" className="safety-warning">
          Mất kết nối bảng theo dõi: {error} Các điểm đang hiển thị có thể đã cũ.
        </p>
      )}
      {notice && (
        <p role="status" className="safety-warning">
          {notice}
        </p>
      )}
      <div className="safety-card">
        <h2>
          <MapPin size={21} /> Bản đồ riêng tư
        </h2>
        {mapOpen ? (
          <>
            <SafetyMap sessions={data} />
            <button className="mm-outline-cta" onClick={() => setMapOpen(false)}>
              Đóng bản đồ
            </button>
          </>
        ) : (
          <>
            <p>
              Bản đồ nền dùng OpenStreetMap. Khi mở, nhà cung cấp bản đồ nhận vùng bản đồ được xem
              và thông tin kết nối; tên KTV, địa chỉ khách và điểm đánh dấu không được gửi trong yêu
              cầu bản đồ.
            </p>
            <button className="mm-primary-cta" onClick={() => setMapOpen(true)}>
              Mở bản đồ
            </button>
          </>
        )}
      </div>
      {loading ? (
        <p role="status">Đang tải chuyến phục vụ...</p>
      ) : !data.length ? (
        <article className="safety-card">
          <h2>Chưa có phiên chia sẻ vị trí</h2>
          <p>
            Khi KTV bật chế độ an toàn cho chuyến phục vụ tại nhà, thông tin sẽ xuất hiện tại đây.
          </p>
        </article>
      ) : (
        <div className="safety-monitor-list">
          {data.map((s) => {
            const status = pointState(s, now),
              p = s.point || s.sos?.point,
              open = s.sos && s.sos.status !== "RESOLVED";
            return (
              <article key={s.id} className={"safety-card " + (open ? "safety-incident" : "")}>
                <div className="safety-card-heading">
                  <h2>{s.providerName}</h2>
                  <span className={"safety-pill " + (status === "FRESH" && !error ? "fresh" : "")}>
                    {error ? "Chưa xác minh cập nhật" : stateLabels[status]}
                  </span>
                </div>
                <p>{s.visit?.serviceName || "Thông tin chuyến đi đã hết thời hạn lưu"}</p>
                {s.visit && (
                  <>
                    <p>Khách: {s.visit.customerName}</p>
                    <p>
                      <MapPin size={16} /> {s.visit.address}
                    </p>
                  </>
                )}
                <p>
                  {s.status === "ARRIVED"
                    ? "KTV đã check-in"
                    : ongoing(s)
                      ? "Đang trên đường"
                      : "Phiên đã kết thúc"}{" "}
                  · Check-in tiếp theo: {time(s.expectedCheckAt)}
                </p>
                {ongoing(s) && now > Date.parse(s.expectedCheckAt) && (
                  <p className="safety-warning">Quá giờ check-in · cần liên hệ kiểm tra</p>
                )}
                {p ? (
                  <>
                    <p>
                      <strong>
                        {p === s.point ? "Vị trí cuối" : "Vị trí tại lúc gửi SOS"}:{" "}
                        {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                      </strong>
                    </p>
                    <p>
                      GPS lúc {time(p.recordedAt)} · Sai số khoảng {Math.round(p.accuracy)} m
                    </p>
                    <p className="safety-fine">
                      Đây là vị trí thiết bị báo về, có thể có sai số. Điểm cũ không phản ánh vị trí
                      hiện tại.
                    </p>
                  </>
                ) : (
                  <p>Chưa có vị trí GPS hoặc dữ liệu đã hết hạn lưu.</p>
                )}
                {open && s.sos && (
                  <div className="safety-sos-box">
                    <h3>
                      <Siren size={20} />{" "}
                      {s.sos.status === "OPEN" ? "SOS · cần tiếp nhận ngay" : "SOS · đang hỗ trợ"}
                    </h3>
                    <p>Gửi lúc {time(s.sos.raisedAt)}</p>
                    {s.sos.note && <p>Ghi chú: {s.sos.note}</p>}
                    <form onSubmit={(e) => void incident(e, s)}>
                      <label>
                        Ghi chú liên hệ / kiểm tra an toàn
                        <textarea
                          name="note"
                          required
                          minLength={5}
                          maxLength={300}
                          rows={2}
                          placeholder="Đã gọi KTV, tình trạng và cách hỗ trợ..."
                        />
                      </label>
                      <button className="safety-sos" disabled={!!busy}>
                        {s.sos.status === "OPEN"
                          ? "Tiếp nhận & liên hệ KTV"
                          : "Đã kiểm tra an toàn · đóng SOS"}
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
