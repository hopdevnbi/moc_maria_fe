"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatPrice } from "@/features/marketplace/format";
import type { Branch, Provider, ServiceDetail, ServiceItem } from "@/features/marketplace/types";
import { MobileHeader, MobileNavigation } from "./experience";
import "./mobile.css";

type Slot = {
  startsAt: string;
  endsAt: string;
  providerApplicationId: string;
  providerName: string;
  totalVnd: string;
  priceVnd: string;
  travelFeeVnd: string;
};
type Availability = {
  timezone: string;
  date: string;
  reservation: false;
  requestEnabled: boolean;
  blockers: string[];
  slots: Slot[];
};
type BookingProps = {
  providers: Provider[];
  services: ServiceItem[];
  branches: Branch[];
  initial: { provider?: string; service?: string; variant?: string };
  unavailable?: boolean;
};

function vietnamToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (key: string) => parts.find((part) => part.type === key)?.value || "";
  return get("year") + "-" + get("month") + "-" + get("day");
}
function displayTime(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function BookingWizard({
  providers,
  services,
  branches,
  initial,
  unavailable,
}: BookingProps) {
  const { user, status, authFetch } = useAuth();
  const [providerId, setProviderId] = useState(initial.provider || "");
  const [serviceId, setServiceId] = useState(initial.service || "");
  const [variantId, setVariantId] = useState(initial.variant || "");
  const [branchId, setBranchId] = useState("");
  const [day, setDay] = useState(() => vietnamToday());
  const [detail, setDetail] = useState<ServiceDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const requestIdentity = useRef<{ signature: string; key: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const chosenProvider = providers.find((provider) => provider.id === providerId);
  const chosenService = services.find((item) => item.service.id === serviceId);
  const compatibleServices = chosenProvider
    ? services.filter((item) =>
        chosenProvider.eligibleServices?.some(
          (policy) => policy.serviceId === item.service.id && policy.mode === "ON_SITE",
        ),
      )
    : services;
  const compatibleProviders = serviceId
    ? providers.filter((provider) =>
        provider.eligibleServices?.some(
          (policy) => policy.serviceId === serviceId && policy.mode === "ON_SITE",
        ),
      )
    : providers;
  const variants =
    detail?.service.id === serviceId
      ? detail.variants.filter((variant) => variant.isActive)
      : chosenService?.variants.filter((variant) => variant.isActive) || [];
  const allowedBranchIds = (() => {
    const serviceBranchIds = new Set(detail?.branches.map(({ branch }) => branch.id) || []);
    if (chosenProvider)
      return new Set(
        chosenProvider.eligibleServices
          ?.filter(
            (policy) =>
              policy.serviceId === serviceId &&
              policy.mode === "ON_SITE" &&
              serviceBranchIds.has(policy.branchId),
          )
          .map((policy) => policy.branchId) || [],
      );
    return serviceBranchIds;
  })();
  const availableBranches = branches.filter(
    (branch) => branch.isActive && allowedBranchIds.has(branch.id),
  );
  const slots =
    availability?.slots.filter(
      (slot) => !providerId || slot.providerApplicationId === providerId,
    ) || [];

  useEffect(() => {
    if (!chosenService) return;
    const controller = new AbortController();
    fetch("/api/mobile/service/" + encodeURIComponent(chosenService.service.slug), {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Chưa tải được cơ sở phục vụ.");
        setDetail((await response.json()) as ServiceDetail);
        setDetailError("");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setDetail(null);
          setDetailError(error instanceof Error ? error.message : "Không tải được cơ sở.");
        }
      });
    return () => controller.abort();
  }, [chosenService]);

  useEffect(() => {
    if (!variantId || !branchId || !day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ variantId, branchId, date: day });
    if (providerId) query.set("providerApplicationId", providerId);
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoadingSlots(true);
      setAvailability(null);
      setSelectedSlot(null);
      setAvailabilityError("");
    });
    fetch("/api/mobile/availability?" + query, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? "Cơ sở chưa mở đặt lịch cho gói này."
              : "Chưa kiểm tra được lịch trống.",
          );
        setAvailability((await response.json()) as Availability);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setAvailabilityError(error instanceof Error ? error.message : "Không tải được lịch.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
    return () => controller.abort();
  }, [branchId, variantId, day, providerId]);

  const changeProvider = (id: string) => {
    setProviderId(id);
    if (
      id &&
      serviceId &&
      !providers
        .find((provider) => provider.id === id)
        ?.eligibleServices?.some((policy) => policy.serviceId === serviceId)
    ) {
      setServiceId("");
      setVariantId("");
      setDetail(null);
      setBranchId("");
    }
    setSelectedSlot(null);
  };
  const changeService = (id: string) => {
    setServiceId(id);
    setVariantId("");
    setDetail(null);
    setBranchId("");
    setSelectedSlot(null);
  };
  const changeVariant = (id: string) => {
    setVariantId(id);
    setSelectedSlot(null);
  };

  const requestBooking = async () => {
    if (!selectedSlot || !variantId || !branchId || !user || !availability?.requestEnabled) return;
    setSending(true);
    setSendError("");
    try {
      const signature = [
        variantId,
        branchId,
        selectedSlot.startsAt,
        selectedSlot.providerApplicationId,
        selectedSlot.totalVnd,
        notes.trim(),
      ].join("|");
      if (requestIdentity.current?.signature !== signature) {
        requestIdentity.current = { signature, key: crypto.randomUUID().replace(/-/g, "") };
      }
      await authFetch("/bookings/requests", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          branchId,
          startsAt: selectedSlot.startsAt,
          providerApplicationId: selectedSlot.providerApplicationId,
          idempotencyKey: requestIdentity.current.key,
          expectedTotalVnd: selectedSlot.totalVnd,
          quoteAcknowledged: true,
          notes: notes.trim().slice(0, 500),
        }),
      });
      setSubmitted(true);
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Chưa gửi được yêu cầu. Vui lòng thử lại.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mobile-experience mm-booking-page">
      <MobileHeader />
      <main className="mm-container mm-booking-main">
        <Link href="/" className="mm-back">
          <ArrowLeft size={16} /> Về trang chủ
        </Link>
        <div className="mm-booking-heading">
          <span className="mm-overline">LỊCH HẸN CỦA BẠN</span>
          <h1>
            Đặt lịch <em>thật dễ dàng.</em>
          </h1>
          <p>
            Chọn dịch vụ và KTV theo thứ tự bạn thích. Giờ còn trống được kiểm tra trực tiếp với Mộc
            Maria.
          </p>
        </div>
        {submitted ? (
          <div className="mm-booking-success" role="status">
            <CheckCircle2 size={42} />
            <h2>Đã gửi yêu cầu đặt lịch</h2>
            <p>
              Đây là yêu cầu chờ KTV phản hồi, chưa phải lịch được xác nhận. Bạn có thể theo dõi
              trong mục Lịch hẹn của tôi.
            </p>
            <Link className="mm-primary-cta" href="/lich-hen">
              Xem lịch hẹn <ArrowRight size={17} />
            </Link>
          </div>
        ) : unavailable ? (
          <div className="mm-empty" role="alert">
            Dữ liệu dịch vụ đang gián đoạn. Vui lòng thử tải lại trang.
          </div>
        ) : (
          <div className="mm-booking-grid">
            <div className="mm-booking-steps">
              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>01</span>
                  <div>
                    <h2>Chọn kỹ thuật viên</h2>
                    <p>Bạn cũng có thể chọn dịch vụ trước.</p>
                  </div>
                </div>
                <div className="mm-booking-options mm-compact-options">
                  <button
                    type="button"
                    className={!providerId ? "selected" : ""}
                    onClick={() => changeProvider("")}
                  >
                    <Users size={18} /> Bất kỳ KTV phù hợp
                  </button>
                  {providers.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      className={providerId === provider.id ? "selected" : ""}
                      disabled={
                        !!serviceId &&
                        !compatibleProviders.some((candidate) => candidate.id === provider.id)
                      }
                      onClick={() => changeProvider(provider.id)}
                    >
                      <UserRound size={18} />
                      <span>
                        <strong>{provider.publicName}</strong>
                        <small>
                          {provider.yearsExperience != null
                            ? provider.yearsExperience + " năm kinh nghiệm"
                            : provider.title || "Chuyên viên"}
                        </small>
                      </span>
                      {providerId === provider.id && <CheckCircle2 size={16} />}
                    </button>
                  ))}
                </div>
                {!providers.length && (
                  <p className="mm-hint">
                    Chưa có hồ sơ KTV được công bố. Lịch sẽ chỉ mở khi có KTV đủ điều kiện.
                  </p>
                )}
              </section>
              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>02</span>
                  <div>
                    <h2>Chọn dịch vụ và thời lượng</h2>
                    <p>Chỉ hiển thị dịch vụ KTV đã được phép cung cấp.</p>
                  </div>
                </div>
                {chosenProvider && !compatibleServices.length && (
                  <p className="mm-hint">KTV này chưa có dịch vụ đủ điều kiện đặt lịch.</p>
                )}
                <div className="mm-booking-options">
                  {compatibleServices.map((item) => (
                    <button
                      key={item.service.id}
                      type="button"
                      className={serviceId === item.service.id ? "selected" : ""}
                      onClick={() => changeService(item.service.id)}
                    >
                      <Sparkles size={18} />
                      <span>
                        <strong>{item.service.name}</strong>
                        <small>{item.service.description || "Khám phá gói chăm sóc"}</small>
                      </span>
                      {serviceId === item.service.id && <CheckCircle2 size={16} />}
                    </button>
                  ))}
                </div>
                {serviceId && (
                  <div className="mm-variant-list" aria-label="Thời lượng và giá">
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        className={variantId === variant.id ? "selected" : ""}
                        onClick={() => changeVariant(variant.id)}
                        type="button"
                      >
                        <span>
                          {variant.name} · {variant.durationMinutes} phút
                        </span>
                        <strong>{formatPrice(variant.priceVnd)}</strong>
                      </button>
                    ))}
                  </div>
                )}
              </section>
              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>03</span>
                  <div>
                    <h2>Chọn cơ sở và thời gian</h2>
                    <p>Lịch thực tế thay đổi theo từng ngày.</p>
                  </div>
                </div>
                {detailError && (
                  <p className="mm-hint" role="alert">
                    {detailError}
                  </p>
                )}
                <label className="mm-booking-field">
                  Cơ sở phục vụ
                  <select
                    value={branchId}
                    disabled={!variantId}
                    onChange={(event) => {
                      setBranchId(event.target.value);
                      setSelectedSlot(null);
                    }}
                  >
                    <option value="">Chọn cơ sở</option>
                    {availableBranches.map((branch) => (
                      <option value={branch.id} key={branch.id}>
                        {branch.name} — {branch.address}
                      </option>
                    ))}
                  </select>
                </label>
                {variantId && !availableBranches.length && !detailError && (
                  <p className="mm-hint">Chưa có cơ sở phù hợp hoặc gói chưa được mở phục vụ.</p>
                )}
                <label className="mm-booking-field">
                  Ngày mong muốn
                  <input
                    type="date"
                    min={vietnamToday()}
                    value={day}
                    onChange={(event) => {
                      setDay(event.target.value);
                      setSelectedSlot(null);
                    }}
                  />
                </label>
                {branchId && variantId && (
                  <div className="mm-slot-area">
                    <h3>
                      <Clock3 size={17} /> Giờ còn trống
                    </h3>
                    {loadingSlots ? (
                      <p role="status">Đang kiểm tra lịch thực tế...</p>
                    ) : availabilityError ? (
                      <p role="alert" className="mm-hint">
                        {availabilityError}
                      </p>
                    ) : slots.length ? (
                      <div className="mm-slot-grid">
                        {slots.map((slot) => (
                          <button
                            type="button"
                            key={slot.providerApplicationId + slot.startsAt}
                            className={
                              selectedSlot?.startsAt === slot.startsAt &&
                              selectedSlot.providerApplicationId === slot.providerApplicationId
                                ? "selected"
                                : ""
                            }
                            onClick={() => setSelectedSlot(slot)}
                          >
                            <strong>{displayTime(slot.startsAt)}</strong>
                            <small>{slot.providerName}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mm-hint">
                        Chưa có giờ trống phù hợp. Hãy thử ngày hoặc KTV khác.
                      </p>
                    )}
                    {availability && !availability.requestEnabled && (
                      <p className="mm-hint">Cơ sở chưa mở chức năng gửi yêu cầu đặt lịch.</p>
                    )}
                  </div>
                )}
              </section>
            </div>
            <aside className="mm-booking-summary">
              <span className="mm-overline">TÓM TẮT LỊCH HẸN</span>
              <h2>Khoảng thời gian của bạn</h2>
              <div className="mm-summary-lines">
                <p>
                  <Sparkles size={17} />{" "}
                  <span>{chosenService?.service.name || "Chưa chọn dịch vụ"}</span>
                </p>
                <p>
                  <UserRound size={17} />{" "}
                  <span>
                    {selectedSlot?.providerName || chosenProvider?.publicName || "KTV phù hợp"}
                  </span>
                </p>
                <p>
                  <MapPin size={17} />{" "}
                  <span>
                    {branches.find((branch) => branch.id === branchId)?.name || "Chưa chọn cơ sở"}
                  </span>
                </p>
                <p>
                  <CalendarDays size={17} />{" "}
                  <span>
                    {selectedSlot
                      ? displayTime(selectedSlot.startsAt) + " · " + day
                      : "Chưa chọn giờ"}
                  </span>
                </p>
              </div>
              <div className="mm-summary-price">
                <span>Giá dự kiến theo lịch</span>
                <strong>{selectedSlot ? formatPrice(selectedSlot.totalVnd) : "—"}</strong>
              </div>
              <p className="mm-hint">
                Giá cuối cùng được thể hiện trong báo giá. Yêu cầu chỉ được xác nhận theo quy trình
                của Mộc.
              </p>
              <label className="mm-booking-field">
                Ghi chú (không bắt buộc)
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Lưu ý cần trao đổi với KTV..."
                />
              </label>
              {status === "loading" ? (
                <p>Đang kiểm tra tài khoản...</p>
              ) : !user ? (
                <Link
                  href={
                    "/dang-nhap?returnTo=" +
                    encodeURIComponent("/dat-lich" + (providerId ? "?provider=" + providerId : ""))
                  }
                  className="mm-primary-cta mm-full-cta"
                >
                  Đăng nhập để gửi yêu cầu <ArrowRight size={17} />
                </Link>
              ) : (
                <button
                  type="button"
                  className="mm-primary-cta mm-full-cta"
                  disabled={
                    !user.permissions.includes("customer.portal") ||
                    !selectedSlot ||
                    !availability?.requestEnabled ||
                    sending
                  }
                  onClick={() => void requestBooking()}
                >
                  {sending ? "Đang gửi yêu cầu..." : "Gửi yêu cầu đặt lịch"}{" "}
                  <ArrowRight size={17} />
                </button>
              )}
              {sendError && (
                <p role="alert" className="mm-booking-error">
                  {sendError}
                </p>
              )}
              <p className="mm-privacy">
                <ShieldCheck size={15} /> Thời gian và giá được kiểm tra lại trên máy chủ trước khi
                tiếp nhận.
              </p>
            </aside>
          </div>
        )}
      </main>
      <MobileNavigation active="booking" />
    </div>
  );
}
