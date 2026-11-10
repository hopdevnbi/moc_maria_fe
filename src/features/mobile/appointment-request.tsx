"use client";
import { DEFAULT_BOOKING_NOTE } from "@/shared/booking/inquiry-status";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, MapPin, ArrowRight, UserRound } from "lucide-react";
import { apiRequest, parseApiResponse } from "@/features/auth/auth-api";
import type { AuthResponse } from "@/features/auth/auth.types";
import { canUsePersonalBooking } from "@/features/auth/personal-booking";
import { BookingAccountDialog } from "./booking-account-dialog";
import "./booking-quick-signup.css";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Provider, ServiceItem } from "@/features/marketplace/types";
import { MobileHeader, MobileNavigation } from "./experience";
import { BookingReassurance } from "./booking-reassurance";
import { chatHref } from "./links";
import { MOC_MARIA_PRIMARY_ADDRESS } from "./booking-location";
import { formatPrice } from "@/features/marketplace/format";
import { officialLegacyCareItem, officialServiceLabel } from "./official-ktv-offers";
import "./booking-location.css";
import "./account.css";
import { BookingProviderPicker } from "./booking-provider-picker";
import {
  inquiryServiceOptions,
  inquiryServiceId,
  supportsInquiryService,
} from "./inquiry-service-options";
export function searchText(value: string) {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}
function defaultService(provider: Provider | undefined, services: ServiceItem[]): string {
  return provider
    ? services.find((s) => supportsInquiryService(provider, s.service.id, services))?.service.id ||
        ""
    : "";
}
function hanoiDateTime(timestamp: number): string {
  return new Date(timestamp + 7 * 3600000).toISOString().slice(0, 16);
}
export function AppointmentRequest({
  providers,
  services: sourceServices,
  initial,
  verifiedAvailable = false,
}: {
  providers: Provider[];
  services: ServiceItem[];
  initial: { provider?: string; service?: string };
  verifiedAvailable?: boolean;
}) {
  const services = useMemo(() => inquiryServiceOptions(sourceServices), [sourceServices]);
  const { user, status, authFetch } = useAuth();
  const available = providers.filter((p) => p.chatEnabled || !p.isDemo);
  const initialProvider = available.find(
    (p) => p.id === initial.provider || p.chatProviderId === initial.provider,
  );
  const [providerId, setProviderId] = useState(() => initialProvider?.id || "");
  const [showProviderPicker, setShowProviderPicker] = useState(!initialProvider);
  const [serviceId, setServiceId] = useState(() =>
    initial.service &&
    (!initialProvider ||
      supportsInquiryService(
        initialProvider,
        inquiryServiceId(initial.service, services),
        services,
      ))
      ? inquiryServiceId(initial.service, services)
      : defaultService(initialProvider, services),
  );
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<"AT_BRANCH" | "AT_HOME">("AT_BRANCH");
  const [address, setAddress] = useState("");
  const [dateLimits] = useState(() => {
    const now = Date.now();
    return {
      min: hanoiDateTime(Math.ceil((now + 30 * 60000) / 60000) * 60000),
      max: hanoiDateTime(now + 60 * 86400000),
    };
  });
  const [requestedAt, setRequestedAt] = useState(dateLimits.min);
  const [notes, setNotes] = useState(DEFAULT_BOOKING_NOTE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const sending = useRef(false);
  const successRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (submitted) {
      successRef.current?.focus({ preventScroll: true });
      successRef.current?.scrollIntoView?.({ block: "center" });
    }
  }, [submitted]);
  const identity = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("mocmaria.booking.signin-draft");
      sessionStorage.removeItem("mocmaria.booking.signin-draft");
      if (!raw) return;
      const draft = JSON.parse(raw) as Record<string, unknown>;
      if (typeof draft.savedAt !== "number" || Date.now() - draft.savedAt > 30 * 60 * 1000) return;
      if (initial.provider && (!initialProvider || draft.providerId !== initialProvider.id)) return;
      queueMicrotask(() => {
        if (
          !initial.provider &&
          typeof draft.providerId === "string" &&
          providers.some((p) => p.id === draft.providerId)
        )
          setProviderId(draft.providerId);
        if (
          !initial.service &&
          typeof draft.serviceId === "string" &&
          services.some((s) => s.service.id === draft.serviceId) &&
          (!initialProvider || supportsInquiryService(initialProvider, draft.serviceId, services))
        )
          setServiceId(draft.serviceId);
        if (draft.location === "AT_HOME" || draft.location === "AT_BRANCH")
          setLocation(draft.location);
        if (typeof draft.address === "string") setAddress(draft.address.slice(0, 300));
        if (
          typeof draft.requestedAt === "string" &&
          draft.requestedAt >= dateLimits.min &&
          draft.requestedAt <= dateLimits.max
        )
          setRequestedAt(draft.requestedAt);
        if (typeof draft.notes === "string") setNotes(draft.notes.slice(0, 500));
      });
    } catch {
      /* A blocked browser storage does not prevent booking. */
    }
  }, [providers, services, initial.provider, initial.service, initialProvider, dateLimits]);
  const chosen = available.find((p) => p.id === providerId);
  const offers = (p: Provider) =>
    p.isDemo
      ? (p.demoServices || []).map(officialServiceLabel)
      : [
          ...new Map(
            (p.eligibleServices || []).map((s) => [
              s.serviceId,
              { id: s.serviceId, name: s.serviceName },
            ]),
          ).values(),
        ];
  const serviceList = services
    .filter((s) => !chosen || supportsInquiryService(chosen, s.service.id, services))
    .map((s) => ({ ...s, service: officialServiceLabel(s.service) }));
  const chosenService = serviceList.find((s) => s.service.id === serviceId);
  const chosenMenuItem = chosenService && officialLegacyCareItem(chosenService.service.id);
  const filtered = available.filter(
    (p) =>
      (!serviceId || supportsInquiryService(p, serviceId, services)) &&
      searchText(
        [
          p.publicName,
          p.title,
          p.serviceArea,
          chosenService?.service.name,
          ...offers(p).map((s) => s.name),
        ].join(" "),
      ).includes(searchText(query)),
  );
  const canSend =
    !!chosen &&
    !!chosenService &&
    !!requestedAt &&
    requestedAt >= dateLimits.min &&
    requestedAt <= dateLimits.max &&
    (location === "AT_BRANCH" || address.trim().length >= 12);
  async function sendInquiry(auth?: AuthResponse) {
    const actor = auth?.user ?? user;
    if (sending.current || !actor) return;
    if (!canUsePersonalBooking(actor)) {
      setError("Tài khoản này chưa thể gửi yêu cầu đặt lịch.");
      return;
    }
    const requestedTime = new Date(requestedAt + ":00+07:00").getTime();
    // eslint-disable-next-line react-hooks/purity -- Submit handler: recheck time after async signup.
    if (!canSend || !chosen || !chosenService || requestedTime <= Date.now()) {
      setError("Bạn kiểm tra lại dịch vụ, địa chỉ và thời gian mong muốn trước khi gửi nhé.");
      return;
    }
    sending.current = true;
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
      const request = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, idempotencyKey: identity.current.key }),
      };
      // Registration updates React context asynchronously. Use its returned token
      // for this first request so we never race a stale authFetch closure.
      if (auth)
        await parseApiResponse(
          await apiRequest("/appointment-inquiries", request, auth.accessToken),
        );
      else await authFetch("/appointment-inquiries", request);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa gửi được yêu cầu. Hãy thử lại.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || !canSend || status === "loading") return;
    setError("");
    if (!user) setAccountOpen(true);
    else await sendInquiry();
  }
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-booking-main mm-quick-booking-main">
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
        <BookingReassurance />
        {submitted ? (
          <section ref={successRef} tabIndex={-1} className="mm-booking-success" role="status">
            <CheckCircle2 size={40} />
            <h2>Đã gửi yêu cầu đến {chosen?.publicName}</h2>
            <p>
              KTV sẽ trao đổi để xác nhận khả năng phục vụ, thời gian và giá. Bạn có thể xem yêu cầu
              trong tài khoản.
            </p>
            <Link className="mm-primary-cta" href="/lich-hen">
              Theo dõi yêu cầu <ArrowRight size={17} />
            </Link>
            <Link
              className="mm-outline-cta"
              href={chatHref(chosen?.chatProviderId || chosen?.id || "")}
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
                      if (chosen && !supportsInquiryService(chosen, id, services))
                        setProviderId("");
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
                    {chosenMenuItem ? (
                      formatPrice(chosenMenuItem.priceVnd)
                    ) : (
                      <>
                        {chosenService.variants.map((v) => v.durationMinutes + " phút").join(" · ")}{" "}
                        · Từ{" "}
                        {formatPrice(
                          Math.min(...chosenService.variants.map((v) => Number(v.priceVnd))),
                        )}
                      </>
                    )}
                  </p>
                )}
              </section>
              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>02</span>
                  <div>
                    <h2>
                      {!showProviderPicker && chosen ? "KTV bạn đã chọn" : "Chọn kỹ thuật viên"}
                    </h2>
                    <p>
                      {!showProviderPicker && chosen
                        ? "KTV này sẽ nhận yêu cầu đặt lịch của bạn."
                        : "Tìm theo tên, dịch vụ hoặc khu vực."}
                    </p>
                  </div>
                </div>
                <BookingProviderPicker
                  providers={showProviderPicker ? filtered : chosen ? [chosen] : []}
                  total={available.length}
                  selectedId={providerId}
                  query={query}
                  onQuery={setQuery}
                  showSearch={showProviderPicker}
                  onSelect={(provider) => {
                    setProviderId(provider.id);
                    if (!serviceId || !supportsInquiryService(provider, serviceId, services))
                      setServiceId(defaultService(provider, services));
                    if (initialProvider) setShowProviderPicker(false);
                  }}
                />
                {!showProviderPicker && chosen && (
                  <button
                    type="button"
                    className="mm-outline-cta mm-request-change"
                    onClick={() => setShowProviderPicker(true)}
                  >
                    Đổi KTV
                  </button>
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
              <div className="mm-booking-action">
                <span className="mm-booking-action-context">
                  {chosen?.publicName || "Lựa chọn của bạn"} ·{" "}
                  {chosenService?.service.name || "Chọn dịch vụ"}
                </span>
                <button
                  type="submit"
                  className="mm-primary-cta mm-full-cta"
                  disabled={
                    status === "loading" ||
                    busy ||
                    !canSend ||
                    (!!user && !canUsePersonalBooking(user))
                  }
                >
                  {status === "loading"
                    ? "Đang kiểm tra tài khoản…"
                    : busy
                      ? "Đang gửi yêu cầu…"
                      : !user
                        ? "Tiếp tục đặt lịch"
                        : "Gửi yêu cầu đặt lịch"}
                  <ArrowRight size={17} />
                </button>
              </div>
              {user && !canUsePersonalBooking(user) && (
                <p>
                  Tài khoản này chưa thể gửi yêu cầu đặt lịch. Vui lòng liên hệ Mộc để được hỗ trợ.
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
      {accountOpen && !submitted && chosen && chosenService && (
        <BookingAccountDialog
          providerName={chosen.publicName}
          serviceName={chosenService.service.name}
          when={new Intl.DateTimeFormat("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date(requestedAt + ":00+07:00"))}
          onDismiss={() => setAccountOpen(false)}
          onAuthenticated={async (auth) => {
            await sendInquiry(auth);
            setAccountOpen(false);
          }}
        />
      )}
      <MobileNavigation active="booking" />
    </div>
  );
}
