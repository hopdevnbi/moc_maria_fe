"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  House,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatPrice } from "@/features/marketplace/format";
import type { Branch, Provider, ServiceDetail, ServiceItem } from "@/features/marketplace/types";
import {
  homeTerritories,
  isEligibleForMode,
  isPrimaryBranch,
  MOC_MARIA_MAP_URL,
  MOC_MARIA_PRIMARY_ADDRESS,
  type BookingLocationMode,
} from "./booking-location";
import { MobileHeader, MobileNavigation } from "./experience";
import { BookingReassurance } from "./booking-reassurance";
import "./mobile.css";
import "./booking-location.css";

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
  const [locationMode, setLocationMode] = useState<BookingLocationMode>("AT_BRANCH");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeTerritory, setHomeTerritory] = useState("");
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
  const [submitted, setSubmitted] = useState(false);
  const requestIdentity = useRef<{ signature: string; key: string } | null>(null);

  const territories = homeTerritories(providers);
  const homeReady = !!homeTerritory && homeAddress.trim().length >= 12;
  const eligibleProviders = providers.filter((provider) =>
    isEligibleForMode(provider, locationMode, homeTerritory),
  );
  const chosenProvider = eligibleProviders.find((provider) => provider.id === providerId);
  const chosenService = services.find((item) => item.service.id === serviceId);
  const compatibleProviders = eligibleProviders.filter(
    (provider) => !serviceId || isEligibleForMode(provider, locationMode, homeTerritory, serviceId),
  );
  const compatibleServices =
    locationMode === "AT_HOME" && !homeReady
      ? []
      : chosenProvider
        ? services.filter((item) =>
            isEligibleForMode(chosenProvider, locationMode, homeTerritory, item.service.id),
          )
        : locationMode === "AT_HOME"
          ? services.filter((item) =>
              eligibleProviders.some((provider) =>
                isEligibleForMode(provider, locationMode, homeTerritory, item.service.id),
              ),
            )
          : services;
  const variants =
    detail?.service.id === serviceId
      ? detail.variants.filter((variant) => variant.isActive)
      : chosenService?.variants.filter((variant) => variant.isActive) || [];

  const serviceBranchIds = new Set(detail?.branches.map((entry) => entry.branch.id) || []);
  const allowedBranchIds = chosenProvider
    ? new Set(
        chosenProvider.eligibleServices
          ?.filter(
            (policy) =>
              policy.serviceId === serviceId &&
              policy.mode === "ON_SITE" &&
              serviceBranchIds.has(policy.branchId),
          )
          .map((policy) => policy.branchId) || [],
      )
    : serviceBranchIds;
  const availableBranches = branches.filter(
    (branch) => branch.isActive && allowedBranchIds.has(branch.id),
  );
  const effectiveBranchId =
    locationMode === "AT_BRANCH"
      ? availableBranches.find((branch) => branch.id === branchId)?.id ||
        availableBranches.find(isPrimaryBranch)?.id ||
        ""
      : "";
  const activeBranch = branches.find((branch) => branch.id === effectiveBranchId);
  const slots =
    availability?.slots.filter(
      (slot) => !providerId || slot.providerApplicationId === providerId,
    ) || [];

  useEffect(() => {
    if (!chosenService || locationMode !== "AT_BRANCH") return;
    const controller = new AbortController();
    fetch("/api/mobile/service/" + encodeURIComponent(chosenService.service.slug), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Chưa tải được thông tin cơ sở phục vụ.");
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
  }, [chosenService, locationMode]);

  useEffect(() => {
    if (
      locationMode !== "AT_BRANCH" ||
      !variantId ||
      !effectiveBranchId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day)
    )
      return;
    const controller = new AbortController();
    const query = new URLSearchParams({ variantId, branchId: effectiveBranchId, date: day });
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
        if (!response.ok) throw new Error("Chưa kiểm tra được lịch trống.");
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
  }, [locationMode, effectiveBranchId, variantId, day, providerId]);

  const clearChoice = () => {
    setProviderId("");
    setServiceId("");
    setVariantId("");
    setBranchId("");
    setDetail(null);
    setAvailability(null);
    setSelectedSlot(null);
    setSendError("");
  };
  const changeLocationMode = (mode: BookingLocationMode) => {
    if (mode !== locationMode) {
      clearChoice();
      setLocationMode(mode);
    }
  };
  const changeHomeTerritory = (code: string) => {
    setHomeTerritory(code);
    clearChoice();
  };
  const changeProvider = (id: string) => {
    setProviderId(id);
    const provider = providers.find((item) => item.id === id);
    if (
      id &&
      serviceId &&
      (!provider || !isEligibleForMode(provider, locationMode, homeTerritory, serviceId))
    ) {
      setServiceId("");
      setVariantId("");
      setBranchId("");
      setDetail(null);
    }
    setSelectedSlot(null);
    setAvailability(null);
  };
  const changeService = (id: string) => {
    setServiceId(id);
    setVariantId("");
    setBranchId("");
    setDetail(null);
    setSelectedSlot(null);
    setAvailability(null);
    const provider = providers.find((item) => item.id === providerId);
    if (id && provider && !isEligibleForMode(provider, locationMode, homeTerritory, id)) {
      setProviderId("");
    }
  };
  const requestBooking = async () => {
    if (
      locationMode !== "AT_BRANCH" ||
      !selectedSlot ||
      !variantId ||
      !effectiveBranchId ||
      !user ||
      !availability?.requestEnabled
    )
      return;
    setSending(true);
    setSendError("");
    try {
      const signature = [
        variantId,
        effectiveBranchId,
        selectedSlot.startsAt,
        selectedSlot.providerApplicationId,
        selectedSlot.totalVnd,
        notes.trim(),
      ].join("|");
      if (requestIdentity.current?.signature !== signature)
        requestIdentity.current = { signature, key: crypto.randomUUID().replace(/-/g, "") };
      await authFetch("/bookings/requests", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          branchId: effectiveBranchId,
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
  const displayAddress =
    locationMode === "AT_BRANCH"
      ? activeBranch?.address || MOC_MARIA_PRIMARY_ADDRESS
      : homeAddress.trim() || "Chưa nhập địa chỉ";

  return (
    <div className="mobile-experience mm-booking-page">
      <MobileHeader />
      <main className="mm-container mm-booking-main">
        <Link href="/" className="mm-back">
          <ArrowLeft size={16} /> Về trang chủ
        </Link>
        <div className="mm-booking-heading">
          <span className="mm-overline">MỘC MARIA · ĐẶT LỊCH CHĂM SÓC</span>
          <h1>
            Khoảnh khắc an yên <em>bắt đầu từ đây.</em>
          </h1>
          <p>
            Ưu tiên trải nghiệm tại Mộc Maria. Chọn nơi phục vụ trước, sau đó tìm dịch vụ và kỹ
            thuật viên phù hợp.
          </p>
        </div>
        <BookingReassurance />
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
              <section
                className="mm-booking-section mm-booking-place"
                aria-label="Chọn địa điểm trải nghiệm"
              >
                <div className="mm-booking-step">
                  <span>01</span>
                  <div>
                    <h2>Bạn muốn trải nghiệm ở đâu?</h2>
                    <p>Chọn địa điểm để xem đúng dịch vụ và KTV.</p>
                  </div>
                </div>
                <div className="mm-place-grid" role="group" aria-label="Hình thức phục vụ">
                  <button
                    type="button"
                    className={
                      "mm-place-option" + (locationMode === "AT_BRANCH" ? " selected" : "")
                    }
                    aria-pressed={locationMode === "AT_BRANCH"}
                    onClick={() => changeLocationMode("AT_BRANCH")}
                  >
                    <span className="mm-place-symbol">
                      <Building2 size={23} />
                    </span>
                    <span className="mm-place-body">
                      <span className="mm-place-tag">ĐỀ XUẤT · ĐƯỢC ƯU TIÊN</span>
                      <strong>Đến Mộc Maria</strong>
                      <small>Không gian thư giãn, tiện nghi và chăm sóc trọn vẹn.</small>
                    </span>
                    <CheckCircle2 size={19} className="mm-place-check" />
                  </button>
                  <button
                    type="button"
                    className={"mm-place-option" + (locationMode === "AT_HOME" ? " selected" : "")}
                    aria-pressed={locationMode === "AT_HOME"}
                    onClick={() => changeLocationMode("AT_HOME")}
                  >
                    <span className="mm-place-symbol">
                      <House size={23} />
                    </span>
                    <span className="mm-place-body">
                      <span className="mm-place-tag mm-place-muted-tag">PHỤC VỤ THEO KHU VỰC</span>
                      <strong>Tại địa chỉ của bạn</strong>
                      <small>Nhập địa chỉ để tìm KTV có thể phục vụ tại nhà.</small>
                    </span>
                    <CheckCircle2 size={19} className="mm-place-check" />
                  </button>
                </div>
                {locationMode === "AT_BRANCH" ? (
                  <div className="mm-primary-location">
                    <span className="mm-primary-location-icon">
                      <MapPin size={21} />
                    </span>
                    <div>
                      <strong>Cơ sở chính · Tân Tây Đô</strong>
                      <p>{MOC_MARIA_PRIMARY_ADDRESS}</p>
                      <a href={MOC_MARIA_MAP_URL} target="_blank" rel="noopener noreferrer">
                        Xem đường đi <ArrowRight size={14} />
                      </a>
                    </div>
                    <BadgeCheck size={20} className="mm-primary-location-check" />
                  </div>
                ) : (
                  <div className="mm-home-address">
                    <label className="mm-booking-field" htmlFor="mm-home-region">
                      Khu vực phục vụ *
                      <select
                        id="mm-home-region"
                        value={homeTerritory}
                        onChange={(e) => changeHomeTerritory(e.target.value)}
                      >
                        <option value="">Chọn khu vực / quận huyện</option>
                        {territories.map((area) => (
                          <option key={area.code} value={area.code}>
                            {area.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mm-booking-field" htmlFor="mm-home-address">
                      Địa chỉ nhận dịch vụ *
                      <input
                        id="mm-home-address"
                        type="text"
                        autoComplete="street-address"
                        value={homeAddress}
                        maxLength={300}
                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                        onChange={(event) => setHomeAddress(event.target.value)}
                      />
                    </label>
                    <p className="mm-place-instruction">
                      {territories.length
                        ? "Vui lòng nhập địa chỉ đầy đủ. Chỉ những KTV được duyệt phục vụ khu vực này mới được hiển thị."
                        : "Chưa có KTV được xác minh để nhận lịch tại nhà. Bạn vẫn có thể đến cơ sở Mộc Maria."}
                    </p>
                  </div>
                )}
              </section>

              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>02</span>
                  <div>
                    <h2>Chọn kỹ thuật viên</h2>
                    <p>
                      {locationMode === "AT_HOME"
                        ? "Chỉ hiển thị KTV được duyệt trong khu vực bạn chọn."
                        : "Bạn cũng có thể chọn dịch vụ trước."}
                    </p>
                  </div>
                </div>
                <div className="mm-booking-options mm-compact-options">
                  <button
                    type="button"
                    className={!providerId ? "selected" : ""}
                    disabled={locationMode === "AT_HOME" && !homeReady}
                    onClick={() => changeProvider("")}
                  >
                    <Users size={18} /> Bất kỳ KTV phù hợp
                  </button>
                  {compatibleProviders.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      className={providerId === provider.id ? "selected" : ""}
                      disabled={locationMode === "AT_HOME" && !homeReady}
                      onClick={() => changeProvider(provider.id)}
                    >
                      <UserRound size={18} />
                      <span>
                        <strong>{provider.publicName}</strong>
                        <small>
                          {provider.yearsExperience != null
                            ? provider.yearsExperience + " năm kinh nghiệm"
                            : provider.title || "Kỹ thuật viên"}
                        </small>
                      </span>
                      {providerId === provider.id && <CheckCircle2 size={16} />}
                    </button>
                  ))}
                </div>
                {!compatibleProviders.length && (
                  <p className="mm-hint">
                    {locationMode === "AT_HOME"
                      ? homeReady
                        ? "Chưa có KTV phù hợp trong khu vực này."
                        : "Chọn khu vực và nhập địa chỉ tại bước 01 để xem KTV phù hợp."
                      : "Chưa có KTV được công bố hoặc đủ điều kiện nhận lịch."}
                  </p>
                )}
              </section>

              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>03</span>
                  <div>
                    <h2>Dịch vụ & thời lượng</h2>
                    <p>
                      {locationMode === "AT_HOME"
                        ? "Chỉ hiển thị dịch vụ KTV có thể phục vụ tại địa chỉ của bạn."
                        : "Chọn liệu trình và thời lượng bạn yêu thích."}
                    </p>
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
                        type="button"
                        className={variantId === variant.id ? "selected" : ""}
                        onClick={() => {
                          setVariantId(variant.id);
                          setSelectedSlot(null);
                          setAvailability(null);
                        }}
                      >
                        <span>
                          {variant.name} · {variant.durationMinutes} phút
                        </span>
                        <strong>{formatPrice(variant.priceVnd)}</strong>
                      </button>
                    ))}
                  </div>
                )}
                {locationMode === "AT_HOME" && !homeReady && (
                  <p className="mm-hint">Hoàn tất địa chỉ để xem danh sách dịch vụ phù hợp.</p>
                )}
              </section>

              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>04</span>
                  <div>
                    <h2>{locationMode === "AT_BRANCH" ? "Cơ sở & thời gian" : "Ngày mong muốn"}</h2>
                    <p>Giờ phục vụ được kiểm tra theo lịch KTV thực tế.</p>
                  </div>
                </div>
                {locationMode === "AT_BRANCH" && (
                  <>
                    {detailError && (
                      <p className="mm-hint" role="alert">
                        {detailError}
                      </p>
                    )}
                    <label className="mm-booking-field">
                      Cơ sở phục vụ
                      <select
                        value={effectiveBranchId}
                        disabled={!variantId}
                        onChange={(e) => {
                          setBranchId(e.target.value);
                          setSelectedSlot(null);
                          setAvailability(null);
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
                      <p className="mm-hint">Cơ sở chính chưa mở đặt lịch cho dịch vụ này.</p>
                    )}
                  </>
                )}
                {locationMode === "AT_HOME" && (
                  <div className="mm-home-pending">
                    <House size={21} />
                    <p>
                      <strong>Phục vụ tại nhà cần xác nhận riêng.</strong>
                      Hệ thống chưa mở đặt lịch tại nhà trực tuyến. Sau khi chọn dịch vụ và KTV, bạn
                      có thể nhắn tin để trao đổi lịch và chi phí di chuyển.
                    </p>
                  </div>
                )}
                <label className="mm-booking-field">
                  Ngày mong muốn
                  <input
                    type="date"
                    min={vietnamToday()}
                    value={day}
                    onChange={(e) => {
                      setDay(e.target.value);
                      setSelectedSlot(null);
                    }}
                  />
                </label>
                {locationMode === "AT_BRANCH" && effectiveBranchId && variantId && (
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
                      <p className="mm-hint">
                        Cơ sở chưa mở chức năng gửi yêu cầu đặt lịch trực tuyến.
                      </p>
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
                  <MapPin size={17} />
                  <span>
                    <strong>
                      {locationMode === "AT_BRANCH" ? "Tại Mộc Maria" : "Tại địa chỉ riêng"}
                    </strong>{" "}
                    · {displayAddress}
                  </span>
                </p>
                <p>
                  <Sparkles size={17} />
                  <span>{chosenService?.service.name || "Chưa chọn dịch vụ"}</span>
                </p>
                <p>
                  <UserRound size={17} />
                  <span>
                    {selectedSlot?.providerName || chosenProvider?.publicName || "KTV phù hợp"}
                  </span>
                </p>
                <p>
                  <CalendarDays size={17} />
                  <span>
                    {selectedSlot
                      ? displayTime(selectedSlot.startsAt) + " · " + day
                      : "Ngày " + day + " · Chưa chọn giờ"}
                  </span>
                </p>
              </div>
              <div className="mm-summary-price">
                <span>
                  {locationMode === "AT_HOME" ? "Giá & phí di chuyển" : "Giá dự kiến theo lịch"}
                </span>
                <strong>
                  {locationMode === "AT_HOME"
                    ? "KTV xác nhận"
                    : selectedSlot
                      ? formatPrice(selectedSlot.totalVnd)
                      : "—"}
                </strong>
              </div>
              <p className="mm-hint">
                {locationMode === "AT_HOME"
                  ? "Tin nhắn tư vấn chưa phải xác nhận lịch hoặc báo giá. Không thanh toán trước qua chat."
                  : "Giá cuối cùng được thể hiện trong báo giá. Yêu cầu chỉ xác nhận theo quy trình của Mộc."}
              </p>
              {locationMode === "AT_BRANCH" && (
                <label className="mm-booking-field">
                  Ghi chú (không bắt buộc)
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Lưu ý cần trao đổi với KTV..."
                  />
                </label>
              )}
              {locationMode === "AT_HOME" ? (
                chosenProvider && chosenService && homeReady ? (
                  <Link
                    className="mm-primary-cta mm-full-cta"
                    href={"/tin-nhan?provider=" + encodeURIComponent(chosenProvider.id)}
                  >
                    Trao đổi với KTV <ArrowRight size={17} />
                  </Link>
                ) : (
                  <p className="mm-hint mm-home-cta-hint">
                    Chọn địa chỉ, dịch vụ và một KTV để trao đổi thời gian phục vụ tại nhà.
                  </p>
                )
              ) : status === "loading" ? (
                <p>Đang kiểm tra tài khoản...</p>
              ) : !user ? (
                <Link
                  className="mm-primary-cta mm-full-cta"
                  href={
                    "/dang-nhap?returnTo=" +
                    encodeURIComponent("/dat-lich" + (providerId ? "?provider=" + providerId : ""))
                  }
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
                <ShieldCheck size={15} />
                {locationMode === "AT_BRANCH"
                  ? "Thời gian và giá được kiểm tra trên máy chủ trước khi tiếp nhận."
                  : "Địa chỉ riêng chỉ được nhập trên trình duyệt ở bước này; chưa được gửi đi khi chưa đặt lịch."}
              </p>
            </aside>
          </div>
        )}
      </main>
      <MobileNavigation active="booking" />
    </div>
  );
}
