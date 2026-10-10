"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, MapPin, Search, ArrowRight, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Provider, ServiceItem } from "@/features/marketplace/types";
import { MobileHeader, MobileNavigation } from "./experience";
import { MOC_MARIA_PRIMARY_ADDRESS } from "./booking-location";
import { formatPrice } from "@/features/marketplace/format";
import "./booking-location.css";
import "./account.css";
export function searchText(value: string) {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}
export function AppointmentRequest({
  providers,
  services,
  initial,
  verifiedAvailable = false,
}: {
  providers: Provider[];
  services: ServiceItem[];
  initial: { provider?: string; service?: string };
  verifiedAvailable?: boolean;
}) {
  const { user, status, authFetch } = useAuth();
  const available = providers.filter((p) => p.chatEnabled || !p.isDemo);
  const [providerId, setProviderId] = useState(
    () =>
      available.find((p) => p.id === initial.provider || p.chatProviderId === initial.provider)
        ?.id || "",
  );
  const [serviceId, setServiceId] = useState(initial.service || "");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<"AT_BRANCH" | "AT_HOME">("AT_BRANCH");
  const [address, setAddress] = useState("");
  const [requestedAt, setRequestedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const identity = useRef<{ signature: string; key: string } | null>(null);
  const [dateLimits] = useState(() => ({
    min: new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 16),
    max: new Date(Date.now() + 60 * 86400000 + 7 * 3600000).toISOString().slice(0, 16),
  }));
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("mocmaria.booking.signin-draft");
      sessionStorage.removeItem("mocmaria.booking.signin-draft");
      if (!raw) return;
      const draft = JSON.parse(raw) as Record<string, unknown>;
      if (typeof draft.savedAt !== "number" || Date.now() - draft.savedAt > 30 * 60 * 1000) return;
      queueMicrotask(() => {
        if (
          typeof draft.providerId === "string" &&
          providers.some((p) => p.id === draft.providerId)
        )
          setProviderId(draft.providerId);
        if (
          typeof draft.serviceId === "string" &&
          services.some((s) => s.service.id === draft.serviceId)
        )
          setServiceId(draft.serviceId);
        if (draft.location === "AT_HOME" || draft.location === "AT_BRANCH")
          setLocation(draft.location);
        if (typeof draft.address === "string") setAddress(draft.address.slice(0, 300));
        if (typeof draft.requestedAt === "string") setRequestedAt(draft.requestedAt);
        if (typeof draft.notes === "string") setNotes(draft.notes.slice(0, 500));
      });
    } catch {
      /* A blocked browser storage does not prevent booking. */
    }
  }, [providers, services]);
  const chosen = available.find((p) => p.id === providerId);
  const offers = (p: Provider) =>
    p.isDemo
      ? p.demoServices || []
      : [
          ...new Map(
            (p.eligibleServices || []).map((s) => [
              s.serviceId,
              { id: s.serviceId, name: s.serviceName },
            ]),
          ).values(),
        ];
  const serviceList = services.filter(
    (s) => !chosen || offers(chosen).some((o) => o.id === s.service.id),
  );
  const chosenService = serviceList.find((s) => s.service.id === serviceId);
  const filtered = available.filter(
    (p) =>
      (!serviceId || offers(p).some((s) => s.id === serviceId)) &&
      searchText([p.publicName, p.serviceArea, ...offers(p).map((s) => s.name)].join(" ")).includes(
        searchText(query),
      ),
  );
  const canSend =
    !!chosen &&
    !!chosenService &&
    !!requestedAt &&
    (location === "AT_BRANCH" || address.trim().length >= 12);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !canSend || !user || !chosen || !chosenService) return;
    setBusy(true);
    setError("");
    try {
      const body = {
        providerId: chosen.chatProviderId || chosen.id,
        serviceId: chosenService.service.id,
        location,
        address: location === "AT_BRANCH" ? MOC_MARIA_PRIMARY_ADDRESS : address.trim(),
        requestedAt: new Date(requestedAt + ":00+07:00").toISOString(),
        notes: notes.trim(),
      };
      const signature = JSON.stringify(body);
      if (identity.current?.signature !== signature)
        identity.current = { signature, key: crypto.randomUUID() };
      await authFetch("/appointment-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, idempotencyKey: identity.current.key }),
      });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa gửi được yêu cầu. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-booking-main">
        <header className="mm-booking-heading">
          <span className="mm-overline">MỘC MARIA · HÀ NỘI</span>
          <h1>
            Đặt lịch chăm sóc <em>theo cách của bạn.</em>
          </h1>
          <p>
            Chọn dịch vụ, kỹ thuật viên và nơi phục vụ. KTV sẽ phản hồi để thống nhất thời gian và
            chi phí.
          </p>
          {verifiedAvailable && (
            <Link className="mm-outline-cta" href="/dat-lich?flow=verified">
              Kiểm tra lịch trống tại cơ sở
            </Link>
          )}
        </header>
        {submitted ? (
          <section className="mm-booking-success" role="status">
            <CheckCircle2 size={40} />
            <h2>Đã gửi yêu cầu đến {chosen?.publicName}</h2>
            <p>
              KTV sẽ trao đổi để xác nhận khả năng phục vụ, thời gian và giá. Bạn có thể xem yêu cầu
              trong tài khoản.
            </p>
            <Link className="mm-primary-cta" href="/tai-khoan#yeu-cau-dat-lich">
              Theo dõi yêu cầu <ArrowRight size={17} />
            </Link>
            <Link
              className="mm-outline-cta"
              href={"/tin-nhan?provider=" + (chosen?.chatProviderId || chosen?.id)}
            >
              Chat với KTV
            </Link>
          </section>
        ) : (
          <form onSubmit={submit} className="mm-booking-grid mm-request-form">
            <div className="mm-booking-steps">
              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>01</span>
                  <div>
                    <h2>Chọn dịch vụ</h2>
                    <p>Thời lượng và giá tham khảo để bạn dễ lựa chọn.</p>
                  </div>
                </div>
                <label className="mm-booking-field">
                  Dịch vụ chăm sóc
                  <select
                    required
                    value={serviceId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setServiceId(id);
                      if (chosen && !offers(chosen).some((s) => s.id === id)) setProviderId("");
                    }}
                  >
                    <option value="">Chọn dịch vụ</option>
                    {serviceList.map((s) => (
                      <option key={s.service.id} value={s.service.id}>
                        {s.service.name}
                      </option>
                    ))}
                  </select>
                </label>
                {chosenService && (
                  <p className="mm-request-price">
                    {chosenService.variants.map((v) => v.durationMinutes + " phút").join(" · ")} ·
                    Từ{" "}
                    {formatPrice(
                      Math.min(...chosenService.variants.map((v) => Number(v.priceVnd))),
                    )}
                  </p>
                )}
              </section>
              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>02</span>
                  <div>
                    <h2>Chọn kỹ thuật viên</h2>
                    <p>Tìm theo tên, dịch vụ hoặc khu vực.</p>
                  </div>
                </div>
                <label className="mm-search mm-request-search">
                  <Search size={18} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm tên KTV, dịch vụ..."
                    aria-label="Tìm kỹ thuật viên"
                  />
                </label>
                <div className="mm-request-providers">
                  {filtered.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      aria-pressed={providerId === p.id}
                      className={"mm-request-provider" + (providerId === p.id ? " selected" : "")}
                      onClick={() => setProviderId(p.id)}
                    >
                      {p.avatarUrl?.startsWith("/media/") ? (
                        <Image src={p.avatarUrl} width={56} height={64} alt="" unoptimized />
                      ) : (
                        <UserRound size={30} />
                      )}
                      <span>
                        <strong>{p.publicName}</strong>
                        <small>
                          {p.scheduleOpen ? "Đã có lịch làm việc" : "Trao đổi lịch với KTV"} · Hà
                          Nội
                        </small>
                      </span>
                      {providerId === p.id && <CheckCircle2 size={20} />}
                    </button>
                  ))}
                </div>
                {!filtered.length && (
                  <p role="status">Chưa có KTV phù hợp. Hãy đổi từ khóa hoặc dịch vụ.</p>
                )}
              </section>
              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>03</span>
                  <div>
                    <h2>Địa điểm & thời gian</h2>
                    <p>Khu vực phục vụ hiện tại: Hà Nội.</p>
                  </div>
                </div>
                <div className="mm-request-location" role="group" aria-label="Nơi phục vụ">
                  <button
                    type="button"
                    aria-pressed={location === "AT_BRANCH"}
                    className={location === "AT_BRANCH" ? "selected" : ""}
                    onClick={() => setLocation("AT_BRANCH")}
                  >
                    Đến Mộc Maria
                  </button>
                  <button
                    type="button"
                    aria-pressed={location === "AT_HOME"}
                    className={location === "AT_HOME" ? "selected" : ""}
                    onClick={() => setLocation("AT_HOME")}
                  >
                    Tại địa chỉ của tôi
                  </button>
                </div>
                <label className="mm-booking-field">
                  Khu vực phục vụ
                  <input readOnly value="Hà Nội" />
                </label>
                {location === "AT_HOME" ? (
                  <label className="mm-booking-field">
                    Địa chỉ nhận dịch vụ
                    <input
                      required
                      minLength={12}
                      maxLength={300}
                      autoComplete="street-address"
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, Hà Nội"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </label>
                ) : (
                  <p className="mm-primary-location">
                    <MapPin size={21} />
                    {MOC_MARIA_PRIMARY_ADDRESS}
                  </p>
                )}
                <label className="mm-booking-field">
                  Ngày & giờ mong muốn (giờ Hà Nội)
                  <input
                    type="datetime-local"
                    min={dateLimits.min}
                    max={dateLimits.max}
                    required
                    value={requestedAt}
                    onChange={(e) => setRequestedAt(e.target.value)}
                  />
                </label>
                <label className="mm-booking-field">
                  Ghi chú cho KTV
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Thời lượng mong muốn, lưu ý khi phục vụ..."
                  />
                </label>
              </section>
            </div>
            <aside className="mm-booking-summary">
              <span className="mm-overline">YÊU CẦU CỦA BẠN</span>
              <h2>Khoảng nghỉ dành riêng cho bạn</h2>
              <div className="mm-summary-items">
                <p>
                  <UserRound size={18} />
                  {chosen?.publicName || "Chưa chọn kỹ thuật viên"}
                </p>
                <p>{chosenService?.service.name || "Chưa chọn dịch vụ"}</p>
                <p>
                  <MapPin size={18} />
                  {location === "AT_BRANCH" ? "Tại Mộc Maria" : address || "Chưa nhập địa chỉ"} · Hà
                  Nội
                </p>
                <p>
                  <CalendarDays size={18} />
                  {requestedAt ? requestedAt.replace("T", " · ") : "Chưa chọn ngày và giờ"}
                </p>
              </div>
              <p className="mm-hint">
                Yêu cầu sẽ chờ KTV phản hồi và xác nhận. Giá và khả năng phục vụ tại nhà được trao
                đổi trước khi chốt lịch.
              </p>
              {status === "loading" ? (
                <p>Đang kiểm tra tài khoản...</p>
              ) : !user ? (
                <Link
                  className="mm-primary-cta mm-full-cta"
                  onClick={() => {
                    try {
                      sessionStorage.setItem(
                        "mocmaria.booking.signin-draft",
                        JSON.stringify({
                          providerId,
                          serviceId,
                          location,
                          address,
                          requestedAt,
                          notes,
                          savedAt: Date.now(),
                        }),
                      );
                    } catch {
                      /* Navigation still works without storage. */
                    }
                  }}
                  href={
                    "/dang-nhap?returnTo=" +
                    encodeURIComponent(
                      "/dat-lich" + "?provider=" + providerId + "&service=" + serviceId,
                    )
                  }
                >
                  Đăng nhập để gửi yêu cầu <ArrowRight size={17} />
                </Link>
              ) : (
                <button
                  className="mm-primary-cta mm-full-cta"
                  disabled={busy || !canSend || !user.permissions.includes("customer.portal")}
                >
                  {busy ? "Đang gửi..." : "Gửi yêu cầu đặt lịch"}
                  <ArrowRight size={17} />
                </button>
              )}
              {user && !user.permissions.includes("customer.portal") && (
                <p>
                  Tài khoản KTV dùng để nhận yêu cầu. Hãy đăng nhập tài khoản khách hàng để đặt
                  lịch.
                </p>
              )}
              {error && (
                <p role="alert" className="mm-booking-error">
                  {error}
                </p>
              )}
            </aside>
          </form>
        )}
      </main>
      <MobileNavigation active="booking" />
    </div>
  );
}
